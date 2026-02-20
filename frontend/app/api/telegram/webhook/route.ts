import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const res = await fetch(`${BACKEND_URL}/api/telegram/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status });
}
