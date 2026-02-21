import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "child_process";
import { db } from "@/lib/db";
import { conversations, onboardingData, alerts, agents, kiteTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { retrieveContext, retrieveDocumentContext, listDocuments } from "./ingestion";
import { getAgentKiteAddress, recordQueryOnChain } from "./kite";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OPENCLAW_TIMEOUT = Number(process.env.OPENCLAW_TIMEOUT ?? 120);

function runOpenClaw(
  message: string,
  sessionId: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const proc = spawn("openclaw", [
        "agent",
        "--local",
        "--message",
        message,
        "--session-id",
        sessionId,
        "--thinking",
        "low",
        "--timeout",
        String(OPENCLAW_TIMEOUT),
      ], {
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      proc.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
      proc.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        resolve(null);
      }, (OPENCLAW_TIMEOUT + 10) * 1000);

      proc.on("close", (exitCode) => {
        clearTimeout(timeout);

        if (exitCode !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString().slice(0, 500);
          console.error("[openclaw] non-zero exit:", exitCode, stderr);
          resolve(null);
          return;
        }

        const text = Buffer.concat(stdoutChunks).toString().trim();
        if (!text) { resolve(null); return; }

        const lines = text.split("\n");
        const responseLines = lines.filter(
          (l) =>
            !l.startsWith("🦞") &&
            !l.startsWith("Usage:") &&
            !l.match(/^OpenClaw \d/),
        );

        resolve(responseLines.join("\n").trim() || null);
      });

      proc.on("error", (err) => {
        clearTimeout(timeout);
        console.error("[openclaw] spawn error:", err);
        resolve(null);
      });
    } catch (error) {
      console.error("[openclaw] spawn error:", error);
      resolve(null);
    }
  });
}

export async function askAgent(
  agentId: string,
  userId: string,
  chatId: string,
  question: string,
): Promise<string> {
  const [claim] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId));

  const docs = await listDocuments(agentId);
  const docContext = await retrieveDocumentContext(agentId, question);

  let contextPrefix = "";
  if (agent) {
    contextPrefix += `Company: ${agent.companyName}\n`;
    if (agent.agentCodename) {
      contextPrefix += `You are: ${agent.agentCodename}\n`;
      contextPrefix += `Tone: ${agent.agentTone ?? "direct, concise"}\n`;
      contextPrefix += `Specialty: ${agent.agentSpecialty ?? ""}\n`;
      if (agent.agentTagline) contextPrefix += `Tagline: "${agent.agentTagline}"\n`;
    }
  }
  if (claim) {
    contextPrefix += "\nCOMPANY PROFILE:\n";
    if (claim.industry) contextPrefix += `- Industry: ${claim.industry}\n`;
    if (claim.legalConcerns) contextPrefix += `- Legal concerns: ${claim.legalConcerns}\n`;
    if (claim.documentTypes) contextPrefix += `- Document types: ${claim.documentTypes}\n`;
    if (claim.activeContracts) contextPrefix += `- Active contracts: ${claim.activeContracts}\n`;
    if (claim.monitoringPriorities) contextPrefix += `- Monitoring priorities: ${claim.monitoringPriorities}\n`;
  }

  if (docs.length > 0) {
    contextPrefix += `\nAVAILABLE DOCUMENTS (${docs.length}):\n`;
    for (const doc of docs) {
      contextPrefix += `- ${doc.name}\n`;
    }
    contextPrefix += "\nUse the read tool on files in documents/ for full content. Relevant excerpts below.\n";
  }

  let fullMessage = `[Company Context]\n${contextPrefix}`;
  if (docContext) {
    fullMessage += `\n[Relevant Document Excerpts]\n${docContext}\n`;
  }
  fullMessage += `\n[Question from @${userId}]\n${question}`;
  fullMessage += `\n\nRULES: Max 8 lines. Cite specific doc names + sections. No generic advice. One follow-up question.`;

  const openclawResponse = await runOpenClaw(fullMessage, agentId);

  if (openclawResponse) {
    await db.insert(conversations).values([
      { agentId, chatId, userId, role: "user", content: question },
      { agentId, chatId, userId, role: "assistant", content: openclawResponse },
    ]);
    recordKiteActivity(agentId, agent).catch(() => {});
    return openclawResponse;
  }

  console.log("[agent] openclaw unavailable, using Anthropic SDK fallback");
  const fallbackResponse = await askAgentFallback(agentId, userId, chatId, question, docContext);
  recordKiteActivity(agentId, agent).catch(() => {});
  return fallbackResponse;
}

async function recordKiteActivity(
  agentId: string,
  agent: { kiteWalletAddress: string | null; kiteQueryCount: number | null },
): Promise<void> {
  const kiteAddress = agent.kiteWalletAddress ?? getAgentKiteAddress(agentId);
  const newCount = (agent.kiteQueryCount ?? 0) + 1;

  await db.update(agents).set({
    kiteWalletAddress: kiteAddress,
    kiteQueryCount: newCount,
  }).where(eq(agents.id, agentId));

  const txHash = await recordQueryOnChain(kiteAddress);
  if (txHash) {
    await db.insert(kiteTransactions).values({
      agentId,
      txHash,
      direction: "outbound",
      amount: "0.0001",
      chainId: 2368,
    });
    console.log(`[kite] agent ${agentId} query #${newCount} recorded: ${txHash}`);
  }
}

