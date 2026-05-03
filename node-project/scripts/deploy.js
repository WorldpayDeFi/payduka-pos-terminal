const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying from address: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} MATIC`);

  console.log("Deploying PDuka Token (PDUKA) — 21 Billion fixed supply...");
  console.log("Token allocations (hardcoded in contract):");
  console.log("  Ecosystem  (40%): 0x81f2744be3c6630E088E58639A6991a30d388587");
  console.log("  Staking    (20%): 0x5dF03Dab7cDf2D8f4DB8C45F1bDDEa294844088D");
  console.log("  Development(15%): 0xecF2CA6C0a1e75f1B1A3127922796e393A0f132F");
  console.log("  Liquidity  (15%): 0x0Cf905ed523851a9AbB0f73728544029c624Ad0e");
  console.log(`  Team       (10%): ${deployer.address} (deployer)`);

  const PDukaToken = await ethers.getContractFactory("PDukaToken");
  const token = await PDukaToken.deploy({ gasLimit: 4000000 });

  console.log(`\nTransaction hash: ${token.deployTransaction.hash}`);
  console.log("Waiting for confirmation...");

  await token.deployed();

  console.log(`\nContract deployed successfully!`);
  console.log(`Contract address: ${token.address}`);
  console.log(`View on PolygonScan: https://polygonscan.com/address/${token.address}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err.message);
  process.exit(1);
});
