"use server";

import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limiter";
import { redirect } from "next/navigation";

export interface LoginResult {
  error?: string;
  retryAfterSeconds?: number;
}

/**
 * Server action to authenticate Principal or Vice Principal.
 */
export async function loginAction(
  prevState: LoginResult | undefined,
  formData: FormData
): Promise<LoginResult> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Please enter both username and password." };
  }

  // 1. Check rate limit
  const rateLimit = checkRateLimit(username);
  if (rateLimit.isBlocked) {
    return {
      error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  // 2. Query user from database
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { username },
    });
  } catch (err) {
    console.error("Database error during authentication:", err);
    return { error: "Service temporarily unavailable. Please try again later." };
  }

  // 3. Prevent user enumeration & verify credentials
  if (!user) {
    recordFailedAttempt(username);
    return { error: "Invalid username or password." };
  }

  if (!user.isActive) {
    return { error: "Account deactivated. Access revoked." };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    recordFailedAttempt(username);
    return { error: "Invalid username or password." };
  }

  // 4. Reset rate limit on successful credentials
  resetRateLimit(username);

  // 5. Issue secure HTTP-only session cookie
  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });

  await setSessionCookie(token);

  // 6. Redirect to dashboard
  redirect("/dashboard");
}

/**
 * Server action to log out user and clear session cookie.
 */
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