async function askAgentFallback(
  agentId: string,
  userId: string,
  chatId: string,
  question: string,
  preloadedDocContext?: string,
): Promise<string> {
  const [onboarding] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId));

  const chatContext = await retrieveContext(agentId, question);
  const docContext = preloadedDocContext ?? await retrieveDocumentContext(agentId, question);

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

  const agentName = agent?.agentCodename ?? "ClawCounsel";
  const tagline = agent?.agentTagline ? ` "${agent.agentTagline}"` : "";
  const companyName = agent?.companyName ?? "the company";

  const systemPrompt = `You are *${agentName}*, the dedicated AI legal counsel for *${companyName}*.${tagline}
${agent?.agentTone ? `Communication style: ${agent.agentTone}` : ""}
${agent?.agentSpecialty ? `Your specialty: ${agent.agentSpecialty}` : ""}

COMPANY PROFILE:
${onboarding ? `- Industry: ${onboarding.industry ?? "not specified"}
- Legal concerns: ${onboarding.legalConcerns ?? "general"}
- Document types: ${onboarding.documentTypes ?? "various"}
- Active contracts: ${onboarding.activeContracts ?? "unknown"}
- Monitoring: ${onboarding.monitoringPriorities ?? "general"}` : "(No onboarding data)"}

RESPONSE RULES:
1. MAX 8 LINES. This is a hard limit. No exceptions. No preamble, no filler.
2. Answer ONLY from ${companyName}'s documents. Cite the doc name + section.
3. If you don't have the data, say "I don't have that document" in one line.
4. No generic advice. No "typically", "generally", "in most cases". Only cite what's in their docs.
5. One follow-up question at the end, max one line.

TELEGRAM FORMATTING:
- No # headers, no tables, no ---
- *bold* for key terms, _italic_ for doc names
- Short bullet points, not paragraphs`;

  let dataBlock = "";

  if (docContext) {
    dataBlock += `\n\nCOMPANY DOCUMENTS (excerpts relevant to the question):\n${docContext}`;
  }
  if (chatContext) {
    dataBlock += `\n\nRECENT COMMUNICATIONS:\n${chatContext}`;
  }
  if (!docContext && !chatContext) {
    dataBlock += "\n\n(No company documents or communications indexed yet. Tell the user to upload documents for personalized legal counsel.)";
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt + dataBlock,
    messages: [...recentMessages, { role: "user", content: question }],
  });

  const answer =
    response.content[0].type === "text" ? response.content[0].text : "No response.";

  await db.insert(conversations).values([
    { agentId, chatId, userId, role: "user", content: question },
    { agentId, chatId, userId, role: "assistant", content: answer },
  ]);

  return answer;
}

export async function runMonitoringSweep(agentId: string): Promise<void> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return;

  const [claim] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));

  const prompt = `Run a monitoring sweep for ${agent.companyName}.
${claim ? `Legal focus: ${claim.legalConcerns ?? "general"} | Industry: ${claim.industry ?? "unknown"}` : ""}

Read all documents in the documents/ directory. Check COMPANY_CONTEXT.md for company context.

Identify risks: overdue payments, contract breaches, vendor SLA violations, IP/copyright issues, regulatory deadlines, policy violations.

Respond ONLY with a JSON array (no other text):
[{ "type": "payment_overdue|vendor_breach|copyright_infringement|deadline|policy_violation|other", "title": "...", "description": "...", "severity": "low|medium|high|critical" }]

Empty array if none found: []`;

  const openclawResponse = await runOpenClaw(prompt, `${agentId}-monitor`);
  const responseText =
    openclawResponse ?? (await runMonitoringFallback(agentId, agent, claim));

  if (!responseText) return;

  let risks: Array<{
    type: string;
    title: string;
    description: string;
    severity: string;
  }> = [];
  try {
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) risks = JSON.parse(match[0]);
  } catch {
    return;
  }

  for (const risk of risks) {
    await db.insert(alerts).values({
      agentId,
      type: risk.type,
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
    });
  }

  if (risks.length > 0) {
    console.log(`[monitoring] agent ${agentId}: ${risks.length} new risks`);
  }
}

async function runMonitoringFallback(
  agentId: string,
  agent: { companyName: string },
  claim: { legalConcerns: string | null; industry: string | null } | undefined,
): Promise<string | null> {
  const context = await retrieveContext(
    agentId,
    "payment invoice overdue contract deadline vendor breach copyright policy violation",
    40,
  );

  if (!context) return null;

  const prompt = `Analyze the following company communications for legal risks.

Company: ${agent.companyName}
${claim ? `Legal focus: ${claim.legalConcerns ?? "general"} | Industry: ${claim.industry ?? "unknown"}` : ""}

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

  return response.content[0].type === "text" ? response.content[0].text : null;
}
