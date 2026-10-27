import { requireAdminAuth } from "@/lib/auth/guard";
import { generateAttendanceCsv, getTodayInSchoolTz } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || getTodayInSchoolTz();
  const classId = searchParams.get("classId") || undefined;
  const sectionId = searchParams.get("sectionId") || undefined;
  const statusFilter = (searchParams.get("statusFilter") as
    | "ALL"
    | "UNMARKED"
    | "PRESENT"
    | "LATE"
    | "ABSENT") || undefined;
  const search = searchParams.get("search") || undefined;

  const csvContent = await generateAttendanceCsv({
    date,
    classId,
    sectionId,
    statusFilter,
    search,
  });

  const filename = `niceattend-attendance-${date}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
