import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { resolve } from "path";
import { mkdir, writeFile } from "fs/promises";

const WORKSPACE_DIR =
  process.env.OPENCLAW_WORKSPACE ??
  resolve(process.cwd(), "../openclaw/workspace");
const DOCS_DIR = resolve(WORKSPACE_DIR, "documents");

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await mkdir(DOCS_DIR, { recursive: true });

  const formData = await req.formData();
  const results: Array<{ name: string; chunks: number }> = [];

  for (const [, value] of formData.entries()) {
    if (!(value instanceof File)) continue;

    const buffer = Buffer.from(await value.arrayBuffer());
    const filename = value.name ?? "document.txt";
    const isPdf = filename.toLowerCase().endsWith(".pdf");

    let textContent: string;
    try {
      textContent = isPdf
        ? await extractPdfText(buffer)
        : buffer.toString("utf-8");
    } catch {
      textContent = buffer.toString("utf-8");
    }

    if (!textContent.trim()) continue;

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const txtPath = resolve(DOCS_DIR, safeName.replace(/\.pdf$/i, ".txt"));
    await writeFile(txtPath, textContent, "utf-8");

    await db.insert(documents).values({
      agentId: id,
      name: filename,
      type: isPdf ? "pdf" : "text",
      content: textContent.slice(0, 50000),
      metadata: {
        originalSize: buffer.length,
        extractedLength: textContent.length,
      },
      processedAt: new Date(),
    });

    results.push({
      name: filename,
      chunks: Math.ceil(textContent.length / 2000),
    });
  }

  return NextResponse.json(
    { uploaded: results.length, documents: results },
    { status: 201 },
  );
}
