import crypto from "crypto";

/**
 * Scrypt parameters
 * These are conservative, OWASP-aligned defaults.
 */
const SCRYPT_OPTIONS = {
  N: 2 ** 14, // CPU/memory cost
  r: 8,
  p: 1,
};

const KEY_LENGTH = 64;


/**
 * Hash a password using scrypt
*/
export function hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.scrypt(
            password.normalize(),
            salt,
            KEY_LENGTH,
            SCRYPT_OPTIONS,
            (error, hash) => {
                if (error) return reject(error);
                resolve(hash.toString("hex").normalize());
            }
        );
    });
}

/**
 * Generates a cryptographically secure salt
 */
export function generateSalt() {
  return crypto.randomBytes(16).toString("hex").normalize();
}

/**
 * Compare a plain password with stored hash + salt
 * Uses timingSafeEqual to avoid timing attacks
 */
export async function comparePasswords({
  password,
  salt,
  hashedPassword,
}: {
  password: string;
  salt: string;
  hashedPassword: string;
}): Promise<boolean> {
  // Hard stop to avoid DoS via gigantic passwords
  if (password.length > 200) return false;

  try {
    const inputHashedPassword = await hashPassword(password, salt);

    // timingSafeEqual requires equal lengths, and Buffer.from(hex) wants valid hex
    if (
      typeof inputHashedPassword !== "string" ||
      typeof hashedPassword !== "string" ||
      inputHashedPassword.length !== hashedPassword.length ||
      inputHashedPassword.length % 2 !== 0 // hex must be even length
    ) {
      return false;
    }

    const a = Buffer.from(inputHashedPassword, "hex");
    const b = Buffer.from(hashedPassword, "hex");

    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    // Log error for monitoring; treat as non-match
    console.error("comparePasswords error", err);
    return false;
  }
}

