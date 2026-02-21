# Verify AgentNFT on 0G Explorer

## Fix: "Contract not found in compiler output"

The flattened file contains **many** contracts (interfaces, libraries, AgentNFT). You must tell the explorer **which one** is at your deployed address.

## Fix: "bytecode_length_mismatch"

The recompiled bytecode must match the chain exactly. Hardhat builds with **EVM version Paris** and **optimizer 200 runs**. The explorer must use the same.

### On the verification form

1. **Contract address** — Your deployed AgentNFT address.

2. **Compiler type** — `Solidity (Single file)`.

3. **Compiler version** — **`v0.8.19`** (exact; if there are multiple 0.8.19 builds, try the default/first one).

4. **EVM version** — **`paris`** (or **Paris**).  
   If the explorer has an "EVM Version" or "EVM target" field, set it to **paris**. Using Shanghai/Cancun/other produces different bytecode and causes bytecode_length_mismatch.  
   If there is no EVM field, try "Standard-Json-Input" verification and set `evmVersion: "paris"` in the JSON, or contact 0G support for which EVM version their verifier uses.

5. **Open Source License** — `MIT`.

6. **Contract Name** — Type exactly: **`AgentNFT`**  
   This is the contract at line 1061 in the flattened file. If there is a dropdown "Please Select", choose **AgentNFT**. Do not use a path like `AgentNFT.sol:AgentNFT` for single-file verification.

7. **Optimization** — **Yes**. **Runs: 200** (must match `hardhat.config.js`).

8. **Contract Library Address** — **Leave all empty.**  
   AgentNFT does not use externally deployed libraries (Strings, Math, AccessControl are in the same flattened file). Leaving this blank avoids "contract_not_found_in_compiler_output".

9. **Constructor arguments (ABI-encoded)** — If the form asks for this, use the script below to generate them.

### Constructor arguments (if required)

From project root:

```bash
cd contract && node scripts/constructor-args.js
```

Paste the output into the "Constructor Arguments ABI-encoded" field.

### Links

- Mainnet: https://explorer.0g.ai/mainnet/verify-contract  
- Testnet: use the testnet verify page if you deployed on testnet.
