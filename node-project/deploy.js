require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load compiled contract artifact (run `npx hardhat compile` to generate this)
const artifactPath = path.join(
  __dirname,
  "artifacts/contracts/PDukaToken.sol/PDukaToken.json"
);

if (!fs.existsSync(artifactPath)) {
  console.error(
    "Contract artifact not found. Compile the contract first:\n" +
      "  npx hardhat compile\n" +
      "Artifact expected at: " +
      artifactPath
  );
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-bor-rpc.publicnode.com"
  );
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying from address: ${wallet.address}`);

  const balance = await wallet.getBalance();
  console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} MATIC`);

  if (balance.isZero()) {
    throw new Error("Wallet has no MATIC. Fund it before deploying.");
  }

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Deploying PDuka Token (PDUKA) — 21 Billion fixed supply...");
  console.log("Token allocations (hardcoded in contract):");
  console.log("  Ecosystem  (40%): 0x81f2744be3c6630E088E58639A6991a30d388587");
  console.log("  Staking    (20%): 0x5dF03Dab7cDf2D8f4DB8C45F1bDDEa294844088D");
  console.log("  Development(15%): 0xecF2CA6C0a1e75f1B1A3127922796e393A0f132F");
  console.log("  Liquidity  (15%): 0x0Cf905ed523851a9AbB0f73728544029c624Ad0e");
  console.log(`  Team       (10%): ${wallet.address} (deployer)`);

  // No constructor arguments — all wallets are hardcoded in the contract
  const contract = await factory.deploy({
    gasLimit: 3000000,
  });

  console.log(`\nTransaction hash: ${contract.deployTransaction.hash}`);
  console.log("Waiting for confirmation...");

  await contract.deployed();

  console.log(`\nContract deployed successfully!`);
  console.log(`Contract address: ${contract.address}`);
  console.log(
    `View on PolygonScan: https://polygonscan.com/address/${contract.address}`
  );
}

main().catch((err) => {
  console.error("Deployment failed:", err.message);
  process.exit(1);
});
