import { NextResponse } from "next/server";
import { generateSalt, hashPassword } from "@/auth/password";

export async function GET() {
  let password = "1234";

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  return NextResponse.json({ password, hash, salt });
}
