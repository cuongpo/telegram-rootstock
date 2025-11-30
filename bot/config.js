const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,

  // Blockchain
  rpcUrl: process.env.RPC_URL || 'https://public-node.testnet.rsk.co',
  chainId: parseInt(process.env.CHAIN_ID || '31'),
  
  // Contracts
  lendingPoolAddress: process.env.LENDING_POOL_ADDRESS,
  usdt0Address: process.env.USDT0_ADDRESS,
  
  // Admin
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY,
  
  // Gas configuration
  gasPrice: process.env.GAS_PRICE || '60000000',
  gasLimit: process.env.GAS_LIMIT || '500000',
  
  // Network names
  networkName: process.env.CHAIN_ID === '30' ? 'RSK Mainnet' : 'RSK Testnet',
};

// Validate required config
function validateConfig() {
  const required = ['telegramBotToken', 'lendingPoolAddress', 'usdt0Address'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}\nPlease check your .env file.`);
  }
  
  return true;
}

module.exports = { config, validateConfig };

