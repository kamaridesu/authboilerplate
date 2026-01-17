import { NextResponse } from "next/server";
import { redis } from "@/data/redis/redis";

export async function GET() {
  await redis.set("healthcheck", "ok", "EX", 5);
  const value = await redis.get("healthcheck");

  return NextResponse.json({
    ok: true,
    value,
  });
}
