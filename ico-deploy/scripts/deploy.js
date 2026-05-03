import { ethers } from "ethers";
import { config as dotenvConfig } from "dotenv";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenvConfig();

const __dirname = dirname(fileURLToPath(import.meta.url));

const PDUKA_TOKEN_ADDRESS = "0x5025053F6Dec8C8Cfa85AE24C0CB9e4935C98E54";

const artifactPath = join(
  __dirname,
  "../artifacts/contracts/PDukaICO.sol/PDukaICO.json"
);

if (!existsSync(artifactPath)) {
  console.error("Artifact not found. Run: npx hardhat compile");
  process.exit(1);
}

const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL || "https://polygon-bor-rpc.publicnode.com";

  if (!privateKey) throw new Error("PRIVATE_KEY missing from .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying from address: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} MATIC`);

  console.log(`\nDeploying PDukaICO...`);
  console.log(`PDuka Token address: ${PDUKA_TOKEN_ADDRESS}`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const ico = await factory.deploy(PDUKA_TOKEN_ADDRESS, { gasLimit: 2000000 });

  console.log(`\nTransaction hash: ${ico.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");

  await ico.waitForDeployment();

  const address = await ico.getAddress();
  console.log(`\nICO contract deployed successfully!`);
  console.log(`ICO contract address: ${address}`);
  console.log(`PolygonScan: https://polygonscan.com/address/${address}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err.message);
  process.exit(1);
});
