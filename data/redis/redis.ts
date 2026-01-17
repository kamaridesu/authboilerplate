import "server-only";
import Redis from "ioredis";
import { envServer } from "@/data/env/server";

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

function createRedisClient() {
  return new Redis(envServer.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
}

export const redis = globalThis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.redis = redis;
}
