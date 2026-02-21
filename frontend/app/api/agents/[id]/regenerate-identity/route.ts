import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, onboardingData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateAgentIdentity } from "@/lib/services/identity";
import { verifyAgentOwnership } from "@/lib/verify-ownership";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const check = await verifyAgentOwnership(req, id);
  if (!check.authorized) return check.response;

  const [data] = await db
    .select()
    .from(onboardingData)
    .where(eq(onboardingData.agentId, id));

  const identity = await generateAgentIdentity(check.agent.companyName, data);

  const [updated] = await db
    .update(agents)
    .set({
      agentCodename: identity.codename,
      agentSpecialty: identity.specialty,
      agentTone: identity.tone,
      agentTagline: identity.tagline,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return NextResponse.json({ agent: updated });
}
