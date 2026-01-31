import "server-only";
import { z } from "zod";
import { envServer } from "@/data/env/server";
import { OAuthProvider } from "@/app/generated/prisma/client";
import { OAuthClient } from "@/auth/base";

export function createMicrosoftOAuthClient() {
  const tenant = envServer.MICROSOFT_TENANT_ID;

  return new OAuthClient({
    provider: OAuthProvider.MICROSOFT,
    clientId: envServer.MICROSOFT_CLIENT_ID,
    clientSecret: envServer.MICROSOFT_CLIENT_SECRET,
    scopes: ["openid", "profile", "email", "User.Read"],
    urls: {
      auth: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      user: "https://graph.microsoft.com/v1.0/me",
    },
    userInfo: {
      schema: z.object({
        id: z.string(),
        displayName: z.string().nullable().optional(),
        userPrincipalName: z.string().nullable().optional(),
        mail: z.string().nullable().optional(),
      }),
      parser: (u) => ({
        id: u.id,
        name: u.displayName ?? "Unknown",
        email: (u.mail ?? u.userPrincipalName ?? "").toLowerCase(),
      }),
    },
  });
}
