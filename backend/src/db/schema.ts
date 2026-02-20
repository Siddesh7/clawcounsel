import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  companyId: text("company_id").notNull().unique(),
  slackTeamId: text("slack_team_id"),
  slackBotToken: text("slack_bot_token"),
  slackChannelId: text("slack_channel_id"),
  nftTokenId: text("nft_token_id"),
  walletAddress: text("wallet_address"),
  status: text("status").notNull().default("pending"), // pending | onboarding | active
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const onboardingData = pgTable("onboarding_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  // Legal claim context
  claimDescription: text("claim_description"),
  claimType: text("claim_type"), // copyright | contract | ip | other
  opposingParty: text("opposing_party"),
  opposingGithubUsername: text("opposing_github_username"),
  evidenceDescription: text("evidence_description"),
  // Status
  onboardingComplete: boolean("onboarding_complete").default(false),
  questionsAnswered: jsonb("questions_answered").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // pdf | github | slack | text
  content: text("content"),
  metadata: jsonb("metadata").default({}),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  type: text("type").notNull(), // payment_overdue | vendor_breach | copyright_infringement | deadline
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // low | medium | high | critical
  acknowledged: boolean("acknowledged").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
