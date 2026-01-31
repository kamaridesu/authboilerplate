"use server";

import { cookies, headers } from "next/headers";
import { db } from "@/data/db/db";
import { signInSchema } from "@/auth/schemas";
import { comparePasswords } from "@/auth/password";
import { clearCookies, createUserSession } from "@/auth/session-store";
import { redirect } from "next/navigation";
import { COOKIE_SESSION_KEY } from "./constants";
import { deleteSession } from "@/auth/session-store";
import { getOAuthClient } from "./base";
import { OAuthProvider } from "@/app/generated/prisma/enums";
import { getClientIp } from "./ip";

type SignInResponse = { success: true } | { success: false; error: string };

export async function signInAction(
  formData: FormData,
): Promise<SignInResponse> {
  try {
    // Validate input
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Handle validation errors
    if (!parsed.success) {
      return { success: false, error: "Invalid credentials" };
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, passwordHash: true, passwordSalt: true },
    });

    // Handle user not found or missing password info
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return { success: false, error: "Invalid credentials" };
    }

    // Verify password
    const matches = await comparePasswords({
      password: parsed.data.password,
      salt: user.passwordSalt,
      hashedPassword: user.passwordHash,
    });

    // Handle invalid password
    if (!matches) {
      return { success: false, error: "Invalid credentials" };
    }

    // Create session + set cookie
    const h = await headers();
    const userAgent = h.get("user-agent") ?? undefined;
    const ip = await getClientIp();
    await createUserSession(user.id, { userAgent, ip });
  } catch (err) {
    console.error("signInAction: Server error", err);
    return { success: false, error: "Service unavailable. Try again." };
  }
  console.log("signInAction: success");
  redirect("/private");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  try {
    const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;

    if (sessionId) await deleteSession(sessionId);
  } catch (err) {
    console.error("logoutAction: deleteSession failed", err);
  } finally {
    await clearCookies();
  }

  redirect("/sign-in");
}

export async function oauthSignIn(provider: OAuthProvider) {
  const cookieStore = await cookies();

  let authUrl: string;
  try {
    const client = getOAuthClient(provider);
    authUrl = client.createAuthUrl(cookieStore);
  } catch (err) {
    console.error("oauthSignIn failed", { provider, err });
    redirect("/sign-in?error=oauth_invalid_provider");
  }
    redirect(authUrl);
}
