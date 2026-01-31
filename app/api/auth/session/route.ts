import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSION_KEY } from "@/auth/constants";
import { getSession } from "@/auth/session-store";
import { success } from "zod";

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get(COOKIE_SESSION_KEY)?.value;

  if (!sessionId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 503 });
  }
}