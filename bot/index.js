const TelegramBot = require('node-telegram-bot-api');
const { config, validateConfig } = require('./config');
const contracts = require('./contracts');
const {
  formatRBTC,
  formatUSDT0,
  formatUSD,
  formatHealthFactor,
  parseRBTC,
  parseUSDT0,
  isValidPrivateKey,
  shortenAddress,
  formatTxHash,
  isPositiveNumber,
  formatAccountData,
} = require('./utils');
const wallet = require('./wallet');

// Validate configuration
try {
  validateConfig();
  console.log('✅ Configuration validated successfully');
} catch (error) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(config.telegramBotToken, { polling: true });

// Store user sessions (only stores temporary password for current operation)
// Private keys are stored encrypted on disk, never in memory
const userSessions = new Map();

console.log('🤖 Telegram Bot started successfully!');
console.log(`📡 Connected to ${config.networkName}`);
console.log(`🏦 Lending Pool: ${config.lendingPoolAddress}`);
console.log('🔐 Secure wallet management enabled');

// ==================== COMMAND HANDLERS ====================

/**
 * /start - Welcome message
 */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const hasWallet = await wallet.walletExists(chatId);

  const welcomeMessage = `
🚀 *Welcome to Rootstock Lending Bot!*

I help you interact with the RBTC/USDT0 Lending Pool on ${config.networkName}.

📚 *What you can do:*
• Deposit RBTC as collateral
• Borrow USDT0 against your collateral
• Repay your debt
• Withdraw collateral
• Check balances and health factor

⚙️ *Getting Started:*
${hasWallet ?
  '1. Unlock your wallet: `/unlock YOUR_PASSWORD`\n2. Check your status: `/status`\n3. Start lending!' :
  '1. Create a wallet: `/createwallet YOUR_PASSWORD`\n2. Import your private key: `/importkey PASSWORD PRIVATE_KEY`\n3. Check your status: `/status`\n4. Start lending!'
}

🔐 *Enhanced Security:*
Your private key is encrypted with your password and stored securely on disk. Your password is never stored, and your private key is only decrypted when needed for transactions.

Use /help to see all available commands.

🔗 *Contract:* \`${config.lendingPoolAddress}\`
`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

/**
 * /help - Show all commands
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📖 *Available Commands*
━━━━━━━━━━━━━━━━━━━━

🔐 *Wallet Management*
\`/createwallet <password>\` - Create a new encrypted wallet
\`/importkey <password> <private_key>\` - Import existing private key
\`/unlock <password>\` - Unlock your wallet for operations
\`/lock\` - Lock your wallet (clear session)
\`/deletewallet <password>\` - Permanently delete your wallet
\`/myaddress\` - Show your wallet address

📊 *View Information*
\`/status\` - View complete account status
\`/balance\` - Check RBTC collateral and USDT0 debt
\`/health\` - Check your health factor
\`/wallet\` - Check wallet balances (RBTC & USDT0)

💰 *Lending Operations*
\`/deposit <amount>\` - Deposit RBTC (e.g., \`/deposit 0.01\`)
\`/withdraw <amount>\` - Withdraw RBTC (e.g., \`/withdraw 0.005\`)
\`/borrow <amount>\` - Borrow USDT0 (e.g., \`/borrow 100\`)
\`/repay <amount>\` - Repay USDT0 (e.g., \`/repay 50\`)

ℹ️ *Other*
\`/help\` - Show this help message
\`/info\` - Show contract information

💡 *Tips:*
• Your private key is encrypted with your password
• Always use a strong password
• Your password is never stored or transmitted
• Remember to lock your wallet when done
• Keep health factor above 1.5 to avoid liquidation risk
`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

/**
 * /createwallet - Create a new wallet with password
 */
