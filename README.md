# ClawCounsel

AI legal counsel agents for companies. Pay with OG on 0G Mainnet, deploy a personalized agent, upload contracts, get legal Q&A and risk monitoring via Telegram. Each agent is minted as an ERC-7857 iNFT on 0G — the company owns it on-chain.

## How It Works

1. Company pays 1 OG on 0G Mainnet → agent is deployed
2. Agent gets an auto-generated identity (codename, specialty, tone)
3. Company uploads legal docs — text extracted via `unpdf` or Claude vision for scanned PDFs
4. Agent minted as an ERC-7857 iNFT on 0G mainnet — company owns it on-chain with verifiable data
5. Connect to a Telegram group → agent ingests messages, answers legal questions, monitors risks

## Telegram Commands

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `/connect {agentId}` | Link group to an agent                     |
| `/ask {question}`    | Ask a legal question grounded in your docs |
| `/remember {info}`   | Add a fact to the knowledge base           |
| Drop a PDF           | Auto-extracts and stores the document      |

## On-Chain (0G Mainnet)

Agents are tokenized as **ERC-7857 iNFTs** on the 0G chain. Each iNFT stores hashes of the agent's data (uploaded documents, knowledge base) and uses a storage proof verifier to ensure data integrity.

| Contract                     | Address                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **AgentNFT** (ERC-7857 iNFT) | [`0x1bA49054efb6C2104fCE0a87B24239d158b4f38d`](https://chainscan.0g.ai/address/0x1bA49054efb6C2104fCE0a87B24239d158b4f38d) |
| **StorageProofVerifier**     | [`0x71011E1EF4163Bf069D542daf6D13C1A2b92C941`](https://chainscan.0g.ai/address/0x71011E1EF4163Bf069D542daf6D13C1A2b92C941) |

- **RPC:** `https://evmrpc.0g.ai`
- **Explorer:** [chainscan.0g.ai](https://chainscan.0g.ai)
- **Storage Indexer:** `https://indexer-storage-turbo.0g.ai`

### What the iNFT does

- **Mint:** When an agent is deployed, an iNFT is minted with the agent's data descriptions and content hashes
- **Transfer:** Agent ownership is transferable on-chain — verified by the StorageProofVerifier
- **Clone:** ERC-7857 supports cloning agents with verifier-backed data integrity checks
- **Data Binding:** Document hashes are stored on-chain, actual data lives on 0G storage — verifiable but private

## Payments

- **Network:** 0G Mainnet (chain ID 16661)
- **Token:** OG (native token, 1 OG per agent deployment)
- **Wallet connection:** Privy (embedded EVM wallets)

## Setup

```bash
cd frontend && pnpm install && pnpm dev
```

See `AGENTS.md` for full env vars, Telegram webhook setup, and dev guide.

## License

MIT
