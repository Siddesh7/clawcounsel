import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { conversations, onboardingData, alerts, agents } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { retrieveContext } from "./ingestion";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are OpenClaw, an AI legal counsel agent embedded in a company's Telegram workspace.

Your role:
- Answer legal questions about the company's contracts, policies, and obligations
- Monitor for legal risks: overdue payments, contract breaches, IP issues, vendor problems
- Be precise and cite specific evidence from company data when available
- Flag urgent issues clearly with severity levels
- You learn from everything the team discusses in the Telegram group

Guidelines:
- Always ground answers in the actual company data provided as context
- If you find a legal risk, state it clearly: what it is, severity, recommended action
- For questions you cannot answer from available data, say so honestly
- Keep responses concise and actionable
- Use the company's legal claim context (opposing party, claim type) to frame your analysis
- Format responses for Telegram (plain text, avoid markdown tables)`;

export async function askAgent(
  agentId: string,
  userId: string,
  chatId: string,
  question: string
): Promise<string> {
  // 1. Load claim context
  const [claim] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));

  // 2. Retrieve relevant knowledge
  const context = await retrieveContext(agentId, question);

  // 3. Recent conversation history
  const history = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agentId))
    .orderBy(desc(conversations.createdAt))
    .limit(10);

  const recentMessages = history.reverse().map((c) => ({
    role: c.role as "user" | "assistant",
    content: c.content,
  }));

  const claimBlock = claim
    ? `\n## Company Legal Claim\n- Claim: ${claim.claimDescription ?? "—"}\n- Type: ${claim.claimType ?? "—"}\n- Opposing party: ${claim.opposingParty ?? "—"}\n- Evidence: ${claim.evidenceDescription ?? "—"}\n`
    : "";

  const contextBlock = context
    ? `\n## Relevant Company Communications\n${context}\n`
    : "\n## Company Communications\n(No data indexed yet — messages will appear here as the team chats.)\n";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT + claimBlock + contextBlock,
    messages: [
      ...recentMessages,
      { role: "user", content: question },
    ],
  });

  const answer =
    response.content[0].type === "text" ? response.content[0].text : "No response.";

  // Persist conversation
  await db.insert(conversations).values([
    { agentId, chatId, userId, role: "user",      content: question },
    { agentId, chatId, userId, role: "assistant", content: answer },
  ]);

  return answer;
}

// Scan knowledge base and generate legal risk alerts
export async function runMonitoringSweep(agentId: string): Promise<void> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return;

  const [claim] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));

  const context = await retrieveContext(
    agentId,
    "payment invoice overdue contract deadline vendor breach copyright policy violation",
    40
  );

  if (!context) return;

  const prompt = `Analyze the following company communications for legal risks.

Company: ${agent.companyName}
${claim ? `Legal focus: ${claim.claimType} — ${claim.claimDescription}` : ""}

## Data
${context}

Identify risks: overdue payments, contract breaches, vendor SLA violations, IP/copyright issues, regulatory deadlines, policy violations.

Respond ONLY with a JSON array:
[{ "type": "payment_overdue|vendor_breach|copyright_infringement|deadline|policy_violation|other", "title": "...", "description": "...", "severity": "low|medium|high|critical" }]

Empty array if none found: []`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";

  let risks: Array<{ type: string; title: string; description: string; severity: string }> = [];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) risks = JSON.parse(match[0]);
  } catch {
    return;
  }

  for (const risk of risks) {
    await db.insert(alerts).values({
      agentId,
      type:        risk.type,
      title:       risk.title,
      description: risk.description,
      severity:    risk.severity,
    });
  }

  if (risks.length > 0) {
    console.log(`[monitoring] agent ${agentId}: ${risks.length} new risks`);
  }
}
