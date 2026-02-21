import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const agents = sqliteTable("agents", {
  id: id(),
  companyName: text("company_name").notNull(),
  companyId: text("company_id").notNull().unique(),
  telegramChatId: text("telegram_chat_id").unique(),
  telegramChatTitle: text("telegram_chat_title"),
  nftTokenId: text("nft_token_id"),
  walletAddress: text("wallet_address"),
  paymentTxHash: text("payment_tx_hash"),
  agentCodename: text("agent_codename"),
  agentSpecialty: text("agent_specialty"),
  agentTone: text("agent_tone"),
  agentTagline: text("agent_tagline"),
  status: text("status").notNull().default("pending"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const onboardingData = sqliteTable("onboarding_data", {
  id: id(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  industry: text("industry"),
  documentTypes: text("document_types"),
  legalConcerns: text("legal_concerns"),
  activeContracts: text("active_contracts"),
  monitoringPriorities: text("monitoring_priorities"),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).default(false),
  questionsAnswered: text("questions_answered", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: createdAt(),
});

export const documents = sqliteTable("documents", {
  id: id(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  content: text("content"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  processedAt: integer("processed_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const knowledgeItems = sqliteTable("knowledge_items", {
  id: id(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  source: text("source").notNull(),
  chatId: text("chat_id"),
  chatTitle: text("chat_title"),
  userId: text("user_id"),
  username: text("username"),
  messageId: text("message_id"),
  threadId: text("thread_id"),
  content: text("content").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: createdAt(),
});

export const conversations = sqliteTable("conversations", {
  id: id(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  chatId: text("chat_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export const alerts = sqliteTable("alerts", {
  id: id(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"),
  acknowledged: integer("acknowledged", { mode: "boolean" }).default(false),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: createdAt(),
});
