import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "child_process";
import { db } from "@/lib/db";
import { conversations, onboardingData, alerts, agents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { retrieveContext } from "./ingestion";

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

  let contextPrefix = "";
  if (agent) {
    contextPrefix += `Company: ${agent.companyName}\n`;
    if (agent.agentCodename) {
      contextPrefix += `Agent: ${agent.agentCodename} (${agent.agentTone ?? "direct, concise"})\n`;
      contextPrefix += `Specialty: ${agent.agentSpecialty ?? ""}\n`;
    }
  }
  if (claim) {
    if (claim.legalConcerns) contextPrefix += `Focus: ${claim.legalConcerns}\n`;
    if (claim.industry) contextPrefix += `Industry: ${claim.industry}\n`;
  }

  const fullMessage = contextPrefix
    ? `[Company Context]\n${contextPrefix}\n[Question from @${userId}]\n${question}`
    : question;

  const openclawResponse = await runOpenClaw(fullMessage, agentId);

  if (openclawResponse) {
    await db.insert(conversations).values([
      { agentId, chatId, userId, role: "user", content: question },
      { agentId, chatId, userId, role: "assistant", content: openclawResponse },
    ]);
    return openclawResponse;
  }

  console.log("[agent] OpenClaw unavailable, using Anthropic SDK fallback");
  return askAgentFallback(agentId, userId, chatId, question);
}

async function askAgentFallback(
  agentId: string,
  userId: string,
  chatId: string,
  question: string,
): Promise<string> {
  const [onboarding] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId));

  const context = await retrieveContext(agentId, question);

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

  let identityBlock = "";
  if (agent?.agentCodename) {
    identityBlock = `\n## Your Identity\nCodename: ${agent.agentCodename}\nSpecialty: ${agent.agentSpecialty ?? ""}\nTone: ${agent.agentTone ?? "direct, concise"}\nAdopt this codename as your name and match this tone.\n`;
  }

  const onboardingBlock = onboarding
    ? `\n## Company Context\n- Industry: ${onboarding.industry ?? "—"}\n- Legal Concerns: ${onboarding.legalConcerns ?? "—"}\n- Document Types: ${onboarding.documentTypes ?? "—"}\n- Monitoring: ${onboarding.monitoringPriorities ?? "—"}\n`
    : "";

  const contextBlock = context
    ? `\n## Company Data\n${context}\n`
    : "\n## Company Data\n(No data indexed yet.)\n";

  const agentName = agent?.agentCodename ?? "OpenClaw";
  const systemPrompt = `You are ${agentName}, an AI legal counsel agent. Answer legal questions grounded in the company's data. Be precise, cite evidence, flag risks with severity levels. Format for Telegram (plain text).`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt + identityBlock + onboardingBlock + contextBlock,
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
