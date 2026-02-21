/**
 * Testnet deploy: real 0G flow (StorageProofVerifier + AgentNFT).
 * Mint: encrypt → 0G Storage → sign rootHash (EIP-191) → mint.
 * Transfer/clone: TEE attestation required (proof = ..., signature from teeOracleSigner).
 *
 * teeOracleSigner = signer by default. Set TEE_ORACLE_SIGNER=0x... for a different TEE signer.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network og-testnet
 */
const { ethers } = require("hardhat");

const MAINNET = {
  rpc: "https://evmrpc.0g.ai",
  indexer: "https://indexer-storage.0g.ai",
};
const TESTNET = {
  rpc: "https://evmrpc-testnet.0g.ai",
  indexer: "https://indexer-storage-testnet-turbo.0g.ai",
};

async function main() {
  const isMainnet = process.env.HARDHAT_NETWORK === "og-mainnet";
  const { rpc: defaultRpc, indexer: defaultIndexer } = isMainnet ? MAINNET : TESTNET;

  const [deployer] = await ethers.getSigners();
  const signerAddress = deployer.address;

  console.log(
    "Deploying real 0G flow (StorageProofVerifier + AgentNFT) to",
    isMainnet ? "MAINNET" : "TESTNET",
    "with account:",
    signerAddress
  );

  const teeOracleSigner = process.env.TEE_ORACLE_SIGNER || signerAddress;
  const StorageVerifier = await ethers.getContractFactory("StorageProofVerifier");
  const verifier = await StorageVerifier.deploy(signerAddress, teeOracleSigner);
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  const chainURL = process.env.OG_RPC_URL || defaultRpc;
  const indexerURL = process.env.OG_INDEXER_URL || defaultIndexer;

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(
    "ClawCounsel AI Agent",
    "CLAW",
    verifierAddress,
    chainURL,
    indexerURL
  );
  await agentNFT.waitForDeployment();
  const agentNFTAddress = await agentNFT.getAddress();

  console.log("StorageProofVerifier deployed to:", verifierAddress);
  console.log("AgentNFT (ERC-7857) deployed to:", agentNFTAddress);
  console.log("TEE oracle (transfer/clone):", teeOracleSigner, teeOracleSigner === signerAddress ? "(same as mint signer)" : "");
  console.log("");
  console.log("Backend .env for full OG flow (" + (isMainnet ? "mainnet" : "testnet") + "):");
  console.log("  AGENT_NFT_CONTRACT_ADDRESS=" + agentNFTAddress);
  console.log("  OG_RPC_URL=" + chainURL);
  console.log("  OG_STORAGE_INDEXER_URL=" + indexerURL);
  console.log("  OG_MINT_PRIVATE_KEY=<deployer key>");
  console.log("  TEE_ORACLE_PRIVATE_KEY=<same as above for " + teeOracleSigner + ">");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
