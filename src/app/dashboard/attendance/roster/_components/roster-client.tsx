"use client";

import { useState, useTransition } from "react";
import { AttendanceStatus } from "@prisma/client";
import {
  markManualAttendanceAction,
  confirmBulkAbsenceAction,
} from "@/actions/attendance";
import { StudentRosterItem } from "@/lib/attendance";
import { CorrectionModal } from "../../_components/correction-modal";

interface RosterClientProps {
  students: StudentRosterItem[];
  dateStr: string;
  classId?: string;
  sectionId?: string;
  unmarkedCount: number;
}

export function RosterClient({
  students,
  dateStr,
  classId,
  sectionId,
  unmarkedCount,
}: RosterClientProps) {
  const [activeModalData, setActiveModalData] = useState<{
    recordId: string;
    studentName: string;
    studentCode: string;
    currentStatus: AttendanceStatus;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleManualMark = (studentId: string, status: AttendanceStatus) => {
    setNotification(null);
    startTransition(async () => {
      const res = await markManualAttendanceAction(studentId, dateStr, status);
      if (res?.error) {
        setNotification({ type: "error", message: res.error });
      } else if (res?.message) {
        setNotification({ type: "success", message: res.message });
      }
    });
  };

  const handleBulkAbsence = () => {
    setNotification(null);
    setShowBulkConfirm(false);
    startTransition(async () => {
      const res = await confirmBulkAbsenceAction(dateStr, classId, sectionId);
      if (res?.error) {
        setNotification({ type: "error", message: res.error });
      } else if (res?.message) {
        setNotification({ type: "success", message: res.message });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : "⚠️"}</span>
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 px-1 text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk Action Header / Notice */}
      {unmarkedCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div>
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
              <span>⚠️</span> {unmarkedCount} Unmarked Student{unmarkedCount === 1 ? "" : "s"} Remaining
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Per school policy, students are never automatically marked absent. Confirm absences once arrival period concludes.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowBulkConfirm(true)}
            className="py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow transition flex-shrink-0 self-start sm:self-auto disabled:opacity-50"
          >
            Confirm Remaining as Absent
          </button>
        </div>
      )}

      {/* Confirmation Modal for Bulk Absence */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 text-slate-800">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span>⚠️</span> Confirm Bulk Absences
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              You are about to mark all <strong>{unmarkedCount}</strong> remaining unmarked students for <strong>{dateStr}</strong> as <strong className="text-rose-600">ABSENT</strong>.
              <br /><br />
              This action will create permanent manual attendance records for these students. Individual corrections can still be made afterwards.
            </p>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAbsence}
                disabled={isPending}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isPending ? "Confirming..." : "Confirm All as Absent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Roster Cards List */}
      <div className="space-y-2.5">
        {students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="text-sm font-semibold text-slate-600">No students match this criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query, class/section, or status filters.
            </p>
          </div>
        ) : (
          students.map((student) => {
            const record = student.attendanceRecord;
            const isUnmarked = !record;

            return (
              <div
                key={student.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isUnmarked
                    ? "border-slate-200"
                    : record.status === "PRESENT"
                    ? "border-emerald-200 bg-emerald-50/20"
                    : record.status === "LATE"
                    ? "border-amber-200 bg-amber-50/20"
                    : "border-rose-200 bg-rose-50/20"
                }`}
              >
                {/* Left: Student Identity */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {student.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-600 border border-slate-200">
                      {student.studentCode}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {student.class.name} · {student.section.name}
                    </span>
                  </div>

                  {/* Record Metadata (if marked) */}
                  {record && (
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <span>{record.method === "QR_SCAN" ? "📷 QR Scan" : "✍️ Manual"}</span>
                      </span>
                      <span>•</span>
                      <span>By {record.recordedBy.fullName}</span>
                      {record.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-400 max-w-xs truncate">
                            &quot;{record.notes}&quot;
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions / Status */}
                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
                  {isUnmarked ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 mr-1">
                        Unmarked
                      </span>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleManualMark(student.id, "PRESENT")}
                        className="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition disabled:opacity-50"
                        title="Mark Present"
                      >
                        + Present
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleManualMark(student.id, "LATE")}
                        className="py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold transition disabled:opacity-50"
                        title="Mark Late"
                      >
                        + Late
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleManualMark(student.id, "ABSENT")}
                        className="py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold transition disabled:opacity-50"
                        title="Mark Absent"
                      >
                        + Absent
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide shadow-sm ${
                          record.status === "PRESENT"
                            ? "bg-emerald-600 text-white"
                            : record.status === "LATE"
                            ? "bg-amber-600 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        {record.status}
                      </span>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          setActiveModalData({
                            recordId: record.id,
                            studentName: student.fullName,
                            studentCode: student.studentCode,
                            currentStatus: record.status,
                          })
                        }
                        className="py-1 px-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition"
                      >
                        ✏️ Correct
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Status Correction Modal */}
      {activeModalData && (
        <CorrectionModal
          isOpen={true}
          onClose={() => setActiveModalData(null)}
          recordId={activeModalData.recordId}
          studentName={activeModalData.studentName}
          studentCode={activeModalData.studentCode}
          currentStatus={activeModalData.currentStatus}
          dateStr={dateStr}
          onSuccess={() => {
            setNotification({
              type: "success",
              message: "Attendance status corrected and logged to audit trail.",
            });
          }}
        />
      )}
    </div>
  );
}
