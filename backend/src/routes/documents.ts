import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { documents } from "../db/schema";
import { eq } from "drizzle-orm";

export async function documentRoutes(fastify: FastifyInstance) {
  // List documents for an agent
  fastify.get("/agents/:agentId/documents", async (request) => {
    const { agentId } = request.params as any;
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.agentId, agentId));
    return { documents: docs };
  });

  // Upload a document (PDF text, GitHub repo URL, plain text)
  fastify.post("/agents/:agentId/documents", async (request, reply) => {
    const { agentId } = request.params as any;
    const { name, type, content, metadata } = request.body as any;

    const [doc] = await db
      .insert(documents)
      .values({ agentId, name, type, content, metadata })
      .returning();

    // TODO: Trigger document ingestion pipeline (chunking, embedding, storage)
    return reply.code(201).send({ document: doc });
  });
}
