import { NextRequest, NextResponse } from "next/server";
import { verifyCredential } from "../../../src/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = (body.query ?? "").toString().trim();
    if (!query) {
      return NextResponse.json(
        { error: "Provide a 'query' (registration or license number)." },
        { status: 400 }
      );
    }
    const result = await verifyCredential(query);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "verification_failed", detail: err?.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Provide ?query=..." }, { status: 400 });
  }
  const result = await verifyCredential(query);
  return NextResponse.json(result);
}
