import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { resolve } from "path";
import { mkdirSync } from "fs";
import * as schema from "./schema";

const DATA_DIR = resolve(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(resolve(DATA_DIR, "clawcounsel.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    company_id TEXT NOT NULL UNIQUE,
    telegram_chat_id TEXT UNIQUE,
    telegram_chat_title TEXT,
    nft_token_id TEXT,
    wallet_address TEXT,
    payment_tx_hash TEXT,
    agent_codename TEXT,
    agent_specialty TEXT,
    agent_tone TEXT,
    agent_tagline TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS onboarding_data (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    industry TEXT,
    document_types TEXT,
    legal_concerns TEXT,
    active_contracts TEXT,
    monitoring_priorities TEXT,
    onboarding_complete INTEGER DEFAULT 0,
    questions_answered TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    metadata TEXT DEFAULT '{}',
    processed_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    source TEXT NOT NULL,
    chat_id TEXT,
    chat_title TEXT,
    user_id TEXT,
    username TEXT,
    message_id TEXT,
    thread_id TEXT,
    content TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    acknowledged INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
