import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, onboardingData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAgentIdentity } from "@/lib/services/identity";
import { verifyAgentOwnership } from "@/lib/verify-ownership";
import { resolve } from "path";
import { writeFile, mkdir } from "fs/promises";

const WORKSPACE_DIR =
  process.env.OPENCLAW_WORKSPACE ??
  resolve(process.cwd(), "../openclaw/workspace");

async function writeCompanyContext(agentId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId));
  const [data] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, agentId));
  if (!agent) return;

  const lines = [
    "# Company Context",
    "",
    `**Company:** ${agent.companyName}`,
    `**ID:** ${agent.companyId}`,
    `**Agent ID:** ${agent.id}`,
    "",
  ];

  if (agent.agentCodename) {
    lines.push(
      "## Agent Identity",
      "",
      `**Codename:** ${agent.agentCodename}`,
      `**Specialty:** ${agent.agentSpecialty ?? "General legal counsel"}`,
      `**Tone:** ${agent.agentTone ?? "direct, concise"}`,
      `**Tagline:** ${agent.agentTagline ?? ""}`,
      "",
      "Adopt this codename as your name when responding. Match the specified tone in all communications.",
      "",
    );
  }

  if (data) {
    lines.push("## Company Details", "");
    if (data.industry) lines.push(`**Industry:** ${data.industry}`);
    if (data.documentTypes)
      lines.push(`**Document Types:** ${data.documentTypes}`);
    if (data.legalConcerns)
      lines.push(`**Legal Concerns:** ${data.legalConcerns}`);
    if (data.activeContracts)
      lines.push(`**Active Contracts:** ${data.activeContracts}`);
    if (data.monitoringPriorities)
      lines.push(`**Monitoring Priorities:** ${data.monitoringPriorities}`);
  }

  await mkdir(WORKSPACE_DIR, { recursive: true });
  await writeFile(
    resolve(WORKSPACE_DIR, "COMPANY_CONTEXT.md"),
    lines.join("\n"),
    "utf-8",
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [data] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, id));
  return NextResponse.json({ onboarding: data ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const check = await verifyAgentOwnership(req, id);
  if (!check.authorized) return check.response;

  const body = await req.json();

  const [existing] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, id));

  let result;
  if (existing) {
    const [updated] = await db
      .update(onboardingData)
      .set(body)
      .where(eq(onboardingData.agentId, id))
      .returning();
    result = updated;
  } else {
    const [created] = await db
      .insert(onboardingData)
      .values({ agentId: id, ...body })
      .returning();
    result = created;
  }

  const [agentRow] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id));
  if (agentRow && !agentRow.agentCodename) {
    try {
      const identity = await generateAgentIdentity(
        agentRow.companyName,
        result,
      );
      await db
        .update(agents)
        .set({
          agentCodename: identity.codename,
          agentSpecialty: identity.specialty,
          agentTone: identity.tone,
          agentTagline: identity.tagline,
        })
        .where(eq(agents.id, id));
    } catch (e) {
      console.error("[agents] identity generation failed:", e);
    }
  }

  await writeCompanyContext(id).catch((e) =>
    console.error("[agents] failed to write COMPANY_CONTEXT.md:", e),
  );

  const [updatedAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id));

  return NextResponse.json(
    { onboarding: result, agent: updatedAgent ?? null },
    { status: existing ? 200 : 201 },
  );
}
