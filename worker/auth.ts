import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

type DrizzleD1 = ReturnType<typeof drizzle>;

interface AuthEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

// Factory — called per request. NEVER a module-level singleton.
// A singleton causes 33-second hangs and dropped sessions on Workers.
export function createAuth(env: AuthEnv, db: DrizzleD1) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: { enabled: true, disableSignUp: true }, 
    session: { storeSessionInDatabase: true },
  });
}

export type Auth = ReturnType<typeof createAuth>;
