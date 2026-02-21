---
name: legal-analysis
description: Analyze legal documents for key terms, obligations, risks, and actionable insights. Use when the user asks about contracts, agreements, or legal documents.
---

When analyzing a legal document:

1. **Read the document** from the `documents/` directory using the `read` tool
2. **Identify key elements:**
   - Parties involved
   - Effective date and term/duration
   - Payment terms and amounts
   - Obligations of each party
   - Termination clauses
   - Limitation of liability
   - Indemnification provisions
   - Confidentiality/NDA terms
   - Governing law and dispute resolution
3. **Flag risks:**
   - Unfavorable terms or one-sided clauses
   - Missing standard protections
   - Ambiguous language that could be exploited
   - Upcoming deadlines or renewal dates
4. **Summarize** in plain language with severity ratings

Output format:
- Start with a one-line summary
- List key terms as bullet points
- Highlight risks with severity: [LOW] [MEDIUM] [HIGH] [CRITICAL]
- End with recommended actions
