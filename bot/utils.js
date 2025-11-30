const { ethers } = require('ethers');

// Utility functions for formatting and validation

/**
 * Format RBTC amount (wei to ether)
 */
function formatRBTC(weiAmount) {
  return ethers.formatEther(weiAmount);
}

/**
 * Format USDT0 amount (6 decimals)
 */
function formatUSDT0(amount) {
  return ethers.formatUnits(amount, 6);
}

/**
 * Format USD value (18 decimals)
 */
function formatUSD(amount) {
  return ethers.formatUnits(amount, 18);
}

/**
 * Format health factor with color emoji
 */
function formatHealthFactor(hf) {
  const hfNum = parseFloat(ethers.formatUnits(hf, 18));
  let emoji = '🟢'; // Green for healthy
  
  if (hfNum === Infinity || hfNum > 1000000) {
    return '∞ 🟢 (No Debt - Perfectly Healthy)';
  }
  
  if (hfNum < 1.0) {
    emoji = '🔴'; // Red for liquidatable
  } else if (hfNum < 1.2) {
    emoji = '🟠'; // Orange for risky
  } else if (hfNum < 1.5) {
    emoji = '🟡'; // Yellow for caution
  }
  
  return `${hfNum.toFixed(4)} ${emoji}`;
}

/**
 * Parse RBTC amount from user input
 */
function parseRBTC(amount) {
  try {
    return ethers.parseEther(amount.toString());
  } catch (error) {
    throw new Error('Invalid RBTC amount. Please use a valid number.');
  }
}

/**
 * Parse USDT0 amount from user input
 */
function parseUSDT0(amount) {
  try {
    return ethers.parseUnits(amount.toString(), 6);
  } catch (error) {
    throw new Error('Invalid USDT0 amount. Please use a valid number.');
  }
}

/**
 * Validate Ethereum address
 */
function isValidAddress(address) {
  return ethers.isAddress(address);
}

/**
 * Validate private key
 */
function isValidPrivateKey(key) {
  try {
    new ethers.Wallet(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shorten address for display
 */
function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format transaction hash with explorer link
 */
function formatTxHash(hash, chainId) {
  const explorerUrl = chainId === 30 
    ? 'https://explorer.rsk.co/tx/'
    : 'https://explorer.testnet.rsk.co/tx/';
  
  return `${shortenAddress(hash)}\n🔍 [View on Explorer](${explorerUrl}${hash})`;
}

/**
 * Validate positive number
 */
function isPositiveNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * Create account data message
 */
function formatAccountData(data, userAddress) {
  const [collRbtcWei, debtUsdt0, collUsd, debtUsd, maxDebtUsd, hf] = data;
  
  const collRBTC = formatRBTC(collRbtcWei);
  const debt = formatUSDT0(debtUsdt0);
  const collUsdFormatted = formatUSD(collUsd);
  const debtUsdFormatted = formatUSD(debtUsd);
  const maxDebtUsdFormatted = formatUSD(maxDebtUsd);
  const healthFactor = formatHealthFactor(hf);
  
  const availableToBorrow = parseFloat(maxDebtUsdFormatted) - parseFloat(debtUsdFormatted);
  
  return `
📊 *Account Status*
━━━━━━━━━━━━━━━━━━━━
👤 Address: \`${shortenAddress(userAddress)}\`

💰 *Collateral*
RBTC: ${collRBTC} RBTC
Value: $${parseFloat(collUsdFormatted).toFixed(2)} USD

📉 *Debt*
USDT0: ${debt} USDT0
Value: $${parseFloat(debtUsdFormatted).toFixed(2)} USD

📈 *Borrowing Power*
Max Debt: $${parseFloat(maxDebtUsdFormatted).toFixed(2)} USD
Available: $${availableToBorrow.toFixed(2)} USD

❤️ *Health Factor*
${healthFactor}

${getHealthFactorAdvice(hf)}
`;
}

/**
 * Get advice based on health factor
 */
function getHealthFactorAdvice(hf) {
  const hfNum = parseFloat(ethers.formatUnits(hf, 18));
  
  if (hfNum === Infinity || hfNum > 1000000) {
    return '💡 _You have no debt. You can borrow against your collateral._';
  }
  
  if (hfNum < 1.0) {
    return '⚠️ *DANGER!* Your position may be liquidated. Repay debt or add collateral immediately!';
  } else if (hfNum < 1.2) {
    return '⚠️ *Warning:* Your position is at high risk. Consider repaying some debt or adding collateral.';
  } else if (hfNum < 1.5) {
    return '⚠️ *Caution:* Your position is getting risky. Monitor your health factor closely.';
  }
  
  return '✅ _Your position is healthy._';
}

module.exports = {
  formatRBTC,
  formatUSDT0,
  formatUSD,
  formatHealthFactor,
  parseRBTC,
  parseUSDT0,
  isValidAddress,
  isValidPrivateKey,
  shortenAddress,
  formatTxHash,
  isPositiveNumber,
  formatAccountData,
  getHealthFactorAdvice,
};

