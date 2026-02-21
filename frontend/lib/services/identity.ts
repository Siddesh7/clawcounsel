import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type AgentIdentity = {
  codename: string;
  specialty: string;
  tone: string;
  tagline: string;
};

export async function generateAgentIdentity(
  companyName: string,
  onboarding: {
    industry?: string | null;
    documentTypes?: string | null;
    legalConcerns?: string | null;
    activeContracts?: string | null;
    monitoringPriorities?: string | null;
  },
): Promise<AgentIdentity> {
  const prompt = `Generate a unique identity for an AI legal counsel agent deployed for a company.

Company: ${companyName}
Industry: ${onboarding.industry ?? "unknown"}
Document types: ${onboarding.documentTypes ?? "unknown"}
Legal concerns: ${onboarding.legalConcerns ?? "general"}
Active contracts: ${onboarding.activeContracts ?? "unknown"}
Monitoring priorities: ${onboarding.monitoringPriorities ?? "general"}

Return a JSON object with exactly these fields:
- "codename": A single uppercase word (5-8 chars) that feels thematic to their industry/concerns. Examples: SENTINEL, AEGIS, VIGIL, VAULT, ARGUS, BASTION, CIPHER, NEXUS, ARBITER, ORACLE, WARDEN, SHIELD, SPECTRE, TITAN.
- "specialty": One concise sentence describing what this agent specializes in for this company.
- "tone": A comma-separated list of 2-3 communication style words (e.g. "direct, concise" or "formal, thorough" or "technical, precise").
- "tagline": A short punchy line (under 60 chars) that captures what this agent does. Written from the agent's perspective.

Respond with ONLY the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const parsed = JSON.parse(match[0]) as AgentIdentity;

    return {
      codename: (parsed.codename ?? "COUNSEL").toUpperCase().slice(0, 12),
      specialty: parsed.specialty ?? "General legal counsel",
      tone: parsed.tone ?? "direct, concise",
      tagline: parsed.tagline ?? "Your legal watchdog.",
    };
  } catch (error) {
    console.error("[identity] generation failed, using defaults:", error);
    return {
      codename: "COUNSEL",
      specialty: `Legal counsel for ${companyName}`,
      tone: "direct, concise",
      tagline: "Always watching. Always ready.",
    };
  }
}
