/**
 * Mainnet-only deploy: real 0G flow (StorageProofVerifier + AgentNFT).
 * Mint: encrypt → 0G Storage → sign rootHash (EIP-191) → mint.
 * Transfer/clone: TEE attestation required (proof = ..., signature from teeOracleSigner).
 *
 * Uses 0G mainnet RPC and indexer only. For testnet use deploy.js with --network og-testnet.
 * teeOracleSigner = signer by default. Set TEE_ORACLE_SIGNER=0x... for a different TEE signer.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-real.js --network og-mainnet
 */
const { ethers } = require("hardhat");

const OG_MAINNET_CHAIN_ID = 16661;
const MAINNET = {
  rpc: "https://evmrpc.0g.ai",
  indexer: "https://indexer-storage.0g.ai",
};

async function main() {
  const network = await ethers.provider.getNetwork();
  if (Number(network.chainId) !== OG_MAINNET_CHAIN_ID) {
    throw new Error(
      `This script is for 0G mainnet only (chainId ${OG_MAINNET_CHAIN_ID}). ` +
        `Current chainId: ${network.chainId}. Use deploy.js with --network og-testnet for testnet.`
    );
  }

  const [deployer] = await ethers.getSigners();
  const signerAddress = deployer.address;
  const balance = await ethers.provider.getBalance(signerAddress);
  if (balance === 0n) {
    throw new Error(
      `Deployer ${signerAddress} has zero balance on 0G mainnet. ` +
        "Fund this wallet with native 0G tokens for gas (e.g. from faucet or bridge) then run again."
    );
  }
  console.log(
    "Deploying real 0G flow (StorageProofVerifier + AgentNFT) to MAINNET with account:",
    signerAddress,
    "balance:",
    ethers.formatEther(balance),
    "0G"
  );

  const teeOracleSigner = process.env.TEE_ORACLE_SIGNER || signerAddress;
  const StorageVerifier = await ethers.getContractFactory("StorageProofVerifier");
  const verifier = await StorageVerifier.deploy(signerAddress, teeOracleSigner);
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  const chainURL = process.env.OG_MAINNET_RPC_URL  || MAINNET.rpc;
  const indexerURL = process.env.OG_MAINNET_INDEXER_URL || MAINNET.indexer;

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
  console.log("Backend .env for full OG flow (mainnet):");
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
