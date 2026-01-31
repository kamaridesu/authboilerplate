import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { OAuthProvider, Prisma } from "@/app/generated/prisma/client";
import {
  EmailRequiredError,
  FetchUserError,
  InvalidCodeVerifierError,
  InvalidNonceError,
  InvalidProvider,
  InvalidStateError,
  InvalidTokenError,
  InvalidUserSchemaError,
  MissingOAuthCallbackParamsError,
  OidcConfigError,
  OidcDiscoveryError,
  ProviderError,
  RetrieveTokenError,
} from "@/auth/errors";
import { db } from "@/data/db/db";
import { createUserSession } from "@/auth/session-store";
import { getClientIp } from "@/auth/ip";
import { getOAuthClient } from "@/auth/base";

function parseProvider(raw: string): OAuthProvider | null {
  switch (raw.toLowerCase()) {
    case "microsoft":
      return OAuthProvider.MICROSOFT;
    default:
      return null;
  }
}

function fail(req: NextRequest, code: string) {
  return NextResponse.redirect(
    new URL(`/sign-in?error=${encodeURIComponent(code)}`, req.url),
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: raw } = await params;

    const provider = parseProvider(raw);
    if (!provider) throw new InvalidProvider(raw);

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      throw new ProviderError(error, errorDescription);
    }
    if (!code || !state) throw new MissingOAuthCallbackParamsError();

    const cookieStore = await cookies();
    const client = getOAuthClient(provider);

    // 1) Fetch provider user
    const oAuthFetchedUser = await client.fetchUser(code, state, cookieStore);

    //maybe fix for other preferred_username
    const email = oAuthFetchedUser.email?.trim().toLowerCase();
    if (!email) throw new EmailRequiredError();

    // 2) If already linked -> login
    const existing = await db.userOAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: oAuthFetchedUser.providerUserId,
        },
      },
      select: { userId: true },
    });

    let userId = existing?.userId;

    // 3) Provisioning-required linking by email + allowed provider
    if (!userId) {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) return fail(req, "not_provisioned");

      const allowed = await db.userAllowedProvider.findUnique({
        where: { userId_provider: { userId: user.id, provider } },
        select: { id: true },
      });
      if (!allowed) return fail(req, "provider_not_allowed");

      await db.userOAuthAccount.upsert({
        where: {
          provider_providerUserId: {
            provider,
            providerUserId: oAuthFetchedUser.providerUserId,
          },
        },
        update: {
          issuer: oAuthFetchedUser.issuer ?? null,
          tenantId: oAuthFetchedUser.tenantId ?? null,
        },
        create: {
          userId: user.id,
          provider,
          providerUserId: oAuthFetchedUser.providerUserId,
          issuer: oAuthFetchedUser.issuer ?? null,
          tenantId: oAuthFetchedUser.tenantId ?? null,
        },
      });

      userId = user.id;
    }

    if (!userId) return fail(req, "oauth_no_user");

    // 4) Create session + cookie
    const h = await headers();
    const ip = await getClientIp();
    await createUserSession(userId, {
      userAgent: h.get("user-agent") ?? undefined,
      ip,
    });

    return NextResponse.redirect(new URL("/private", req.url));
  } catch (err) {
    if (err instanceof InvalidProvider) {
      console.error("GET /oauth/[provider]/route.ts: invalid provider", err);
      return fail(req, "oauth_invalid_provider");
    }

    if (err instanceof ProviderError) {
      console.error(
        "GET /oauth/[provider]/route.ts: OAuth provider returned error",
        err,
      );
      return fail(req, "provider_error");
    }

    if (err instanceof MissingOAuthCallbackParamsError) {
      console.error(
        "GET /oauth/[provider]/route.ts: missing OAuth callback params",
        err,
      );
      return fail(req, "oauth_callback_params");
    }

    if (err instanceof InvalidStateError) {
      console.error("GET /oauth/[provider]/route.ts: invalid OAuth state", err);
      return fail(req, "oauth_state");
    }

    if (err instanceof InvalidCodeVerifierError) {
      console.error(
        "Get /oauth/[provider]/route.ts: invalid code verifier",
        err,
      );
      return fail(req, "oauth_code_verifier");
    }

    if (err instanceof RetrieveTokenError) {
      console.error(
        "GET /oauth/[provider]/route.ts: failed to retrieve OAuth token",
        err,
      );
      return fail(req, "oauth_token_retrieval");
    }

    if (err instanceof InvalidTokenError) {
      console.error("GET /oauth/[provider]/route.ts: invalid OAuth token", err);
      return fail(req, "oauth_token");
    }

    if (err instanceof FetchUserError) {
      console.error(
        "GET /oauth/[provider]/route.ts: failed to fetch OAuth user",
        err,
      );
      return fail(req, "oauth_fetch_user");
    }

    if (err instanceof InvalidUserSchemaError) {
      console.error(
        "GET /oauth/[provider]/route.ts: invalid OAuth user schema",
        err,
      );
      return fail(req, "oauth_parser");
    }

    if (err instanceof EmailRequiredError) {
      console.error(
        "GET /oauth/[provider]/route.ts: OAuth email required",
        err,
      );
      return fail(req, "oauth_email_required");
    }

    if (err instanceof OidcDiscoveryError) {
      console.error(
        "GET /oauth/[provider]/route.ts: OAuth OIDC discovery error",
        err,
      );
      return fail(req, "oauth_oidc_discovery");
    }

    if (err instanceof OidcConfigError) {
      console.error(
        "GET /oauth/[provider]/route.ts: OAuth OIDC config error",
        err,
      );
      return fail(req, "oauth_oidc_config");
    }

    if (err instanceof InvalidNonceError) {
      console.error("GET /oauth/[provider]/route.ts: invalid OIDC nonce", err);
      return fail(req, "oauth_nonce");
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError ||
      err instanceof Prisma.PrismaClientInitializationError ||
      err instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      // DB unreachable at startup / misconfig
      console.error("GET /oauth/[provider]/route.ts: Prisma error", err);
      return fail(req, "oauth_database");
    }

    console.error("GET /oauth/[provider]/route.ts: unexpected error", err);
    return fail(req, "oauth_server");
  }
}
