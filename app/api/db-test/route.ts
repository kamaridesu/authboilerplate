import { NextResponse } from "next/server";
import { db } from "@/data/db/db";

export async function GET() {
  try {
  const userCount = await db.user.count();
  return NextResponse.json({ ok: true, userCount });
  } catch (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
