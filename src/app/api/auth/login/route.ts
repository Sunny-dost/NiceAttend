import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // 1. Rate limiting
    const rateLimit = checkRateLimit(username);
    if (rateLimit.isBlocked) {
      return NextResponse.json(
        {
          error: "Too many failed login attempts",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Query user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      recordFailedAttempt(username);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account deactivated. Access revoked" },
        { status: 401 }
      );
    }

    // 3. Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(username);
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    resetRateLimit(username);

    // 4. Create and set session
    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("API login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: "Logged out" });
}
