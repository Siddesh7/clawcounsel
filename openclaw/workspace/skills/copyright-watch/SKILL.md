---
name: copyright-watch
description: Check GitHub and the web for potential copyright or IP infringement against the company's work. Use web_search and web_fetch tools.
---

When checking for copyright infringement:

1. **Read company context** from `COMPANY_CONTEXT.md` for the company name, industry, and known IP
2. **Search GitHub** using web_search:
   - Search for code snippets, project names, or unique identifiers from the company's codebase
   - Look for unauthorized forks or copies of proprietary repositories
   - Check if opposing parties (from company context) have published similar code
3. **Search the web** for:
   - Unauthorized use of company trademarks or brand names
   - Copied content from company websites or documentation
   - Potential patent-related concerns
4. **Analyze findings:**
   - Compare discovered code/content against known company IP
   - Assess likelihood of actual infringement vs coincidence
   - Rate severity based on commercial impact
5. **Report format:**
   - Source URL
   - What was found
   - How it relates to the company's IP
   - Severity assessment
   - Recommended action (DMCA, cease and desist, further investigation)
