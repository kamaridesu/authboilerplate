import "server-only";
import "dotenv/config";
import crypto from "crypto";
import { z } from "zod";
import { envServer } from "@/data/env/server";
import { OAuthProvider } from "@/app/generated/prisma/client";
import { createMicrosoftOAuthClient } from "@/auth/microsoft";
import {
  CODE_VERIFIER_COOKIE_KEY,
  COOKIE_EXPIRATION_SECONDS,
  NONCE_COOKIE_KEY,
  STATE_COOKIE_KEY,
} from "./constants";
import { clearCookies } from "@/auth/session-store";
import {
  InvalidCodeVerifierError,
  InvalidNonceError,
  InvalidProvider,
  InvalidStateError,
  InvalidTokenError,
  InvalidTokenScheemaError,
  InvalidUserSchemaError,
  RetrieveTokenError,
} from "@/auth/errors";
import { getOidcConfig } from "./oidc";
import { createRemoteJWKSet, JWTPayload, jwtVerify } from "jose";

type CookieStore = Awaited<ReturnType<typeof import("next/headers").cookies>>;

function cookieOptions() {
  return {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    expires: new Date(Date.now() + COOKIE_EXPIRATION_SECONDS * 1000),
    path: "/api/oauth",
  };
}

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function setTokenCookie(cookies: CookieStore, name: string, value: string) {
  cookies.set({ name, value, ...cookieOptions() });
  return value;
}

function createState(cookies: CookieStore) {
  return setTokenCookie(cookies, STATE_COOKIE_KEY, generateToken());
}

function createCodeVerifier(cookies: CookieStore) {
  return setTokenCookie(cookies, CODE_VERIFIER_COOKIE_KEY, generateToken());
}

function createNonce(cookies: CookieStore) {
  return setTokenCookie(cookies, NONCE_COOKIE_KEY, generateToken());
}

function decodeJwtPayload(jwt: string): any {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = parts[1]!;
  const json = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(json);
}

function validateState(state: string, cookies: CookieStore) {
  const cookieState = cookies.get(STATE_COOKIE_KEY)?.value;
  return cookieState === state;
}

function getCodeVerifier(cookies: CookieStore) {
  const codeVerifier = cookies.get(CODE_VERIFIER_COOKIE_KEY)?.value;
  return codeVerifier;
}

