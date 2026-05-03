import { ethers } from "ethers";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const PDUKA_TOKEN_ADDRESS  = "0x5025053F6Dec8C8Cfa85AE24C0CB9e4935C98E54";
const ICO_CONTRACT_ADDRESS = "0xD8358ba36723b860FFC8E9830060a8Cf348B84d3";
const ICO_ALLOCATION       = ethers.parseUnits("1000000000", 18); // 1 Billion PDUKA

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

const ICO_ABI = [
  "function startICO() external",
  "function icoActive() view returns (bool)",
  "function icoBalance() view returns (uint256)",
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL || "https://polygon-bor-rpc.publicnode.com";

  if (!privateKey) throw new Error("PRIVATE_KEY missing from .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Wallet: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`MATIC balance: ${ethers.formatEther(balance)} MATIC\n`);

  const pduka = new ethers.Contract(PDUKA_TOKEN_ADDRESS, ERC20_ABI, wallet);
  const ico   = new ethers.Contract(ICO_CONTRACT_ADDRESS, ICO_ABI, wallet);

  // ── Step 1: Transfer 1B PDUKA to ICO contract ──────────────
  console.log("Step 1: Transferring 1,000,000,000 PDUKA to ICO contract...");

  const icoBalanceBefore = await pduka.balanceOf(ICO_CONTRACT_ADDRESS);
  if (icoBalanceBefore >= ICO_ALLOCATION) {
    console.log("  ICO contract already funded — skipping transfer.");
  } else {
    const walletPdukaBalance = await pduka.balanceOf(wallet.address);
    console.log(`  Your PDUKA balance: ${ethers.formatUnits(walletPdukaBalance, 18)}`);

    if (walletPdukaBalance < ICO_ALLOCATION) {
      throw new Error(
        `Insufficient PDUKA. You have ${ethers.formatUnits(walletPdukaBalance, 18)}, need 1,000,000,000`
      );
    }

    const tx1 = await pduka.transfer(ICO_CONTRACT_ADDRESS, ICO_ALLOCATION, {
      gasLimit: 100000,
    });
    console.log(`  Transaction hash: ${tx1.hash}`);
    console.log("  Waiting for confirmation...");
    await tx1.wait();

    const icoBalanceAfter = await pduka.balanceOf(ICO_CONTRACT_ADDRESS);
    console.log(`  ICO contract PDUKA balance: ${ethers.formatUnits(icoBalanceAfter, 18)} PDUKA ✓\n`);
  }

  // ── Step 2: Start the ICO ───────────────────────────────────
  console.log("Step 2: Starting the ICO...");

  const alreadyActive = await ico.icoActive();
  if (alreadyActive) {
    console.log("  ICO is already active — skipping startICO().");
  } else {
    const tx2 = await ico.startICO({ gasLimit: 80000 });
    console.log(`  Transaction hash: ${tx2.hash}`);
    console.log("  Waiting for confirmation...");
    await tx2.wait();
    console.log("  ICO is now ACTIVE ✓");
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log("ICO is live and ready to accept purchases!");
  console.log(`ICO contract:  ${ICO_CONTRACT_ADDRESS}`);
  console.log(`PDuka Token:   ${PDUKA_TOKEN_ADDRESS}`);
  console.log(`ICO Balance:   ${ethers.formatUnits(await ico.icoBalance(), 18)} PDUKA`);
  console.log(`PolygonScan:   https://polygonscan.com/address/${ICO_CONTRACT_ADDRESS}`);
  console.log("─────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
