# Rootstock Lending Boilerplate – Telegram Bot

This project provides a complete boilerplate for a DeFi lending application on the Rootstock blockchain, including smart contracts and a Telegram bot for user interaction.

## Features

-   **Smart Contracts**: A minimal lending pool where users can deposit RBTC as collateral and borrow a stablecoin (USDT0).
-   **Telegram Bot**: A Node.js bot that allows users to interact with the lending pool directly from Telegram.
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

### 1. Clone the Repository

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
-   `ADMIN_PRIVATE_KEY`: The private key of the account you'll use for deployment and bot operations.

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

-   `/start`: Welcome message and instructions.
-   `/help`: List all available commands.
-   `/setkey <private_key>`: Set your private key for the session.
-   `/status`: View your complete account status.
-   `/deposit <amount>`: Deposit RBTC as collateral.
-   `/withdraw <amount>`: Withdraw your RBTC collateral.
-   `/borrow <amount>`: Borrow USDT0 against your collateral.
-   `/repay <amount>`: Repay your USDT0 debt.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

