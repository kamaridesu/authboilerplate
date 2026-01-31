import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  InvalidNonceError,
  JWTVerificationError,
  OidcConfigError,
  OidcDiscoveryError,
} from "@/auth/errors";
import { envServer } from "@/data/env/server";
import { cookies } from "next/headers";
import { id, th } from "zod/v4/locales";

type OidcConfig = {
  issuer: string;
  jwks_uri: string;
};

type MicrosoftIds = { tid: string | null; oid: string | null };

export async function getOidcConfig(discoveryUrl: string): Promise<OidcConfig> {
  const res = await fetch(discoveryUrl, { cache: "no-store" });

  if (!res.ok) {
    throw new OidcDiscoveryError(`OIDC discovery failed: ${res.status}`);
  }

  const json = (await res.json()) as Partial<OidcConfig>;

  if (typeof json.issuer !== "string" || typeof json.jwks_uri !== "string") {
    throw new OidcConfigError("OIDC discovery missing issuer or jwks_uri");
  }

  return { issuer: json.issuer, jwks_uri: json.jwks_uri };
}

// export async function verifyMicrosoftIdTokenWithDiscovery(
//   cookieStore: Awaited<ReturnType<typeof cookies>>,
//   idToken: string,
// ): Promise<MicrosoftIds> {
//   const expectedNonce = cookieStore.get("oAuthNonce")?.value ?? null;
//   const discoveryUrl = envServer.MICROSOFT_OIDC_DISCOVERY_URL?.replace(
//     "<TENANT_ID>",
//     envServer.MICROSOFT_TENANT_ID,
//   );

//   const config = await getOidcConfig(discoveryUrl);

//   const jwks = createRemoteJWKSet(new URL(config.jwks_uri));

//   const { payload } = await jwtVerify(idToken, jwks, {
//     issuer: config.issuer,
//     audience: envServer.MICROSOFT_CLIENT_ID,
//   }).catch((err) => {
//     throw new JWTVerificationError();
//   });

//   if (expectedNonce != null) {
//     if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce) {
//       throw new InvalidNonceError();
//     }
//   }

//   const tid = typeof payload.tid === "string" ? payload.tid : null;
//   const oid = typeof payload.oid === "string" ? payload.oid : null;

//   return { tid, oid };
// }
