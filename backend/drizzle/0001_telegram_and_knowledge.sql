-- Swap Slack columns for Telegram on agents table
ALTER TABLE "agents" DROP COLUMN IF EXISTS "slack_team_id";
ALTER TABLE "agents" DROP COLUMN IF EXISTS "slack_bot_token";
ALTER TABLE "agents" DROP COLUMN IF EXISTS "slack_channel_id";
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "telegram_chat_id" text UNIQUE;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "telegram_chat_title" text;
--> statement-breakpoint

-- Knowledge base: everything the agent learns
CREATE TABLE IF NOT EXISTS "knowledge_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "source" text NOT NULL,
  "chat_id" text,
  "chat_title" text,
  "user_id" text,
  "username" text,
  "message_id" text,
  "thread_id" text,
  "content" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Conversation memory for Q&A
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL,
  "chat_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
