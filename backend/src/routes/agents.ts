import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { agents, onboardingData } from "../db/schema";
import { eq } from "drizzle-orm";

export async function agentRoutes(fastify: FastifyInstance) {
  // List all agents with their onboarding data
  fastify.get("/agents", async () => {
    const rows = await db
      .select()
      .from(agents)
      .leftJoin(onboardingData, eq(onboardingData.agentId, agents.id));

    return {
      agents: rows.map((r) => ({
        ...r.agents,
        onboarding: r.onboarding_data ?? null,
      })),
    };
  });

  // Deploy a new OpenClaw agent instance for a company
  fastify.post("/agents", async (request, reply) => {
    const { companyName, companyId, walletAddress } = request.body as any;

    if (!companyName || !companyId) {
      return reply.code(400).send({ error: "companyName and companyId are required" });
    }

    // Check for existing agent with same companyId
    const [existing] = await db.select().from(agents).where(eq(agents.companyId, companyId));
    if (existing) {
      return reply.code(409).send({
        error: `An agent with company ID "${companyId}" already exists.`,
        agentId: existing.id,
      });
    }

    const [agent] = await db
      .insert(agents)
      .values({
        companyName,
        companyId,
        walletAddress: walletAddress || null,
        status: "pending",
      })
      .returning();

    return reply.code(201).send({ agent });
  });

  fastify.get("/agents/:id", async (request, reply) => {
    const { id } = request.params as any;
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) return reply.code(404).send({ error: "Agent not found" });
    return { agent };
  });

  // Get onboarding status
  fastify.get("/agents/:id/onboarding", async (request, reply) => {
    const { id } = request.params as any;
    const [data] = await db
      .select()
      .from(onboardingData)
      .where(eq(onboardingData.agentId, id));
    return { onboarding: data ?? null };
  });

  // Submit onboarding answers (legal claim context)
  fastify.post("/agents/:id/onboarding", async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;

    const [existing] = await db
      .select()
      .from(onboardingData)
      .where(eq(onboardingData.agentId, id));

    if (existing) {
      const [updated] = await db
        .update(onboardingData)
        .set({ ...body, updatedAt: new Date() } as any)
        .where(eq(onboardingData.agentId, id))
        .returning();
      return { onboarding: updated };
    }

    const [created] = await db
      .insert(onboardingData)
      .values({ agentId: id, ...body })
      .returning();

    return reply.code(201).send({ onboarding: created });
  });
}
