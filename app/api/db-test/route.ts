import { NextResponse } from "next/server";
import { db } from "@/data/db/db";

export async function GET() {
  const userCount = await db.user.count();
  return NextResponse.json({ ok: true, userCount });
}
