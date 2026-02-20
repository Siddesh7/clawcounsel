import { NextRequest, NextResponse } from "next/server";

// All /api/* calls from the browser are proxied server-side to the backend.
// This avoids CORS and mixed-content (https → http) issues entirely.

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3001";

async function proxy(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/");
  const search = request.nextUrl.search;
  const url = `${BACKEND}/api/${path}${search}`;

  const headers = new Headers();
  headers.set("Content-Type", request.headers.get("Content-Type") ?? "application/json");

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const res = await fetch(url, init);

  // Handle redirects from backend (e.g. OAuth callbacks)
  if (res.status === 301 || res.status === 302) {
    const location = res.headers.get("location");
    if (location) return NextResponse.redirect(location);
  }

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
