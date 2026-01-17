import "server-only";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const envServer = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
  },

  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