bot.onText(/\/createwallet (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const password = match[1].trim();

  // Delete the message for security
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    // Ignore if can't delete
  }

  try {
    const hasWallet = await wallet.walletExists(chatId);
    if (hasWallet) {
      return bot.sendMessage(chatId, '❌ You already have a wallet. Use `/deletewallet <password>` first if you want to create a new one.', {
        parse_mode: 'Markdown',
      });
    }

    if (password.length < 8) {
      return bot.sendMessage(chatId, '❌ Password must be at least 8 characters long.', {
        parse_mode: 'Markdown',
      });
    }

    // Generate new random wallet
    const randomWallet = require('ethers').Wallet.createRandom();
    await wallet.saveWallet(chatId, randomWallet.privateKey, password);

    bot.sendMessage(chatId, `✅ Wallet created successfully!\n\n👤 Address: \`${randomWallet.address}\`\n\n🔐 Your wallet is encrypted with your password.\n⚠️ Your message with the password has been deleted.\n\n💡 Important: Fund this address with RBTC to start using the lending pool.\n\n⚠️ WARNING: Save your private key in a secure place! Use /exportkey to view it.`, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error in /createwallet:', error);
    bot.sendMessage(chatId, `❌ Error creating wallet: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /importkey - Import existing private key
 */
bot.onText(/\/importkey (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const password = match[1].trim();
  const privateKey = match[2].trim();

  // Delete the message for security
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    // Ignore if can't delete
  }

  try {
    const hasWallet = await wallet.walletExists(chatId);
    if (hasWallet) {
      return bot.sendMessage(chatId, '❌ You already have a wallet. Use `/deletewallet <password>` first if you want to import a different key.', {
        parse_mode: 'Markdown',
      });
    }

    if (password.length < 8) {
      return bot.sendMessage(chatId, '❌ Password must be at least 8 characters long.', {
        parse_mode: 'Markdown',
      });
    }

    if (!isValidPrivateKey(privateKey)) {
      return bot.sendMessage(chatId, '❌ Invalid private key format.', {
        parse_mode: 'Markdown',
      });
    }

    const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

    // Validate the key can create a wallet
    const testWallet = new (require('ethers').Wallet)(normalizedKey);

    await wallet.saveWallet(chatId, normalizedKey, password);

    bot.sendMessage(chatId, `✅ Private key imported successfully!\n\n👤 Address: \`${testWallet.address}\`\n\n🔐 Your wallet is encrypted with your password.\n⚠️ Your message with the password and key has been deleted.`, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error in /importkey:', error);
    bot.sendMessage(chatId, `❌ Error importing key: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /unlock - Unlock wallet with password
 */
bot.onText(/\/unlock (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const password = match[1].trim();

  // Delete the message for security
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    // Ignore if can't delete
  }

  try {
    const walletData = await wallet.loadWallet(chatId, password);

    // Store decrypted key temporarily in session
    userSessions.set(chatId, {
      privateKey: walletData.privateKey,
      address: walletData.address,
      unlockedAt: Date.now()
    });

    // Auto-lock after 30 minutes
    setTimeout(() => {
      if (userSessions.has(chatId)) {
        userSessions.delete(chatId);
        bot.sendMessage(chatId, '🔒 Your wallet has been automatically locked after 30 minutes of inactivity.', {
          parse_mode: 'Markdown',
        });
      }
    }, 30 * 60 * 1000);

    bot.sendMessage(chatId, `✅ Wallet unlocked successfully!\n\n👤 Address: \`${walletData.address}\`\n\n⚠️ Your message with the password has been deleted.\n💡 Your wallet will auto-lock after 30 minutes.`, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error in /unlock:', error);
    bot.sendMessage(chatId, `❌ Error unlocking wallet: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /lock - Lock wallet (clear session)
 */
bot.onText(/\/lock/, async (msg) => {
  const chatId = msg.chat.id;

  if (userSessions.has(chatId)) {
    userSessions.delete(chatId);
    bot.sendMessage(chatId, '✅ Your wallet has been locked.', { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, '❌ Your wallet is already locked.', { parse_mode: 'Markdown' });
  }
});

/**
 * /deletewallet - Delete wallet permanently
 */
bot.onText(/\/deletewallet (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const password = match[1].trim();

  // Delete the message for security
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    // Ignore if can't delete
  }

  try {
    // Verify password before deleting
    await wallet.loadWallet(chatId, password);

    // Clear session
    if (userSessions.has(chatId)) {
      userSessions.delete(chatId);
    }

    // Delete wallet file
    await wallet.deleteWallet(chatId);

    bot.sendMessage(chatId, '✅ Your wallet has been permanently deleted.\n\n⚠️ Your message with the password has been deleted.', {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error in /deletewallet:', error);
    bot.sendMessage(chatId, `❌ Error deleting wallet: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /myaddress - Show user's address
 */
bot.onText(/\/myaddress/, async (msg) => {
  const chatId = msg.chat.id;

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  const session = userSessions.get(chatId);
  bot.sendMessage(chatId, `👤 Your address:\n\`${session.address}\``, { parse_mode: 'Markdown' });
});

/**
 * /status - Show complete account status
 */
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;

    bot.sendMessage(chatId, '⏳ Fetching account data...', { parse_mode: 'Markdown' });

    const accountData = await contracts.getAccountData(address);
    const message = formatAccountData(accountData, address);

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /status:', error);
    bot.sendMessage(chatId, `❌ Error fetching account data: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /balance - Check balances
 */
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;

    bot.sendMessage(chatId, '⏳ Checking balances...', { parse_mode: 'Markdown' });

    const accountData = await contracts.getAccountData(address);
    const [collRbtcWei, debtUsdt0, collUsd, debtUsd] = accountData;

    const message = `
💰 *Balance Summary*
━━━━━━━━━━━━━━━━━━━━

📥 *Collateral (Deposited)*
${formatRBTC(collRbtcWei)} RBTC
≈ $${parseFloat(formatUSD(collUsd)).toFixed(2)} USD

📤 *Debt (Borrowed)*
${formatUSDT0(debtUsdt0)} USDT0
≈ $${parseFloat(formatUSD(debtUsd)).toFixed(2)} USD
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /balance:', error);
    bot.sendMessage(chatId, `❌ Error fetching balance: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /health - Check health factor
 */
bot.onText(/\/health/, async (msg) => {
  const chatId = msg.chat.id;

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;

    bot.sendMessage(chatId, '⏳ Checking health factor...', { parse_mode: 'Markdown' });

    const hf = await contracts.getHealthFactor(address);
    const healthFactorFormatted = formatHealthFactor(hf);

    const message = `
❤️ *Health Factor*
━━━━━━━━━━━━━━━━━━━━

${healthFactorFormatted}

💡 *What does this mean?*
• HF > 1.5: Healthy position ✅
• HF 1.2-1.5: Caution zone ⚠️
• HF 1.0-1.2: High risk zone 🚨
• HF < 1.0: Liquidation risk! 🔴

Use /status for detailed account info.
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /health:', error);
    bot.sendMessage(chatId, `❌ Error fetching health factor: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /wallet - Check wallet balances
 */
bot.onText(/\/wallet/, async (msg) => {
  const chatId = msg.chat.id;

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;

    bot.sendMessage(chatId, '⏳ Checking wallet balances...', { parse_mode: 'Markdown' });

    const rbtcBalance = await contracts.getRBTCBalance(address);
    const usdt0Balance = await contracts.getUSDT0Balance(address);

    const message = `
👛 *Wallet Balances*
━━━━━━━━━━━━━━━━━━━━
👤 Address: \`${shortenAddress(address)}\`

💎 RBTC: ${formatRBTC(rbtcBalance)} RBTC
💵 USDT0: ${formatUSDT0(usdt0Balance)} USDT0

_These are your wallet balances, not deposited in the lending pool._
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /wallet:', error);
    bot.sendMessage(chatId, `❌ Error fetching wallet balances: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /deposit - Deposit RBTC
 */
bot.onText(/\/deposit (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amountStr = match[1].trim();

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  if (!isPositiveNumber(amountStr)) {
    return bot.sendMessage(chatId, '❌ Please provide a valid positive amount.\nExample: `/deposit 0.01`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;
    const amount = parseRBTC(amountStr);

    // Check balance
    const balance = await contracts.getRBTCBalance(address);
    if (balance < amount) {
      return bot.sendMessage(chatId, `❌ Insufficient RBTC balance.\n\nYou have: ${formatRBTC(balance)} RBTC\nYou need: ${formatRBTC(amount)} RBTC`, {
        parse_mode: 'Markdown',
      });
    }

    bot.sendMessage(chatId, `⏳ Depositing ${formatRBTC(amount)} RBTC...\n\nPlease wait, this may take a few moments.`, {
      parse_mode: 'Markdown',
    });

    const receipt = await contracts.depositRBTC(session.privateKey, amount);

    const message = `
✅ *Deposit Successful!*
━━━━━━━━━━━━━━━━━━━━

💰 Deposited: ${formatRBTC(amount)} RBTC

📝 Transaction:
${formatTxHash(receipt.hash, config.chainId)}

Use /status to see your updated account.
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /deposit:', error);
    bot.sendMessage(chatId, `❌ Deposit failed: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /withdraw - Withdraw RBTC
 */
bot.onText(/\/withdraw (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amountStr = match[1].trim();

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  if (!isPositiveNumber(amountStr)) {
    return bot.sendMessage(chatId, '❌ Please provide a valid positive amount.\nExample: `/withdraw 0.005`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;
    const amount = parseRBTC(amountStr);

    // Check collateral
    const accountData = await contracts.getAccountData(address);
    const collRbtcWei = accountData[0];

    if (collRbtcWei < amount) {
      return bot.sendMessage(chatId, `❌ Insufficient collateral.\n\nYou have: ${formatRBTC(collRbtcWei)} RBTC deposited\nYou want to withdraw: ${formatRBTC(amount)} RBTC`, {
        parse_mode: 'Markdown',
      });
    }

    bot.sendMessage(chatId, `⏳ Withdrawing ${formatRBTC(amount)} RBTC...\n\nPlease wait, this may take a few moments.`, {
      parse_mode: 'Markdown',
    });

    const receipt = await contracts.withdrawRBTC(session.privateKey, amount);

    const message = `
✅ *Withdrawal Successful!*
━━━━━━━━━━━━━━━━━━━━

💰 Withdrawn: ${formatRBTC(amount)} RBTC

📝 Transaction:
${formatTxHash(receipt.hash, config.chainId)}

Use /status to see your updated account.
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /withdraw:', error);

    // Check if it's a health factor error
    if (error.message.includes('HF_LT_1')) {
      bot.sendMessage(chatId, `❌ Withdrawal failed: Your health factor would drop below 1.0.\n\n⚠️ You need to repay some debt before withdrawing this amount.\n\nUse /status to check your current position.`, {
        parse_mode: 'Markdown',
      });
    } else {
      bot.sendMessage(chatId, `❌ Withdrawal failed: ${error.message}`, { parse_mode: 'Markdown' });
    }
  }
});

/**
 * /borrow - Borrow USDT0
 */
bot.onText(/\/borrow (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amountStr = match[1].trim();

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  if (!isPositiveNumber(amountStr)) {
    return bot.sendMessage(chatId, '❌ Please provide a valid positive amount.\nExample: `/borrow 100`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;
    const amount = parseUSDT0(amountStr);

    // Check borrowing power
    const accountData = await contracts.getAccountData(address);
    const debtUsd = accountData[3];
    const maxDebtUsd = accountData[4];
    const availableUsd = BigInt(maxDebtUsd) - BigInt(debtUsd);

    if (availableUsd <= 0) {
      return bot.sendMessage(chatId, `❌ No borrowing power available.\n\n💡 Deposit more RBTC collateral to borrow.\n\nUse /status to see your account details.`, {
        parse_mode: 'Markdown',
      });
    }

    bot.sendMessage(chatId, `⏳ Borrowing ${formatUSDT0(amount)} USDT0...\n\nPlease wait, this may take a few moments.`, {
      parse_mode: 'Markdown',
    });

    const receipt = await contracts.borrowUSDT0(session.privateKey, amount);

    const message = `
✅ *Borrow Successful!*
━━━━━━━━━━━━━━━━━━━━

💵 Borrowed: ${formatUSDT0(amount)} USDT0

📝 Transaction:
${formatTxHash(receipt.hash, config.chainId)}

⚠️ Remember to monitor your health factor!
Use /health to check it.
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /borrow:', error);

    // Check if it's an insufficient collateral error
    if (error.message.includes('INSUFFICIENT_COLLATERAL')) {
      bot.sendMessage(chatId, `❌ Borrow failed: Insufficient collateral.\n\n⚠️ You need to deposit more RBTC or borrow less.\n\nUse /status to check your borrowing power.`, {
        parse_mode: 'Markdown',
      });
    } else {
      bot.sendMessage(chatId, `❌ Borrow failed: ${error.message}`, { parse_mode: 'Markdown' });
    }
  }
});

/**
 * /repay - Repay USDT0
 */
bot.onText(/\/repay (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amountStr = match[1].trim();

  if (!userSessions.has(chatId)) {
    return bot.sendMessage(chatId, '❌ Please unlock your wallet first using `/unlock <password>`', { parse_mode: 'Markdown' });
  }

  if (!isPositiveNumber(amountStr)) {
    return bot.sendMessage(chatId, '❌ Please provide a valid positive amount.\nExample: `/repay 50`', { parse_mode: 'Markdown' });
  }

  try {
    const session = userSessions.get(chatId);
    const address = session.address;
    const amount = parseUSDT0(amountStr);

    // Check debt
    const accountData = await contracts.getAccountData(address);
    const debtUsdt0 = accountData[1];

    if (debtUsdt0 === 0n) {
      return bot.sendMessage(chatId, `❌ You have no debt to repay.`, { parse_mode: 'Markdown' });
    }

    // Check USDT0 balance
    const usdt0Balance = await contracts.getUSDT0Balance(address);
    if (usdt0Balance < amount) {
      return bot.sendMessage(chatId, `❌ Insufficient USDT0 balance.\n\nYou have: ${formatUSDT0(usdt0Balance)} USDT0\nYou need: ${formatUSDT0(amount)} USDT0`, {
        parse_mode: 'Markdown',
      });
    }

    bot.sendMessage(chatId, `⏳ Repaying ${formatUSDT0(amount)} USDT0...\n\nPlease wait, this may take a few moments.\n(Approving and repaying...)`, {
      parse_mode: 'Markdown',
    });

    const receipt = await contracts.repayUSDT0(session.privateKey, amount);

    const message = `
✅ *Repayment Successful!*
━━━━━━━━━━━━━━━━━━━━

💵 Repaid: ${formatUSDT0(amount)} USDT0

📝 Transaction:
${formatTxHash(receipt.hash, config.chainId)}

✨ Your health factor has improved!
Use /status to see your updated account.
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /repay:', error);
    bot.sendMessage(chatId, `❌ Repayment failed: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

/**
 * /info - Show contract information
 */
bot.onText(/\/info/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    bot.sendMessage(chatId, '⏳ Fetching contract info...', { parse_mode: 'Markdown' });

    const ltvBps = await contracts.getLTV();
    const ltvPercent = (Number(ltvBps) / 100).toFixed(2);

    const explorerUrl = config.chainId === 30
      ? 'https://explorer.rsk.co/address/'
      : 'https://explorer.testnet.rsk.co/address/';

    const message = `
ℹ️ *Contract Information*
━━━━━━━━━━━━━━━━━━━━

🌐 Network: ${config.networkName}
⛓️ Chain ID: ${config.chainId}

🏦 *Lending Pool*
Address: \`${config.lendingPoolAddress}\`
[View on Explorer](${explorerUrl}${config.lendingPoolAddress})

💵 *USDT0 Token*
Address: \`${config.usdt0Address}\`
[View on Explorer](${explorerUrl}${config.usdt0Address})

📊 *Parameters*
LTV (Loan-to-Value): ${ltvPercent}%
Max Borrowing: ${ltvPercent}% of collateral value

💡 *How it works:*
1. Deposit RBTC as collateral
2. Borrow up to ${ltvPercent}% of your collateral value in USDT0
3. Maintain health factor > 1.0 to avoid liquidation
4. Repay debt to unlock collateral
`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });
  } catch (error) {
    console.error('Error in /info:', error);
    bot.sendMessage(chatId, `❌ Error fetching contract info: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// ==================== ERROR HANDLING ====================

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});

console.log('✅ Bot is ready to accept commands!');
console.log('💬 Start a chat with your bot and send /start');



