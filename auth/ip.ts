import { headers } from "next/headers";

/**
 * Extracts the real client IP address from request headers.
 *
 * In production, your app is typically behind a reverse proxy (Vercel, Cloudflare, nginx, etc.)
 * which forwards the real client IP in specific headers.
 *
 * Priority order:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (nginx, common)
 * 3. x-forwarded-for (standard, but can contain multiple IPs - we take the first one)
 * 4. x-vercel-forwarded-for (Vercel)
 *
 * Security note: These headers can be spoofed if your app is directly exposed to the internet.
 * Only trust these headers when behind a trusted reverse proxy.
 *
 * @returns The client IP address or null if not found
 */

export async function getClientIp(): Promise<string | undefined> {
  const headersList = await headers();

  // Cloudflare
  const cfIp = headersList.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // nginx and others
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp;

  // Standard forwarded header (may contain multiple IPs: "client, proxy1, proxy2")
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (the original client)
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Vercel
  const vercelIp = headersList.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp;

  // If none found, return undefined (development environment)
  return undefined;
}
