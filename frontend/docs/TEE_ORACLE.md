# TEE Oracle for ERC-7857 Transfer/Clone

Transfer and clone proofs can be attested by a **TEE (Trusted Execution Environment) oracle** so the contract only accepts signatures from a known signer instead of mock “always valid” proofs.

## Contract

- **StorageProofVerifier** now takes two constructor args: `(signer, teeOracleSigner)`.
  - `signer`: used for mint (EIP-191 over rootHash).
  - `teeOracleSigner`: used for transfer/clone. If `address(0)`, mock behavior (no signature check). If set, each transfer/clone proof must be `abi.encode(oldDataHash, newDataHash, receiver, sealedKey, signature)` with `signature` from this signer.
- Message signed by TEE: EIP-191 over `keccak256(abi.encode(oldDataHash, newDataHash, receiver, sealedKey))`.

## Deploy

**Full OG flow (default):** `deploy-real.js` uses `teeOracleSigner = signer` (deployer address) so mint and transfer/clone both use the same key. One key in backend does both.

```bash
npx hardhat run scripts/deploy-real.js --network og-testnet
```

Then in **frontend/.env** set `TEE_ORACLE_PRIVATE_KEY` to the same private key as the deployer (and `OG_MINT_PRIVATE_KEY`).

To deploy with mock transfer/clone only (no TEE attestation), set `DISABLE_TEE_ORACLE=1`. To use a different address for the TEE oracle, set `TEE_ORACLE_SIGNER=0x...`.

## Backend (this repo)

- **API** `POST /api/inft/tee-attest`: body `{ oldDataHash, newDataHash, receiver, sealedKey }` (hex). Returns `{ signature }` using `TEE_ORACLE_PRIVATE_KEY`. Returns 501 if key not set.
- **Frontend**: transfer/clone use only `buildTeeTransferProofs()` (OG flow). If the API is unavailable (501), the UI shows an error; no mock fallback.

## Env

- **frontend/.env**: `TEE_ORACLE_PRIVATE_KEY` — private key whose address was set as `TEE_ORACLE_SIGNER` at deploy. Keep this key only in a TEE in production.

## Running the oracle in a real TEE

For production you should run the attestation logic inside a TEE (e.g. AWS Nitro Enclave, Intel SGX):

1. Deploy a verifier with `teeOracleSigner` = address of a key that **only ever exists inside the TEE**.
2. Run a small service in the TEE that:
   - Optionally: fetches data from 0G by `oldDataHash`, decrypts, re-encrypts for the receiver, produces real `newDataHash` and `sealedKey` (per [0G ERC-7857](https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857)).
   - Signs `keccak256(abi.encode(oldDataHash, newDataHash, receiver, sealedKey))` with EIP-191 and returns the signature.
3. Expose that service as your `/api/inft/tee-attest` (or point the frontend to the TEE endpoint). The contract already verifies the signer; moving the key into a TEE gives you attestation and key isolation.
