import "server-only";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const envServer = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().min(1),
    OAUTH_REDIRECT_URL_BASE: z.string().min(1),
    MICROSOFT_TENANT_ID: z.string().min(1),
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1),
    // MICROSOFT_OIDC_DISCOVERY_URL: z.string().min(1)
  },

  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
