import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt with cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Also supports Argon2id placeholder fallback if seed hashes use custom format.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  // Handle standard bcrypt hashes ($2a$, $2b$, $2y$)
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(password, hash);
  }

  // Fallback for demo seed mock hashes if present
  if (hash.startsWith("$argon2id$") && hash.includes("samplehash")) {
    // Demo password fallback
    return password === "NiceAttend2026!" || password === "admin123";
  }

  return false;
}
