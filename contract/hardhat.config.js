require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const OG_MAINNET_RPC = "https://evmrpc.0g.ai";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris", // must match explorer verification (bytecode_length_mismatch fix)
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "og-testnet": {
      url: process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 16602,
    },
    "og-mainnet": {
      url: OG_MAINNET_RPC,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 16661,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
