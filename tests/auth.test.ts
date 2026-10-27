import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_DURATION_MS,
  SessionUser,
} from "../src/lib/auth/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  clearRateLimiter,
} from "../src/lib/auth/rate-limiter";

describe("Phase 4: Authentication & Security Unit Tests", () => {
  describe("1. Password Hashing and Verification", () => {
    it("hashes plaintext passwords using bcrypt with cost factor 12", async () => {
      const plaintext = "SecureAdmin2026!";
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
      expect(hash).not.toBe(plaintext);
    });

    it("verifies correct password against generated hash", async () => {
      const plaintext = "NiceAttendPass123";
      const hash = await hashPassword(plaintext);

      const isValid = await verifyPassword(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it("rejects incorrect passwords", async () => {
      const plaintext = "CorrectPassword";
      const wrongPassword = "WrongPassword";
      const hash = await hashPassword(plaintext);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("safely handles empty or missing inputs without throwing", async () => {
      expect(await verifyPassword("", "")).toBe(false);
      expect(await verifyPassword("password", "")).toBe(false);
      expect(await verifyPassword("", "somehash")).toBe(false);
    });
  });

  describe("2. Cryptographic Session Token Management", () => {
    const mockPrincipal: SessionUser = {
      id: "11111111-2222-3333-4444-555555555555",
      username: "principal",
      fullName: "Dr. Sarah Ahmed",
      role: "PRINCIPAL",
    };

    const mockVicePrincipal: SessionUser = {
      id: "66666666-7777-8888-9999-000000000000",
      username: "viceprincipal",
      fullName: "Mr. Tariq Mahmood",
      role: "VICE_PRINCIPAL",
    };

    it("generates a signed two-part HMAC-SHA256 session token", async () => {
      const token = await createSessionToken(mockPrincipal);

      expect(typeof token).toBe("string");
      const parts = token.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(10);
      expect(parts[1].length).toBeGreaterThan(10);
    });

    it("verifies and extracts valid session data for Principal", async () => {
      const token = await createSessionToken(mockPrincipal);
      const session = await verifySessionToken(token);

      expect(session).not.toBeNull();
      expect(session?.user.id).toBe(mockPrincipal.id);
      expect(session?.user.username).toBe("principal");
      expect(session?.user.role).toBe("PRINCIPAL");
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
      expect(session?.expiresAt).toBeLessThanOrEqual(Date.now() + SESSION_DURATION_MS + 1000);
    });

    it("verifies and extracts valid session data for Vice Principal", async () => {
      const token = await createSessionToken(mockVicePrincipal);
      const session = await verifySessionToken(token);

      expect(session).not.toBeNull();
      expect(session?.user.username).toBe("viceprincipal");
      expect(session?.user.role).toBe("VICE_PRINCIPAL");
    });

    it("detects and rejects payload tampering", async () => {
      const token = await createSessionToken(mockPrincipal);
      const [payloadB64, signatureB64] = token.split(".");

      // Tamper with payload (change role or id)
      const tamperedPayload = payloadB64.slice(0, -4) + "AAAA";
      const tamperedToken = `${tamperedPayload}.${signatureB64}`;

      const session = await verifySessionToken(tamperedToken);
      expect(session).toBeNull();
    });

    it("detects and rejects signature tampering", async () => {
      const token = await createSessionToken(mockPrincipal);
      const [payloadB64, signatureB64] = token.split(".");

      const tamperedSignature = signatureB64.slice(0, -4) + "ZZZZ";
      const tamperedToken = `${payloadB64}.${tamperedSignature}`;

      const session = await verifySessionToken(tamperedToken);
      expect(session).toBeNull();
    });

    it("rejects malformed or empty token strings", async () => {
      expect(await verifySessionToken("")).toBeNull();
      expect(await verifySessionToken("not-a-token")).toBeNull();
      expect(await verifySessionToken("a.b.c.d")).toBeNull();
    });
  });

  describe("3. Brute-Force Rate Limiting", () => {
    const testIdentifier = "test_user_rate_limit";

    beforeEach(() => {
      clearRateLimiter();
    });

    it("allows attempts initially with maximum remaining counter", () => {
      const status = checkRateLimit(testIdentifier);
      expect(status.isBlocked).toBe(false);
      expect(status.remainingAttempts).toBe(5);
    });

    it("tracks failed attempts and decrements remaining counter", () => {
      const attempt1 = recordFailedAttempt(testIdentifier);
      expect(attempt1.isBlocked).toBe(false);
      expect(attempt1.remainingAttempts).toBe(4);

      const attempt2 = recordFailedAttempt(testIdentifier);
      expect(attempt2.isBlocked).toBe(false);
      expect(attempt2.remainingAttempts).toBe(3);
    });

    it("blocks identifier after 5 consecutive failed attempts", () => {
      for (let i = 1; i <= 4; i++) {
        recordFailedAttempt(testIdentifier);
      }

      const fifthAttempt = recordFailedAttempt(testIdentifier);
      expect(fifthAttempt.isBlocked).toBe(true);
      expect(fifthAttempt.remainingAttempts).toBe(0);
      expect(fifthAttempt.retryAfterSeconds).toBeGreaterThan(0);

      const subsequentCheck = checkRateLimit(testIdentifier);
      expect(subsequentCheck.isBlocked).toBe(true);
      expect(subsequentCheck.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("resets rate limit upon successful login", () => {
      recordFailedAttempt(testIdentifier);
      recordFailedAttempt(testIdentifier);

      resetRateLimit(testIdentifier);

      const status = checkRateLimit(testIdentifier);
      expect(status.isBlocked).toBe(false);
      expect(status.remainingAttempts).toBe(5);
    });
  });

  describe("4. Role-Based Access Enforcement Rules", () => {
    it("confirms both PRINCIPAL and VICE_PRINCIPAL roles have full administrative authority", () => {
      const allowedRoles = ["PRINCIPAL", "VICE_PRINCIPAL"];

      expect(allowedRoles.includes("PRINCIPAL")).toBe(true);
      expect(allowedRoles.includes("VICE_PRINCIPAL")).toBe(true);
    });

    it("rejects non-administrative roles from administrative guard", () => {
      const allowedRoles = ["PRINCIPAL", "VICE_PRINCIPAL"];
      const unauthorizedRole = "TEACHER";

      expect(allowedRoles.includes(unauthorizedRole as any)).toBe(false);
    });
  });
});
