---
name: contract-monitor
description: Monitor company documents and communications for legal risks including overdue payments, contract breaches, vendor SLA violations, and approaching deadlines.
---

When running a monitoring sweep:

1. **Read all documents** in the `documents/` directory
2. **Read company context** from `COMPANY_CONTEXT.md`
3. **Check for these risk categories:**

   - **Payment Overdue**: Look for Net-30/60/90 terms where dates have passed. Check for payment schedules with missed dates.
   - **Vendor Breach**: SLA commitments not met, service level guarantees violated, deliverable deadlines missed.
   - **Contract Expiry**: Agreements expiring within 30 days, auto-renewal clauses approaching opt-out deadlines.
   - **IP/Copyright Risk**: Unlicensed usage references, open-source license violations, trademark concerns.
   - **Compliance Deadlines**: Regulatory filing dates, audit requirements, certification renewals.
   - **Policy Violations**: Internal policy breaches referenced in communications.

4. **Output each risk as:**
   ```
   Type: payment_overdue | vendor_breach | copyright_infringement | deadline | policy_violation | contract_expiry
   Title: Brief description
   Description: Details with evidence
   Severity: low | medium | high | critical
   ```

5. If no risks are found, explicitly state that.

When analyzing Telegram messages for risks, look for:
- Mentions of late payments or invoices
- Complaints about vendor services
- References to contract disputes
- Deadline pressures or missed milestones
