import { NextRequest, NextResponse } from "next/server";
import { verifyCredential } from "../../../../src/verify";
import { authenticateKey } from "../../../../src/apikey";
import { monthlyUsage } from "../../../../src/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function handle(query: string, req: NextRequest) {
  const key = bearer(req);
  let verifierId: string | null = null;
  let usage: { used: number; quota: number; remaining: number } | null = null;

  // optional key: if present it must be valid; if absent, public lookup
  if (key) {
    const verifier = await authenticateKey(key);
    if (!verifier) {
      return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
    }
    const used = await monthlyUsage(verifier.id);
    if (used >= verifier.monthlyQuota) {
      return NextResponse.json(
        { error: "quota_exceeded", used, quota: verifier.monthlyQuota },
        { status: 429 }
      );
    }
    verifierId = verifier.id;
    usage = {
      used: used + 1,
      quota: verifier.monthlyQuota,
      remaining: verifier.monthlyQuota - used - 1,
    };
  }

  const result = await verifyCredential(query, verifierId);
  return NextResponse.json({ ...result, usage });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = (body.query ?? "").toString().trim();
  if (!query) return NextResponse.json({ error: "missing_query" }, { status: 400 });
  return handle(query, req);
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ error: "missing_query" }, { status: 400 });
  return handle(query, req);
}