function pkceCodeChallenge(verifier: string) {
  // Node built-in crypto; no dependency needed
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export type OAuthUser = {
  providerUserId: string;
  email: string;
  issuer?: string;
  tenantId?: string;
};

type VerifyIdToken = (
  cookies: CookieStore,
  idToken: string,
) => Promise<JWTPayload>;
type FetchUserInfo = (
  accessToken: string,
  tokenType: string,
) => Promise<unknown>;

type IdentityMode =
  | { kind: "oidc"; verifyIdToken: VerifyIdToken }
  | { kind: "userinfo"; fetchUserInfo: FetchUserInfo };

export class OAuthClient<T> {
  private readonly provider: OAuthProvider;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];
  private readonly urls: { auth: string; token: string };
  private readonly userInfo: {
    schema: z.ZodSchema<T>;
    parser: (data: T) => OAuthUser;
  };
  private readonly identity: IdentityMode;

  private readonly tokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    id_token: z.string().optional(),
  });

  constructor(args: {
    provider: OAuthProvider;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    urls: { auth: string; token: string };
    userInfo: {
      schema: z.ZodSchema<T>;
      parser: (data: T) => OAuthUser;
    };
    identity: IdentityMode;
  }) {
    this.provider = args.provider;
    this.clientId = args.clientId;
    this.clientSecret = args.clientSecret;
    this.scopes = args.scopes;
    this.urls = args.urls;
    this.userInfo = args.userInfo;
    this.identity = args.identity;
  }

  private get redirectUrl() {
    // /api/oauth/microsoft, /api/oauth/google, etc.
    return new URL(
      this.provider.toLowerCase(),
      envServer.OAUTH_REDIRECT_URL_BASE,
    );
  }

  createAuthUrl(cookies: CookieStore) {
    // Create and store state, code verifier, and nonce in cookies
    const state = createState(cookies);
    const codeVerifier = createCodeVerifier(cookies);
    const nonce = createNonce(cookies);

    // Build the authorization URL
    const url = new URL(this.urls.auth);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUrl.toString());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", pkceCodeChallenge(codeVerifier));
    url.searchParams.set("nonce", nonce);

    return url.toString();
  }

  async fetchUser(code: string, state: string, cookies: CookieStore) {
    const isValidState = validateState(state, cookies);

    if (!isValidState) {
      clearCookies();
      throw new InvalidStateError();
    }

    //TODO
    const codeVerifier = getCodeVerifier(cookies);

    if (!codeVerifier) throw new InvalidCodeVerifierError();

    const { accessToken, tokenType, idToken } = await this.fetchToken(
      code,
      codeVerifier,
    );

    let rawData: unknown;

    if (this.identity.kind === "oidc") {
      if (!idToken) throw new InvalidTokenError();
      rawData = await this.identity.verifyIdToken(cookies, idToken); // ✅ verified JWT payload
    } else {
      // OAuth2 providers (Discord-style): call user endpoint with access token
      rawData = await this.identity.fetchUserInfo(accessToken, tokenType);
    }

    cookies.delete(STATE_COOKIE_KEY);
    cookies.delete(CODE_VERIFIER_COOKIE_KEY);
    cookies.delete(NONCE_COOKIE_KEY);

    const parsed = this.userInfo.schema.safeParse(rawData);
    if (!parsed.success) throw new InvalidUserSchemaError(parsed.error);

    return this.userInfo.parser(parsed.data);
  }

  private async fetchToken(code: string, codeVerifier: string) {
    const rawData = await fetch(this.urls.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      cache: "no-store",
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUrl.toString(),
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier,
      }),
    })
      .then((res) => res.json())
      .catch((err) => {
        throw new RetrieveTokenError();
      });

    const parsed = this.tokenSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new InvalidTokenScheemaError(parsed.error);
    }

    return {
      accessToken: parsed.data.access_token,
      tokenType: parsed.data.token_type,
      idToken: parsed.data.id_token,
    };
  }
}

export function makeOidcDiscoveryVerifier(args: {
  discoveryUrl: string;
  clientId: string;
}): VerifyIdToken {
  return async (cookies, idToken) => {
    const expectedNonce = cookies.get(NONCE_COOKIE_KEY)?.value ?? null;

    const config = await getOidcConfig(args.discoveryUrl);
    console.log("Config", config);

    const jwks = createRemoteJWKSet(new URL(config.jwks_uri));

    const decoded = JSON.parse(
      Buffer.from(idToken.split(".")[1]!, "base64url").toString("utf8"),
    ) as { tid?: string; iss?: string };

    if (typeof decoded.tid !== "string" || decoded.tid.length === 0) {
      throw new InvalidTokenError();
    }

    const expectedIssuer = config.issuer.includes("{tenantid}")
      ? config.issuer.replace("{tenantid}", decoded.tid)
      : config.issuer;
    console.log("decoded", decoded);

    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: expectedIssuer,
      audience: args.clientId,
    }).catch((e) => {
      console.error("jwtVerify failed:", e);
      throw new InvalidTokenError();
    });

    // Nonce check
    if (expectedNonce != null) {
      if (
        typeof payload.nonce !== "string" ||
        payload.nonce !== expectedNonce
      ) {
        throw new InvalidNonceError();
      }
    }

    return payload;
  };
}

export function getOAuthClient(provider: OAuthProvider) {
  switch (provider) {
    case OAuthProvider.MICROSOFT:
      return createMicrosoftOAuthClient();
    default:
      throw new InvalidProvider(provider);
  }
}
