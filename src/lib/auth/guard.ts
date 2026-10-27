import prisma from "@/lib/prisma";
import { getSession, clearSessionCookie, SessionUser } from "./session";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Server-side authorization guard.
 * Verifies session cookie, confirms active account in database,
 * and asserts that user possesses administrative authority (PRINCIPAL or VICE_PRINCIPAL).
 */
export async function requireAdminAuth(): Promise<SessionUser> {
  const session = await getSession();

  if (!session || !session.user) {
    throw new AuthError("Authentication required. Please log in.", 401);
  }

  // Verify against database that user has not been deactivated since token issuance
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  if (!dbUser || !dbUser.isActive) {
    // Revoke invalid/deactivated session cookie
    try {
      await clearSessionCookie();
    } catch {
      // Ignore if headers are already closed
    }
    throw new AuthError("Your account is deactivated. Access revoked.", 401);
  }

  // Ensure role is either PRINCIPAL or VICE_PRINCIPAL
  if (dbUser.role !== "PRINCIPAL" && dbUser.role !== "VICE_PRINCIPAL") {
    throw new AuthError("Access denied: Administrative privileges required.", 403);
  }

  return {
    id: dbUser.id,
    username: dbUser.username,
    fullName: dbUser.fullName,
    role: dbUser.role,
  };
}

/**
 * Non-throwing helper to get currently authenticated admin user, or null.
 */
export async function getAuthenticatedAdmin(): Promise<SessionUser | null> {
  try {
    return await requireAdminAuth();
  } catch {
    return null;
  }
}
