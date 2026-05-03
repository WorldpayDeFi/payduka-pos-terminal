/**
 * Verify PDukaToken on PolygonScan
 * Run: npx hardhat run scripts/verify-token.js --network polygon
 * OR:  npx hardhat verify --network polygon 0x5025053F6Dec8C8Cfa85AE24C0CB9e4935C98E54
 */

const TOKEN_ADDRESS = "0x5025053F6Dec8C8Cfa85AE24C0CB9e4935C98E54";

async function main() {
  console.log("Verifying PDukaToken at:", TOKEN_ADDRESS);

  await hre.run("verify:verify", {
    address: TOKEN_ADDRESS,
    constructorArguments: [],
    contract: "contracts/PDukaToken.sol:PDukaToken",
  });

  console.log("✅ PDukaToken verified on PolygonScan!");
  console.log(`🔗 https://polygonscan.com/address/${TOKEN_ADDRESS}#code`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
