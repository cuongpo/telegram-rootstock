# Rootstock Lending Telegram Bot

This bot interacts with the Rootstock Lending Boilerplate contracts, allowing you to manage your lending position directly from Telegram.

## Features

- **Account Management**: Set and clear your private key securely.
- **View Data**: Check your collateral, debt, health factor, and wallet balances.
- **Lending Actions**: Deposit, withdraw, borrow, and repay.
- **Contract Info**: Get details about the lending pool and network.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Get a Telegram Bot Token**:
    - Talk to [@BotFather](https://t.me/botfather) on Telegram.
    - Create a new bot and copy the token it gives you.

3.  **Configure Environment**:
    - Create a `.env` file in the `bot/` directory by copying the example:
      ```bash
      cp bot/.env.example bot/.env
      ```
    - Edit `bot/.env` with your details:
      - `TELEGRAM_BOT_TOKEN`: The token you got from BotFather.
      - `RPC_URL`: The Rootstock network RPC URL (Testnet is default).
      - `CHAIN_ID`: `31` for Testnet, `30` for Mainnet.
      - `LENDING_POOL_ADDRESS`: The address of the deployed `LendingPool` contract.
      - `USDT0_ADDRESS`: The address of the `USDT0` token contract.

4.  **Deploy Contracts (if you haven't already)**:
    - You need the contract addresses from a deployment. You can use the `scripts/demo.js` or `scripts/demo-testnet.js` to deploy them. After deploying, copy the addresses into your `bot/.env` file.

## Running the Bot

Once configured, you can start the bot:

```bash
npm run bot
```

The bot will connect to Telegram and the Rootstock network. You can now start a chat with your bot on Telegram.

## Usage

Open a chat with your bot on Telegram and use the following commands:

-   `/start`: Shows a welcome message.
-   `/help`: Lists all available commands.

**1. Set Your Private Key**

Before you can do anything, you must set the private key of the wallet you want to use. For security, this message will be deleted, and the key is only stored in memory.

```
/setkey YOUR_PRIVATE_KEY
```

**2. Check Your Status**

Get a full overview of your lending position.

```
/status
```

**3. Perform Actions**

-   `/deposit 0.01` - Deposit 0.01 RBTC.
-   `/borrow 100` - Borrow 100 USDT0.
-   `/repay 50` - Repay 50 USDT0.
-   `/withdraw 0.005` - Withdraw 0.005 RBTC.

## Security Warning

-   **Never use your main wallet's private key.** This bot is for educational and experimental purposes. Use a dedicated, funded test wallet.
-   The private key is stored in memory and is cleared when the bot restarts. However, be cautious about where you run this bot.
-   Avoid using the bot in public group chats where others might see your commands.

