import Anthropic from "@anthropic-ai/sdk";
import { resolve } from "path";
import { mkdir, writeFile } from "fs/promises";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

const WORKSPACE_DIR =
  process.env.OPENCLAW_WORKSPACE ??
  resolve(process.cwd(), "../openclaw/workspace");
const DOCS_DIR = resolve(WORKSPACE_DIR, "documents");

function isUsableText(text: string): boolean {
  if (text.startsWith("%PDF")) return false;
  const cleaned = text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, "").trim();
  if (cleaned.length < 30) return false;
  const printable = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, "");
  if (printable.length < cleaned.length * 0.5) return false;
  return true;
}

async function extractPdfParse(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
  return result.text;
}

async function extractWithVision(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Extract ALL text from this document "${filename}" verbatim. Preserve structure: headings, sections, clauses, dates, amounts, party names. Output only the extracted text, no commentary.`,
          },
        ],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function extractAndStore(
  agentId: string,
  buffer: Buffer,
  filename: string,
  source: "upload" | "telegram" = "upload",
): Promise<{ name: string; chunks: number; method: string } | null> {
  await mkdir(DOCS_DIR, { recursive: true });

  const isPdf = filename.toLowerCase().endsWith(".pdf");
  let textContent = "";
  let method = "raw";

  if (isPdf) {
    try {
      const pdfText = await extractPdfParse(buffer);
      console.log(`[pdf] pdf-parse result for ${filename}: ${pdfText.length} chars, usable: ${isUsableText(pdfText)}`);
      if (isUsableText(pdfText)) {
        textContent = pdfText;
        method = "pdf-parse";
      }
    } catch (e) {
      console.error(`[pdf] pdf-parse threw for ${filename}:`, e);
    }

    if (!textContent) {
      try {
        console.log(
          `[${source}] pdf-parse failed for ${filename}, using Claude vision`,
        );
        textContent = await extractWithVision(buffer, filename);
        method = "claude-vision";
      } catch (e) {
        console.error(`[${source}] vision extraction failed for ${filename}:`, e);
      }
    }
  } else {
    textContent = buffer.toString("utf-8");
    method = "plaintext";
  }

  if (!textContent.trim()) return null;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const txtPath = resolve(DOCS_DIR, safeName.replace(/\.pdf$/i, ".txt"));
  await writeFile(txtPath, textContent, "utf-8");

  await db.insert(documents).values({
    agentId,
    name: filename,
    type: isPdf ? "pdf" : "text",
    content: textContent.slice(0, 50000),
    metadata: {
      originalSize: buffer.length,
      extractedLength: textContent.length,
      extractionMethod: method,
      source,
    },
    processedAt: new Date(),
  });

  return {
    name: filename,
    chunks: Math.ceil(textContent.length / 2000),
    method,
  };
}
