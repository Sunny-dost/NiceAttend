"use client";

export type ScanResultType =
  | "success"
  | "late"
  | "duplicate"
  | "inactive"
  | "unknown"
  | "error";

export interface ScanResult {
  type: ScanResultType;
  message: string;
  student?: {
    id?: string;
    fullName: string;
    studentCode: string;
    className?: string;
    sectionName?: string;
  };
  status?: "PRESENT" | "LATE";
  timeFormatted?: string;
  recordedBy?: string;
  existing?: {
    status: string;
    formattedTime?: string;
    recordedBy: string;
  };
  timestamp: Date;
}

export function ScanResultCard({ result }: { result: ScanResult }) {
  const config = {
    success: {
      bg: "bg-emerald-50 border-emerald-300",
      badge: "bg-emerald-600 text-white",
      badgeLabel: "PRESENT",
      icon: "✅",
      titleColor: "text-emerald-950",
      subColor: "text-emerald-800",
    },
    late: {
      bg: "bg-amber-50 border-amber-300",
      badge: "bg-amber-600 text-white",
      badgeLabel: "LATE ARRIVAL",
      icon: "⚠️",
      titleColor: "text-amber-950",
      subColor: "text-amber-800",
    },
    duplicate: {
      bg: "bg-yellow-50 border-yellow-300",
      badge: "bg-yellow-600 text-white",
      badgeLabel: "ALREADY MARKED",
      icon: "🔁",
      titleColor: "text-yellow-950",
      subColor: "text-yellow-800",
    },
    inactive: {
      bg: "bg-orange-50 border-orange-300",
      badge: "bg-orange-600 text-white",
      badgeLabel: "INACTIVE STUDENT",
      icon: "⛔",
      titleColor: "text-orange-950",
      subColor: "text-orange-800",
    },
    unknown: {
      bg: "bg-rose-50 border-rose-300",
      badge: "bg-rose-600 text-white",
      badgeLabel: "INVALID QR CODE",
      icon: "❌",
      titleColor: "text-rose-950",
      subColor: "text-rose-800",
    },
    error: {
      bg: "bg-rose-50 border-rose-300",
      badge: "bg-rose-600 text-white",
      badgeLabel: "SCAN ERROR",
      icon: "⚠️",
      titleColor: "text-rose-950",
      subColor: "text-rose-800",
    },
  }[result.type];

  return (
    <div
      className={`border-2 rounded-2xl p-4 transition-all duration-200 shadow-sm ${config.bg}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Status icon">
            {config.icon}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${config.badge}`}
          >
            {config.badgeLabel}
          </span>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {result.timeFormatted ||
            new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            }).format(result.timestamp)}
        </span>
      </div>

      {result.student && (
        <div className="mt-1">
          <h4 className={`text-lg font-bold leading-snug ${config.titleColor}`}>
            {result.student.fullName}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-white/80 font-mono font-semibold text-slate-700 border border-slate-200">
              {result.student.studentCode}
            </span>
            {result.student.className && (
              <span className={`font-medium ${config.subColor}`}>
                {result.student.className}
                {result.student.sectionName ? ` · ${result.student.sectionName}` : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {result.type === "duplicate" && result.existing && (
        <p className={`mt-2 text-xs font-medium ${config.subColor}`}>
          Already recorded as{" "}
          <strong className="underline">{result.existing.status}</strong>
          {result.existing.formattedTime ? ` at ${result.existing.formattedTime}` : ""}
          {result.existing.recordedBy ? ` by ${result.existing.recordedBy}` : ""}.
        </p>
      )}

      {result.type === "inactive" && (
        <p className={`mt-2 text-xs font-medium ${config.subColor}`}>
          This student record is currently marked inactive/withdrawn. Please contact the office.
        </p>
      )}

      {(result.type === "unknown" || result.type === "error") && (
        <p className={`mt-2 text-xs font-medium ${config.subColor}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
