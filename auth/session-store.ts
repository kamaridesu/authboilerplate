import { CODE_VERIFIER_COOKIE_KEY, COOKIE_SESSION_KEY, NONCE_COOKIE_KEY, SESSION_TTL_SECONDS, STATE_COOKIE_KEY } from "@/auth/constants";
import { db } from "@/data/db/db";
import { cookies } from "next/headers";

export type SessionMeta = {
  userAgent?: string;
  ip?: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

function computeExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  };
}

export async function createUserSession(
  userId: string,
  meta: SessionMeta,
): Promise<SessionRecord> {
  try {
    const expiresAt = computeExpiresAt();

    const session = await db.session.create({
      data: {
        userId,
        lastSeenAt: new Date(),
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(
      COOKIE_SESSION_KEY,
      session.id,
      cookieOptions(session.expiresAt),
    );

    return session;
  } catch (err) {
    console.error("createUserSession failed", { userId, err });

    // Preserve original error for debugging (Node 16+ supports `cause`)
    throw new Error("Failed to create user session", { cause: err });
  }
}

/**
 * Reads session from DB and returns null if missing/expired.
 */
export async function getSession(
  sessionId: string,
): Promise<SessionRecord | null> {
  console.log("getSession: fetching session for ID", sessionId);
  const now = new Date();

  const session = await db.session.findUnique({
    where: {
      id: sessionId,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      userAgent: true,
      ipAddress: true,
    },
  });

  return session;
}

/**
 * Updates lastSeen (and optionally IP/UA). Returns updated session or null if expired.
 * Choose whether you want sliding expiration by uncommenting expiresAt update.
 */
export async function touchSession(sessionId: string, meta: SessionMeta) {
  const existing = await getSession(sessionId);
  if (!existing) return null;

  const updated = await db.session.update({
    where: { id: sessionId },
    data: {
      lastSeenAt: new Date(),
      userAgent: meta.userAgent ?? existing.userAgent,
      ipAddress: meta.ip ?? existing.ipAddress,
      // Sliding sessions (optional):
      // expiresAt: computeExpiresAt(),
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      userAgent: true,
      ipAddress: true,
    },
  });

  return updated;
}

/**
 * Deletes a single session (idempotent).
 */
export async function deleteSession(sessionId: string) {
  await db.session.deleteMany({ where: { id: sessionId } });
}

export async  function clearCookies() {
  const cookieStore = await cookies();
  // Ensure we clear the cookie with the same path we set it with.
  cookieStore.delete(COOKIE_SESSION_KEY);
  cookieStore.delete(CODE_VERIFIER_COOKIE_KEY);
  cookieStore.delete(STATE_COOKIE_KEY);
  cookieStore.delete(NONCE_COOKIE_KEY);
}

/**
 * Deletes all sessions for a user.
 */
export async function deleteAllSessionsForUser(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

/**
 * Optional: cleanup expired sessions (cron later).
 */
export async function deleteExpiredSessions() {
  await db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
