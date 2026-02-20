import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { agentRoutes } from "./src/routes/agents";
import { telegramRoutes } from "./src/routes/telegram";
import { documentRoutes } from "./src/routes/documents";

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
});

await fastify.register(agentRoutes, { prefix: "/api" });
await fastify.register(telegramRoutes, { prefix: "/api" });
await fastify.register(documentRoutes, { prefix: "/api" });

fastify.get("/health", async () => ({ status: "ok" }));

try {
  await fastify.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
