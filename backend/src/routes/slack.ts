import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { agents } from "../db/schema";
import { eq } from "drizzle-orm";

// Onboarding questions OpenClaw asks via Slack
const ONBOARDING_QUESTIONS = [
  "What is your company's primary legal claim or concern? (e.g. copyright infringement, contract breach, IP theft)",
  "Who is the opposing party? (company name or individual)",
  "Do you have a GitHub username for the opposing party? (optional)",
  "Describe the key evidence you have to support your claim.",
  "What type of legal protection or action are you seeking?",
];

export async function slackRoutes(fastify: FastifyInstance) {
  // OAuth callback from Slack
  fastify.get("/slack/oauth/callback", async (request, reply) => {
    const { code, state: agentId } = request.query as any;

    if (!code || !agentId) {
      return reply.code(400).send({ error: "Missing code or agent state" });
    }

    // Exchange code for bot token
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
    });

    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json() as any;

    if (!data.ok) {
      return reply.code(400).send({ error: "Slack OAuth failed", detail: data.error });
    }

    await db
      .update(agents)
      .set({
        slackTeamId: data.team?.id,
        slackBotToken: data.access_token,
        status: "onboarding",
      })
      .where(eq(agents.id, agentId));

    // Send first onboarding question
    await sendSlackMessage(
      data.access_token,
      data.incoming_webhook?.channel_id,
      `👋 Hi! I'm *OpenClaw*, your AI legal counsel agent.\n\nI'll ask you a few questions to get started. Let's begin:\n\n*${ONBOARDING_QUESTIONS[0]}*`
    );

    return reply.redirect(`${process.env.FRONTEND_URL}/onboarding?agentId=${agentId}&step=1`);
  });

  // Slack install URL generator
  fastify.get("/slack/install", async (request, reply) => {
    const { agentId } = request.query as any;
    if (!agentId) return reply.code(400).send({ error: "agentId required" });

    const scopes = [
      "chat:write",
      "channels:read",
      "channels:history",
      "im:read",
      "im:write",
      "im:history",
      "app_mentions:read",
      "users:read",
    ].join(",");

    const installUrl =
      `https://slack.com/oauth/v2/authorize` +
      `?client_id=${process.env.SLACK_CLIENT_ID}` +
      `&scope=${scopes}` +
      `&state=${agentId}` +
      `&redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI!)}`;

    return { installUrl };
  });

  // Slack event webhook (slash commands, messages)
  fastify.post("/slack/events", async (request, reply) => {
    const body = request.body as any;

    // URL verification challenge
    if (body.type === "url_verification") {
      return { challenge: body.challenge };
    }

    const event = body.event;
    if (!event) return { ok: true };

    // Handle app mentions or DMs
    if (event.type === "app_mention" || event.type === "message") {
      if (event.bot_id) return { ok: true }; // ignore bot messages

      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.slackTeamId, body.team_id));

      if (!agent) return { ok: true };

      // TODO: Route to Claude/OG Labs model for legal Q&A
      // For now, echo acknowledgement
      await sendSlackMessage(
        agent.slackBotToken!,
        event.channel,
        `🔍 Got your question. OpenClaw is analyzing your company's legal context...`
      );
    }

    return { ok: true };
  });

  // Get Slack OAuth scopes / onboarding questions for frontend
  fastify.get("/slack/onboarding-questions", async () => {
    return { questions: ONBOARDING_QUESTIONS };
  });
}

async function sendSlackMessage(token: string, channel: string, text: string) {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });
}
