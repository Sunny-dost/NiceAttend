"use client";

import { useState, useTransition } from "react";
import { AttendanceStatus } from "@prisma/client";
import { correctAttendanceStatusAction } from "@/actions/attendance";

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  studentName: string;
  studentCode: string;
  currentStatus: AttendanceStatus;
  dateStr: string;
  onSuccess?: () => void;
}

export function CorrectionModal({
  isOpen,
  onClose,
  recordId,
  studentName,
  studentCode,
  currentStatus,
  dateStr,
  onSuccess,
}: CorrectionModalProps) {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(
    currentStatus === "PRESENT" ? "LATE" : "PRESENT"
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newStatus === currentStatus) {
      setError("Please select a status different from the current status.");
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError("A justification reason (min. 3 characters) is required for audit trail compliance.");
      return;
    }

    startTransition(async () => {
      const res = await correctAttendanceStatusAction(
        recordId,
        newStatus,
        reason.trim()
      );

      if (res?.error) {
        setError(res.error);
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>✏️</span> Correct Attendance Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mandatory forensic audit log will be created
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Student & Record Summary */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mb-4 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-900 text-sm">{studentName}</span>
            <span className="font-mono text-slate-500">{studentCode}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 mt-1">
            <span>Date: <strong>{dateStr}</strong></span>
            <span>
              Current:{" "}
              <strong
                className={
                  currentStatus === "PRESENT"
                    ? "text-emerald-700"
                    : currentStatus === "LATE"
                    ? "text-amber-700"
                    : "text-rose-700"
                }
              >
                {currentStatus}
              </strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              New Status:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["PRESENT", "LATE", "ABSENT"] as AttendanceStatus[]).map(
                (status) => {
                  const isSelected = newStatus === status;
                  const isCurrent = currentStatus === status;

                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => setNewStatus(status)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        isCurrent
                          ? "opacity-35 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                          : isSelected
                          ? status === "PRESENT"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : status === "LATE"
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {status}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student arrived at 08:05 due to official school bus delay. Authorized by Principal."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 focus:outline-none placeholder-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Required by Nice School System compliance policy. Recorded in immutable audit log.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              {isPending ? "Recording..." : "Save Correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
