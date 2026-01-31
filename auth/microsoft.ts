import "server-only";
import { z } from "zod";
import { envServer } from "@/data/env/server";
import { OAuthProvider } from "@/app/generated/prisma/client";
import { makeOidcDiscoveryVerifier, OAuthClient } from "@/auth/base";

export function createMicrosoftOAuthClient() {
  const tenant = "common";

  return new OAuthClient({
    provider: OAuthProvider.MICROSOFT,
    clientId: envServer.MICROSOFT_CLIENT_ID,
    clientSecret: envServer.MICROSOFT_CLIENT_SECRET,
    scopes: ["openid", "profile", "email"],
    urls: {
      auth: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    },
    identity: {
      kind: "oidc",
      verifyIdToken: makeOidcDiscoveryVerifier({
        discoveryUrl: `https://login.microsoftonline.com/${tenant}/v2.0/.well-known/openid-configuration`,
        clientId: envServer.MICROSOFT_CLIENT_ID,
      }),
    },
    userInfo: {
      schema: z.object({
        sub: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        preferred_username: z.string().optional(),
        iss: z.string().optional(),
        tid: z.string().optional(),
      }),
      parser: (p) => ({
        providerUserId: p.sub, // ← THIS is providerUserId
        name: p.name ?? "Unknown",
        email: (p.email ?? p.preferred_username ?? "").toLowerCase(),
        issuer: p.iss,
        tenantId: p.tid,
      }),
    },
  });
}
