import { config as dotenvConfig } from "dotenv";
import "@nomicfoundation/hardhat-ethers";

dotenvConfig();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    polygon: {
      type: "http",
      url: process.env.RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      timeout: 120000,
    },
  },
};
