"use client";

import { ScanResult } from "./scan-result-card";

export function ScanHistory({ history }: { history: ScanResult[] }) {
  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-sm">No scans in this session yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Scanned student cards will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800">
          Session Scans ({history.length})
        </h3>
        <span className="text-xs text-slate-400">Latest first</span>
      </div>

      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto space-y-1">
        {history.map((item, idx) => {
          const dotColor =
            item.type === "success"
              ? "bg-emerald-500"
              : item.type === "late"
              ? "bg-amber-500"
              : item.type === "duplicate"
              ? "bg-yellow-500"
              : "bg-rose-500";

          return (
            <div
              key={`${item.timestamp.getTime()}-${idx}`}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                <div className="truncate">
                  <p className="font-semibold text-slate-900 truncate">
                    {item.student?.fullName || item.message}
                  </p>
                  <p className="text-slate-500 font-mono text-[11px] truncate">
                    {item.student?.studentCode}
                    {item.student?.className ? ` · ${item.student.className}` : ""}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    item.status === "PRESENT"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.status === "LATE"
                      ? "bg-amber-100 text-amber-800"
                      : item.type === "duplicate"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {item.status || item.type}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {item.timeFormatted ||
                    new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }).format(item.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
