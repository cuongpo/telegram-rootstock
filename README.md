# Rootstock Lending Boilerplate – Telegram Bot

This project provides a complete boilerplate for a DeFi lending application on the Rootstock blockchain, including smart contracts and a Telegram bot for user interaction.

> **Note**: This project is based on the [Rootstock Lending Boilerplate](https://github.com/rsksmart/rbtc-usdt0-lending-boilerplate). If you're creating your own bot based on this boilerplate, please fork the original repository to maintain the connection and receive updates.

## 🔐 Security Features

This bot implements **secure private key management** based on the [RSK CLI wallet management approach](https://github.com/rsksmart/rsk-cli/blob/main/src/commands/wallet.ts):

- ✅ **AES-256-GCM Encryption**: Private keys are encrypted with military-grade encryption
- ✅ **Password Protection**: Keys are encrypted with user-provided passwords
- ✅ **No Plaintext Storage**: Private keys are never stored unencrypted
- ✅ **Session Management**: Automatic wallet locking after 30 minutes
- ✅ **Secure Storage**: Encrypted wallets stored on disk (not in memory)

See [SECURITY.md](SECURITY.md) for detailed security documentation.

## Features

-   **Smart Contracts**: A minimal lending pool where users can deposit RBTC as collateral and borrow a stablecoin (USDT0).
-   **Telegram Bot**: A Node.js bot that allows users to interact with the lending pool directly from Telegram with secure key management.
-   **Hardhat Environment**: A complete development environment for compiling, testing, and deploying the smart contracts.

## Project Structure

```
/
├── contracts/         # Solidity smart contracts
├── scripts/           # Deployment and interaction scripts
├── bot/               # Telegram bot source code
├── hardhat.config.js  # Hardhat configuration
├── package.json       # Project dependencies and scripts
└── README.md          # This file
```

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18 or higher)
-   [npm](https://www.npmjs.com/)
-   A funded Rootstock testnet account. Get tRBTC from the [faucet](https://faucet.rsk.co/).

### Setting Up as a Fork

If you're creating your own bot based on this boilerplate:

1. **Fork the original repository** on GitHub:
   - Visit [rsksmart/rbtc-usdt0-lending-boilerplate](https://github.com/rsksmart/rbtc-usdt0-lending-boilerplate)
   - Click the "Fork" button in the top right
   - This creates your own copy while maintaining the connection to the original

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/rbtc-usdt0-lending-boilerplate.git
   cd rbtc-usdt0-lending-boilerplate
   ```

3. **Keep your fork updated** (optional):
   ```bash
   git remote add upstream https://github.com/rsksmart/rbtc-usdt0-lending-boilerplate.git
   git fetch upstream
   git merge upstream/main
   ```

### 1. Clone the Repository (if not forking)

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root of the project by copying the example:

```bash
cp .env.example .env
```

Now, edit the `.env` file with your details:

-   `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from [@BotFather](https://t.me/botfather).
-   `ADMIN_PRIVATE_KEY`: (Optional) The private key for deployment only - not used by the bot anymore.

**Note**: The bot no longer uses `ADMIN_PRIVATE_KEY` for operations. Each user creates and manages their own encrypted wallet.

## Smart Contract Deployment

To deploy the smart contracts to the Rootstock testnet, run the following command:

```bash
npx hardhat run scripts/demo-testnet.js --network rskTestnet
```

This script will deploy the `LendingPool`, `MockUSDT0`, and `UmbrellaOracleAdapter` contracts. After a successful deployment, the script will print the contract addresses. Copy these addresses into your `.env` file.

## Running the Telegram Bot

Once the contracts are deployed and the `.env` file is configured, you can start the Telegram bot:

```bash
npm run bot
```

The bot will connect to the Rootstock testnet and Telegram. You can now start a chat with your bot and use the available commands.

### Bot Commands

#### Wallet Management (NEW)
-   `/createwallet <password>`: Create a new encrypted wallet
-   `/importkey <password> <private_key>`: Import an existing private key
-   `/unlock <password>`: Unlock your wallet for operations
-   `/lock`: Lock your wallet (clear session)
-   `/deletewallet <password>`: Permanently delete your wallet
-   `/myaddress`: Show your wallet address

#### Information & Status
-   `/start`: Welcome message and instructions.
-   `/help`: List all available commands.
-   `/status`: View your complete account status.
-   `/balance`: Check your RBTC collateral and USDT0 debt.
-   `/health`: Check your health factor.
-   `/wallet`: Check your wallet balances (RBTC & USDT0).
-   `/info`: Show contract information.

#### Lending Operations
-   `/deposit <amount>`: Deposit RBTC as collateral.
-   `/withdraw <amount>`: Withdraw your RBTC collateral.
-   `/borrow <amount>`: Borrow USDT0 against your collateral.
-   `/repay <amount>`: Repay your USDT0 debt.

## Security Best Practices

1. **Use Strong Passwords**: At least 8 characters, longer is better
2. **Lock Your Wallet**: Use `/lock` when done with transactions
3. **Dedicated Wallet**: Use a separate wallet for bot interactions
4. **Never Share Credentials**: Never share your password with anyone
5. **Monitor Activity**: Regularly check your wallet status

See [SECURITY.md](SECURITY.md) for comprehensive security documentation.

## Architecture Changes

### Previous Version (Insecure)
```javascript
// Private keys stored in memory (Map)
const userKeys = new Map();
userKeys.set(chatId, plainPrivateKey); // ❌ Insecure
```

### Current Version (Secure)
```javascript
// Private keys encrypted on disk
await wallet.saveWallet(chatId, privateKey, password); // ✅ Encrypted
// Temporary session after unlock
userSessions.set(chatId, { privateKey, address, unlockedAt }); // ⏱️ Time-limited
```

## Contributing

Contributions are welcome! Please ensure:
1. Security best practices are followed
2. Private keys are never logged or exposed
3. Encryption standards are maintained
4. Tests are added for new features

## Acknowledgments

- Original boilerplate: [rsksmart/rbtc-usdt0-lending-boilerplate](https://github.com/rsksmart/rbtc-usdt0-lending-boilerplate)
- Wallet management approach: [rsksmart/rsk-cli](https://github.com/rsksmart/rsk-cli)
- Thanks to the Rootstock team for the feedback and security recommendations

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

