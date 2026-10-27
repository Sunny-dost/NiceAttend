import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "niceattend_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: "PRINCIPAL" | "VICE_PRINCIPAL";
}

export interface SessionData {
  user: SessionUser;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Get secret key buffer for signing session tokens.
 */
function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Fallback for development if not yet set in environment
    return "e9b7a4f8c2d1e5a3b7c9d0f2e4a6b8c1d3e5f7a9b0c2d4e6f8a1b3c5d7e9f0a2";
  }
  return secret;
}

/**
 * Base64URL encode a buffer or string.
 */
function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Base64URL decode to Uint8Array.
 */
function fromBase64Url(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sign payload using Web Crypto HMAC-SHA256 (compatible with Node & Edge runtimes).
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  const encoder = new TextEncoder();
  const now = Date.now();
  const sessionData: SessionData = {
    user,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const payloadJson = JSON.stringify(sessionData);
  const payloadB64 = toBase64Url(encoder.encode(payloadJson));

  const keyData = encoder.encode(getSecretKey());
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payloadB64)
  );

  const signatureB64 = toBase64Url(signatureBuffer);
  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify and decode an HMAC-SHA256 session token.
 */
export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      return null;
    }

    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) {
      return null;
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(getSecretKey());
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = fromBase64Url(signatureB64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      encoder.encode(payloadB64)
    );

    if (!isValid) {
      return null;
    }

    const payloadBytes = fromBase64Url(payloadB64);
    const decoder = new TextDecoder();
    const sessionData: SessionData = JSON.parse(decoder.decode(payloadBytes));

    // Check expiration
    if (!sessionData.expiresAt || Date.now() > sessionData.expiresAt) {
      return null;
    }

    // Check user structure
    if (!sessionData.user || !sessionData.user.id || !sessionData.user.role) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

/**
 * Set session cookie in Server Action or Route Handler.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

/**
 * Clear session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Read and verify session from cookies.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
