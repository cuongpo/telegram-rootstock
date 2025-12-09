const crypto = require('crypto');
const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');

/**
 * Secure wallet management with encryption
 * Based on RSK CLI wallet management approach
 * https://github.com/rsksmart/rsk-cli/blob/main/src/commands/wallet.ts
 */

const WALLET_DIR = path.join(__dirname, '../.wallets');
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Initialize wallet directory
 */
async function initWalletDir() {
  try {
    await fs.mkdir(WALLET_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating wallet directory:', error);
  }
}

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt private key with password
 */
function encryptPrivateKey(privateKey, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted data
  return Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ]).toString('base64');
}

/**
 * Decrypt private key with password
 */
function decryptPrivateKey(encryptedData, password) {
  const buffer = Buffer.from(encryptedData, 'base64');
  
  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(password, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Save encrypted wallet for a user
 */
async function saveWallet(chatId, privateKey, password) {
  await initWalletDir();
  
  const encryptedKey = encryptPrivateKey(privateKey, password);
  const walletPath = path.join(WALLET_DIR, `${chatId}.wallet`);
  
  const walletData = {
    version: '1.0',
    chatId,
    encryptedKey,
    createdAt: new Date().toISOString()
  };
  
  await fs.writeFile(walletPath, JSON.stringify(walletData, null, 2));
}

/**
 * Load and decrypt wallet for a user
 */
async function loadWallet(chatId, password) {
  const walletPath = path.join(WALLET_DIR, `${chatId}.wallet`);
  
  try {
    const data = await fs.readFile(walletPath, 'utf8');
    const walletData = JSON.parse(data);
    
    const privateKey = decryptPrivateKey(walletData.encryptedKey, password);
    
    // Validate the private key
    try {
      const wallet = new ethers.Wallet(privateKey);
      return {
        privateKey,
        address: wallet.address
      };
    } catch (error) {
      throw new Error('Invalid private key or password');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Wallet not found. Please create a wallet first.');
    }
    throw error;
  }
}

/**
 * Check if wallet exists for a user
 */
async function walletExists(chatId) {
  const walletPath = path.join(WALLET_DIR, `${chatId}.wallet`);
  try {
    await fs.access(walletPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete wallet for a user
 */
async function deleteWallet(chatId) {
  const walletPath = path.join(WALLET_DIR, `${chatId}.wallet`);
  try {
    await fs.unlink(walletPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  saveWallet,
  loadWallet,
  walletExists,
  deleteWallet,
  encryptPrivateKey,
  decryptPrivateKey
};

