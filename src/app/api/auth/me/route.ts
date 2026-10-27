import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedAdmin();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
