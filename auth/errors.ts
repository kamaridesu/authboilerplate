import z from "zod";

export class RetrieveTokenError extends Error {
  constructor() {
    super("Failed to retrieve OAuth token");
  }
}

export class InvalidProvider extends Error {
  constructor(provider: string) {
    super(`Unsupported OAuth provider: ${provider}`);
  }
}

export class InvalidTokenScheemaError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid Token");
    this.cause = zodError;
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid Token");
  }
}


export class FetchUserError extends Error {
  constructor() {
    super("Failed to fetch OAuth user");
  }
}

export class InvalidUserSchemaError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid User");
    this.cause = zodError;
  }
}
export class InvalidStateError extends Error {
  constructor() {
    super("Invalid State");
  }
}
export class InvalidCodeVerifierError extends Error {
  constructor() {
    super("Invalid Code Verifier");
  }
}

export class InvalidNonceError extends Error {
  constructor() {
    super("Invalid Nonce");
  }
}

export class OidcDiscoveryError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "OidcDiscoveryError";
  }
}

export class OidcConfigError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "OidcConfigError";
  }
}

export class ProviderError extends Error {
  constructor(error: any, errorDescription: any) {
    super(`OAuth Provider Error: ${error}`);
    this.message = errorDescription || this.message;
  }
}

export class MissingOAuthCallbackParamsError extends Error {
  constructor() {
    super("Missing OAuth callback parameters");
  }
}

export class EmailRequiredError extends Error {
  constructor() {
    super("Email is required but was not provided by the OAuth provider");
  }
}

export class JWTVerificationError extends Error {
  constructor() {
    super("Failed to verify JWT");
  }
}

