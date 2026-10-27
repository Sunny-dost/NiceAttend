import Link from "next/link";
import { requireAdminAuth } from "@/lib/auth/guard";
import {
  getAttendanceAuditLogs,
  formatTimeInSchoolTz,
  formatDateInSchoolTz,
} from "@/lib/attendance";
import { AttendanceNav } from "../_components/attendance-nav";

export const metadata = {
  title: "Attendance Audit Trail — NiceAttend",
  description: "Immutable forensic log of attendance status modifications",
};

interface AuditPageProps {
  searchParams: {
    date?: string;
    studentId?: string;
    page?: string;
  };
}

export default async function AttendanceAuditPage({
  searchParams,
}: AuditPageProps) {
  await requireAdminAuth();

  const date = searchParams.date;
  const studentId = searchParams.studentId;
  const page = parseInt(searchParams.page || "1", 10) || 1;

  const { total, totalPages, logs } = await getAttendanceAuditLogs({
    date,
    studentId,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6 pb-12">
      <AttendanceNav />

      {/* Title & Overview Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Attendance Audit Trail
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                {total} Event{total === 1 ? "" : "s"} Logged
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Immutable forensic ledger recording every administrative status override, justification note, and operator identity.
            </p>
          </div>

          {/* Date Filter */}
          <form method="GET" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date || ""}
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
            <button
              type="submit"
              className="py-1.5 px-3 bg-blue-900 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 transition"
            >
              Filter
            </button>
            {date && (
              <Link
                href="/dashboard/attendance/audit"
                className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400">
            <span className="text-4xl block mb-2">🛡️</span>
            <p className="text-sm font-semibold text-slate-700">No audit events recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              Whenever an administrator updates an existing attendance record, an immutable forensic entry will appear here.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const student = log.attendanceRecord.student;
            const logDate = log.createdAt;

            return (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
              >
                {/* Header: Student Identity + Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {student.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-600 border border-slate-200">
                      {student.studentCode}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {student.class.name} · {student.section.name}
                    </span>
                  </div>

                  <div className="text-slate-400 font-mono text-[11px]">
                    {formatDateInSchoolTz(logDate)} at {formatTimeInSchoolTz(logDate)}
                  </div>
                </div>

                {/* Transition & Changed By */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  {/* Status Badges Transition */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Status Changed:</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 line-through">
                      {log.previousStatus}
                    </span>
                    <span className="text-slate-400 font-bold">→</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                        log.newStatus === "PRESENT"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : log.newStatus === "LATE"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {log.newStatus}
                    </span>
                  </div>

                  {/* Operator Info */}
                  <div className="text-slate-600 text-xs">
                    Modified by: <strong className="text-blue-900">{log.changedBy.fullName}</strong>{" "}
                    <span className="text-slate-400">({log.changedBy.role})</span>
                  </div>
                </div>

                {/* Mandatory Justification Reason */}
                {log.reason && (
                  <div className="bg-slate-50 border-l-4 border-blue-900 rounded-r-xl p-3 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-0.5">
                      Justification Reason:
                    </span>
                    <p className="italic text-slate-600 leading-relaxed">
                      &quot;{log.reason}&quot;
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs">
          <span className="text-slate-500">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total logs)
          </span>

          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/dashboard/attendance/audit?page=${page - 1}${date ? `&date=${date}` : ""}`}
                className="py-1.5 px-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Prev
              </Link>
            ) : (
              <span className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed">
                ← Prev
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={`/dashboard/attendance/audit?page=${page + 1}${date ? `&date=${date}` : ""}`}
                className="py-1.5 px-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next →
              </Link>
            ) : (
              <span className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
