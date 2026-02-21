import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolve } from "path";
import { mkdir, writeFile } from "fs/promises";

const WORKSPACE_DIR =
  process.env.OPENCLAW_WORKSPACE ??
  resolve(process.cwd(), "../openclaw/workspace");
const DOCS_DIR = resolve(WORKSPACE_DIR, "documents");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.agentId, id));
  return NextResponse.json({ documents: docs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, type, content, metadata } = await req.json();

  if (content) {
    await mkdir(DOCS_DIR, { recursive: true });
    const safeName = (name ?? "document.txt").replace(/[^a-zA-Z0-9._-]/g, "_");
    await writeFile(resolve(DOCS_DIR, safeName), content, "utf-8");
  }

  const [doc] = await db
    .insert(documents)
    .values({
      agentId: id,
      name,
      type,
      content,
      metadata,
      processedAt: content ? new Date() : null,
    })
    .returning();

  return NextResponse.json({ document: doc }, { status: 201 });
}
