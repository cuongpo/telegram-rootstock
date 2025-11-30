const { ethers } = require('ethers');
const { config } = require('./config');

// Contract ABIs (minimal required functions)
const LENDING_POOL_ABI = [
  // View functions
  'function collateralRBTC(address user) view returns (uint256)',
  'function debtUSDT0(address user) view returns (uint256)',
  'function collateralUsdE18(address user) view returns (uint256)',
  'function debtUsdE18(address user) view returns (uint256)',
  'function maxBorrowableUsdE18(address user) view returns (uint256)',
  'function healthFactorE18(address user) view returns (uint256)',
  'function getAccountData(address user) view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function ltvBps() view returns (uint256)',
  'function USDT0_SCALE() view returns (uint256)',
  
  // State-changing functions
  'function depositRBTC() payable',
  'function withdrawRBTC(uint256 amountWei)',
  'function borrowUSDT0(uint256 amount)',
  'function repayUSDT0(uint256 amount)',
  
  // Events
  'event Deposited(address indexed user, uint256 rbtcAmount)',
  'event Borrowed(address indexed user, uint256 usdt0Amount)',
  'event Repaid(address indexed user, uint256 usdt0Amount)',
  'event Withdrawn(address indexed user, uint256 rbtcAmount)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

class ContractService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.lendingPool = null;
    this.usdt0 = null;
    this.initializeContracts();
  }

  initializeContracts() {
    // Initialize read-only contracts
    this.lendingPool = new ethers.Contract(
      config.lendingPoolAddress,
      LENDING_POOL_ABI,
      this.provider
    );
    
    this.usdt0 = new ethers.Contract(
      config.usdt0Address,
      ERC20_ABI,
      this.provider
    );
  }

  /**
   * Get signer from private key
   */
  getSigner(privateKey) {
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Get contract instance with signer
   */
  getLendingPoolWithSigner(privateKey) {
    const signer = this.getSigner(privateKey);
    return new ethers.Contract(
      config.lendingPoolAddress,
      LENDING_POOL_ABI,
      signer
    );
  }

  /**
   * Get USDT0 contract instance with signer
   */
  getUSDT0WithSigner(privateKey) {
    const signer = this.getSigner(privateKey);
    return new ethers.Contract(
      config.usdt0Address,
      ERC20_ABI,
      signer
    );
  }

  /**
   * Get account data
   */
  async getAccountData(address) {
    return await this.lendingPool.getAccountData(address);
  }

  /**
   * Get health factor
   */
  async getHealthFactor(address) {
    return await this.lendingPool.healthFactorE18(address);
  }

  /**
   * Get RBTC balance (native balance)
   */
  async getRBTCBalance(address) {
    return await this.provider.getBalance(address);
  }

  /**
   * Get USDT0 balance
   */
  async getUSDT0Balance(address) {
    return await this.usdt0.balanceOf(address);
  }

  /**
   * Deposit RBTC
   */
  async depositRBTC(privateKey, amount) {
    const pool = this.getLendingPoolWithSigner(privateKey);
    const tx = await pool.depositRBTC({ 
      value: amount,
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit,
    });
    return await tx.wait();
  }

  /**
   * Withdraw RBTC
   */
  async withdrawRBTC(privateKey, amount) {
    const pool = this.getLendingPoolWithSigner(privateKey);
    const tx = await pool.withdrawRBTC(amount, {
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit,
    });
    return await tx.wait();
  }

  /**
   * Borrow USDT0
   */
  async borrowUSDT0(privateKey, amount) {
    const pool = this.getLendingPoolWithSigner(privateKey);
    const tx = await pool.borrowUSDT0(amount, {
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit,
    });
    return await tx.wait();
  }

  /**
   * Repay USDT0
   */
  async repayUSDT0(privateKey, amount) {
    const pool = this.getLendingPoolWithSigner(privateKey);
    const usdt0 = this.getUSDT0WithSigner(privateKey);
    const signer = this.getSigner(privateKey);

    // First, check and approve if needed
    const allowance = await usdt0.allowance(signer.address, config.lendingPoolAddress);

    if (allowance < amount) {
      const approveTx = await usdt0.approve(config.lendingPoolAddress, amount, {
        gasPrice: config.gasPrice,
        gasLimit: config.gasLimit,
      });
      await approveTx.wait();
    }

    // Then repay
    const tx = await pool.repayUSDT0(amount, {
      gasPrice: config.gasPrice,
      gasLimit: config.gasLimit,
    });
    return await tx.wait();
  }

  /**
   * Get LTV (Loan-to-Value) in basis points
   */
  async getLTV() {
    return await this.lendingPool.ltvBps();
  }

  /**
   * Check if address has sufficient RBTC balance
   */
  async hasSufficientRBTC(address, amount) {
    const balance = await this.getRBTCBalance(address);
    return balance >= amount;
  }

  /**
   * Check if address has sufficient USDT0 balance
   */
  async hasSufficientUSDT0(address, amount) {
    const balance = await this.getUSDT0Balance(address);
    return balance >= amount;
  }
}

module.exports = new ContractService();

