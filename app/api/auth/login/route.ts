import { NextRequest, NextResponse } from "next/server";
import { db } from "@/data/db/db";
import { signInSchema } from "@/auth/schemas";
import { comparePasswords } from "@/auth/password";
import { createUserSession } from "@/auth/session-store";
import { headers } from "next/headers";
import { Prisma } from "@/app/generated/prisma/client";
import { getClientIp } from "@/auth/ip";

export async function POST(req: NextRequest) {
  try {
    // Parse JSON body
    const { email, password } = await req.json();

    // Validate body
    const parsed = signInSchema.safeParse({ email, password });

    // Handle validation errors
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, passwordSalt: true },
    });

    // Handle user not found or missing password info
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Verify password
    const matches = await comparePasswords({
      password,
      salt: user.passwordSalt,
      hashedPassword: user.passwordHash,
    });

    // Handle invalid password
    if (!matches) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Create session + set cookie
    const h = await headers();
    const userAgent = h.get("user-agent") ?? undefined;
    const ip = await getClientIp();
    await createUserSession(user.id, { userAgent, ip });

    // Return success response
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Malformed JSON" },
        { status: 400 },
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      err instanceof Prisma.PrismaClientInitializationError ||
      err instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      // DB unreachable at startup / misconfig
      console.error("POST /api/auth/login Prisma error", err);
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 },
      );
    }

    console.error("POST /api/auth/login Server error", { err });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
