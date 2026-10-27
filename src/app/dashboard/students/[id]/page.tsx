import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/guard";
import { getStudentById } from "@/lib/students";
import {
  getStudentAttendanceHistory,
  formatDateInSchoolTz,
  formatTimeInSchoolTz,
} from "@/lib/attendance";
import { deactivateStudentAction, reactivateStudentAction } from "@/actions/students";

export const metadata = { title: "Student Detail — NiceAttend" };

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminAuth();

  const [student, history] = await Promise.all([
    getStudentById(params.id),
    getStudentAttendanceHistory(params.id, 15),
  ]);
  if (!student) notFound();

  async function deactivate() {
    "use server";
    await deactivateStudentAction(params.id);
  }

  async function reactivate() {
    "use server";
    await reactivateStudentAction(params.id);
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 font-medium"
      >
        ← Back to Students
      </Link>

      {/* Status banner */}
      <div
        className={`rounded-2xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm font-semibold ${
          student.isActive
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}
      >
        <span>{student.isActive ? "✓ Active Student" : "✕ Inactive Student"}</span>
      </div>

      {/* Student info card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-2xl flex-shrink-0">
            {student.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{student.fullName}</h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-medium">
              {student.studentCode}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <InfoRow label="Class" value={student.class.name} />
          <InfoRow label="Section" value={student.section.name} />
          <InfoRow
            label="Guardian Phone"
            value={student.guardianPhone ?? "—"}
          />
          <InfoRow
            label="Enrolled"
            value={new Date(student.createdAt).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
          <div className="col-span-2">
            <InfoRow
              label="QR Token"
              value={`${student.qrToken.slice(0, 16)}…`}
              mono
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Link
          href={`/dashboard/students/${student.id}/edit`}
          className="flex-1 text-center bg-blue-900 text-white rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-blue-800 transition-colors"
        >
          ✏️ Edit Student
        </Link>

        <Link
          href={`/dashboard/students/${student.id}/card`}
          className="flex-1 text-center border border-blue-300 text-blue-900 bg-blue-50 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-blue-100 transition-colors"
        >
          🪪 View ID Card
        </Link>

        {student.isActive ? (
          <form action={deactivate} className="flex-1">
            <button
              type="submit"
              className="w-full border border-rose-300 text-rose-700 bg-rose-50 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-rose-100 transition-colors"
            >
              Deactivate
            </button>
          </form>
        ) : (
          <form action={reactivate} className="flex-1">
            <button
              type="submit"
              className="w-full border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-emerald-100 transition-colors"
            >
              Reactivate
            </button>
          </form>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>📅</span> Recent Attendance History
          </h3>
          <span className="text-xs text-slate-400">
            {history.length} record{history.length === 1 ? "" : "s"}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            No attendance records logged for this student yet.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => {
              const statusColor =
                rec.status === "PRESENT"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : rec.status === "LATE"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-rose-100 text-rose-800 border-rose-200";

              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 text-xs bg-slate-50/50"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {formatDateInSchoolTz(rec.attendanceDate)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {rec.scanTime ? formatTimeInSchoolTz(rec.scanTime) : "Manual Roster"} • By {rec.recordedBy.fullName}
                    </span>
                    {rec.notes && (
                      <span className="block text-[11px] text-slate-400 italic">
                        &quot;{rec.notes}&quot;
                      </span>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${statusColor}`}
                    >
                      {rec.status}
                    </span>
                    {rec.auditLogs.length > 0 && (
                      <span className="text-[10px] text-blue-700 font-medium">
                        ✏️ Corrected ({rec.auditLogs.length})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className={`text-slate-900 font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}
