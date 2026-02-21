# LIABILITY POLICY
**Kite AI — Legal & Compliance**
Version 1.4 | Effective: December 2025

---

## Section 1 — Scope

This policy defines Kite AI's liability framework with respect to smart contract vulnerabilities, protocol failures, and user fund losses. It applies to all products and services deployed under the Kite AI brand.

---

## Section 2 — General Liability Principles

### 2.1 Protocol-Level Disclaimer
Kite AI operates non-custodial infrastructure. The protocol does not hold, control, or insure user funds at any point. Users interact with autonomous smart contracts at their own risk.

### 2.2 Immutability Risk Acknowledgment
Blockchain transactions are irreversible. Kite AI cannot reverse, cancel, or recover transactions executed on-chain, including those resulting from user error or contract exploitation.

### 2.3 Open Source Disclosure
Core Kite AI contracts are open source (MIT License). The availability of source code constitutes full disclosure. Users are expected to review contract code before interacting with the protocol.

---

## Section 3 — Unaudited Code Exposure

### 3.1 Liability for Unaudited Deployments

Kite AI's liability exposure is significantly elevated when smart contracts are deployed to any environment — including testnet — without a completed security audit. The following conditions apply:

**3.1.1 Internal Accountability**
Engineering teams that deploy unaudited contracts to testnet bear internal responsibility for any reputational damage caused by public disclosure of vulnerabilities, even where no monetary loss occurs. A post-mortem is mandatory for any testnet exploit affecting more than 10 user accounts.

**3.1.2 Third-Party Integrator Risk**
If a third-party integrator deploys Kite AI contracts without audit and a vulnerability causes user fund loss, Kite AI is not liable provided:
- The integrator was notified of audit requirements in writing
- Kite AI's Terms of Service were agreed to at integration time
- The integrator did not receive written approval from Kite AI to skip auditing

**3.1.3 User-Facing Disclosure Requirement**
Where unaudited contracts are deployed in any user-accessible environment, the following disclosure must be presented before user interaction:

> *"WARNING: This contract has not been audited by an independent security firm. Interaction carries significant risk of fund loss. Proceed only if you understand and accept this risk."*

Failure to display this disclosure creates a negligent misrepresentation exposure for Kite AI under applicable consumer protection law.

**3.1.4 Insurance Implications**
Kite AI's smart contract coverage policy (Policy No. KC-2024-0091) explicitly excludes coverage for losses arising from contracts deployed without audit. Any claim resulting from an unaudited deployment will be denied by the insurer and borne entirely by the responsible team or integrator.

### 3.2 Graduated Risk Framework

| Deployment State | User Funds Allowed | Liability Coverage | Audit Required |
|---|---|---|---|
| Testnet, unaudited | Testnet tokens only | None | No |
| Testnet, audited | Testnet tokens only | Partial (reputational) | Recommended |
| Mainnet, unaudited | Prohibited | None — policy void | Yes |
| Mainnet, audited | Yes | Full policy coverage | Yes |

### 3.3 Bug Bounty Safe Harbor
Security researchers who responsibly disclose vulnerabilities in unaudited contracts via security@kiteai.xyz are granted safe harbor from legal action, provided disclosure is made before public release and no funds are extracted.

---

## Section 4 — Incident Response Liability

### 4.1 Response Obligations
Upon discovering a vulnerability — audited or not — Kite AI is obligated to:
1. Pause affected contracts within 15 minutes (P0 incidents)
2. Notify affected users within 4 hours via official channels
3. Publish a post-mortem within 7 days

Failure to execute timely pause in a P0 incident may constitute negligence under applicable law and increase Kite AI's damages exposure.

### 4.2 Compensation Framework
Kite AI maintains a discretionary compensation fund for verified losses caused by protocol bugs in audited contracts. This fund does not apply to:
- Losses from unaudited contracts (see 3.1.4)
- Losses caused by user error
- Losses caused by third-party integrator modifications

---

## Section 5 — Governing Law

This policy is governed by the laws of the Cayman Islands. Any disputes arising from liability claims shall be resolved by binding arbitration under LCIA rules.

*Approved by: Kite AI General Counsel | February 2026*
