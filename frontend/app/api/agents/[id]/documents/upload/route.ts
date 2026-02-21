import { NextRequest, NextResponse } from "next/server";
import { extractAndStore } from "@/lib/services/pdf";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await req.formData();
  const results: Array<{ name: string; chunks: number; method: string }> = [];

  for (const [, value] of formData.entries()) {
    if (!(value instanceof File)) continue;

    const buffer = Buffer.from(await value.arrayBuffer());
    const filename = value.name ?? "document.txt";

    const result = await extractAndStore(id, buffer, filename, "upload");
    if (result) results.push(result);
  }

  return NextResponse.json(
    { uploaded: results.length, documents: results },
    { status: 201 },
  );
}
