import { pgTable, text, timestamp, uuid, boolean, jsonb, integer } from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  companyId: text("company_id").notNull().unique(),
  // Telegram
  telegramChatId:      text("telegram_chat_id").unique(), // group chat id once /connect is sent
  telegramChatTitle:   text("telegram_chat_title"),
  // Ownership
  nftTokenId:    text("nft_token_id"),
  walletAddress: text("wallet_address"),
  status: text("status").notNull().default("pending"), // pending | onboarding | active
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const onboardingData = pgTable("onboarding_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  claimDescription:       text("claim_description"),
  claimType:              text("claim_type"), // copyright | contract | ip | other
  opposingParty:          text("opposing_party"),
  opposingGithubUsername: text("opposing_github_username"),
  evidenceDescription:    text("evidence_description"),
  onboardingComplete:     boolean("onboarding_complete").default(false),
  questionsAnswered:      jsonb("questions_answered").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  name:    text("name").notNull(),
  type:    text("type").notNull(), // pdf | github | text
  content: text("content"),
  metadata: jsonb("metadata").default({}),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Everything the agent learns from Telegram messages and documents
export const knowledgeItems = pgTable("knowledge_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  source:  text("source").notNull(), // telegram_message | document | github
  // Message context
  chatId:    text("chat_id"),
  chatTitle: text("chat_title"),
  userId:    text("user_id"),
  username:  text("username"),
  messageId: text("message_id"), // Telegram message_id for dedup
  threadId:  text("thread_id"),
  content:   text("content").notNull(),
  metadata:  jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Q&A conversation memory per agent
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  chatId:  text("chat_id").notNull(),
  userId:  text("user_id").notNull(),
  role:    text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  type:        text("type").notNull(), // payment_overdue | vendor_breach | copyright_infringement | deadline
  title:       text("title").notNull(),
  description: text("description").notNull(),
  severity:    text("severity").notNull().default("medium"), // low | medium | high | critical
  acknowledged: boolean("acknowledged").default(false),
  metadata:    jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
