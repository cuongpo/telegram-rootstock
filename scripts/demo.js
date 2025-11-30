const hre = require("hardhat");

async function main() {
  const [deployer, alice] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Alice   :", alice.address);

  // 1) Deploy Mock USDT0 (6 decimals) and mint initial supply to deployer
  const MockUSDT0 = await hre.ethers.getContractFactory("MockUSDT0");
  const initialSupply = hre.ethers.parseUnits("1000000", 6); // 1,000,000 USDT0
  const usdt0 = await MockUSDT0.deploy(initialSupply);
  await usdt0.waitForDeployment();
  const usdt0Addr = await usdt0.getAddress();
  console.log("USDT0  :", usdt0Addr);

  // 2) Deploy mock oracle adapter and set prices
  const Oracle = await hre.ethers.getContractFactory("UmbrellaOracleAdapter");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("Oracle :", oracleAddr);

  // Prices with 18 decimals
  const priceRBTC = hre.ethers.parseUnits("65000", 18); // $65,000 per RBTC
  const priceUSDT0 = hre.ethers.parseUnits("1", 18);    // $1 per USDT0
  await (await oracle.setBatch(
    [hre.ethers.ZeroAddress, usdt0Addr],
    [priceRBTC, priceUSDT0]
  )).wait();

  // 3) Deploy LendingPool with LTV = 70%
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const ltvBps = 7000;
  const pool = await LendingPool.deploy(usdt0Addr, oracleAddr, ltvBps);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log("Pool   :", poolAddr);

  // 4) Seed pool with USDT0 liquidity so users can borrow
  const seedAmount = hre.ethers.parseUnits("100000", 6); // 100,000 USDT0
  await (await usdt0.transfer(poolAddr, seedAmount)).wait();

  // 5) Alice deposits 0.01 RBTC (on Hardhat this is native ETH)
  const depositAmt = hre.ethers.parseEther("0.01");
  await (await pool.connect(alice).depositRBTC({ value: depositAmt })).wait();
  console.log("Alice deposited 0.01 RBTC");

  // Helper to pretty print account data
  async function printAccount(label) {
    const data = await pool.getAccountData(alice.address);
    const collWei = data[0];
    const debt = data[1];
    const collUsd = data[2];
    const debtUsd = data[3];
    const maxDebtUsd = data[4];
    const hf = data[5];
    console.log(`\n== ${label} ==`);
    console.log("Collateral (RBTC):", hre.ethers.formatEther(collWei));
    console.log("Debt (USDT0)     :", hre.ethers.formatUnits(debt, 6));
    console.log("Collateral USD   :", hre.ethers.formatUnits(collUsd, 18));
    console.log("Debt USD         :", hre.ethers.formatUnits(debtUsd, 18));
    console.log("Max Debt USD     :", hre.ethers.formatUnits(maxDebtUsd, 18));
    console.log("Health Factor    :", hre.ethers.formatUnits(hf, 18));
  }

  await printAccount("After deposit");

  // 6) Alice borrows 400 USDT0
  const borrowAmt = hre.ethers.parseUnits("400", 6);
  await (await pool.connect(alice).borrowUSDT0(borrowAmt)).wait();
  console.log("Alice borrowed 400 USDT0");
  await printAccount("After borrow");

  // 7) Alice repays 200 USDT0
  const repayAmt = hre.ethers.parseUnits("200", 6);
  await (await usdt0.connect(alice).approve(poolAddr, repayAmt)).wait();
  await (await pool.connect(alice).repayUSDT0(repayAmt)).wait();
  console.log("Alice repaid 200 USDT0");
  await printAccount("After repay");

  // 8) Alice withdraws 0.002 RBTC
  const withdrawAmt = hre.ethers.parseEther("0.002");
  await (await pool.connect(alice).withdrawRBTC(withdrawAmt)).wait();
  console.log("Alice withdrew 0.002 RBTC");
  await printAccount("After withdraw");

  console.log("\nDemo complete ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
