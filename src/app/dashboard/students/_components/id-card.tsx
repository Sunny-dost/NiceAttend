/** Reusable ID card visual component */
export function IdCard({
  fullName,
  studentCode,
  className,
  sectionName,
  qrDataUrl,
  compact = false,
}: {
  fullName: string;
  studentCode: string;
  className: string;
  sectionName: string;
  qrDataUrl: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col items-center text-center ${
        compact ? "p-3 w-[180px]" : "p-6 w-[280px]"
      }`}
    >
      {/* School name */}
      <div
        className={`font-bold text-blue-900 tracking-tight leading-tight ${
          compact ? "text-[10px] mb-1" : "text-base mb-2"
        }`}
      >
        NICE SCHOOL SYSTEM
      </div>

      <div
        className={`w-full border-t border-slate-200 ${compact ? "mb-2" : "mb-3"}`}
      />

      {/* QR Code */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt={`QR code for ${fullName}`}
        className={compact ? "w-24 h-24 mb-2" : "w-40 h-40 mb-3"}
      />

      {/* Student info */}
      <p
        className={`font-bold text-slate-900 leading-tight ${
          compact ? "text-xs mb-0.5" : "text-lg mb-1"
        }`}
      >
        {fullName}
      </p>

      <span
        className={`inline-block bg-slate-100 text-slate-600 font-mono font-medium rounded-md ${
          compact ? "px-1.5 py-0.5 text-[9px] mb-1" : "px-2.5 py-0.5 text-xs mb-1.5"
        }`}
      >
        {studentCode}
      </span>

      <p
        className={`text-slate-500 ${compact ? "text-[9px] mb-2" : "text-xs mb-3"}`}
      >
        {className} · {sectionName}
      </p>

      <div
        className={`w-full border-t border-slate-200 ${compact ? "mb-1.5" : "mb-2"}`}
      />

      {/* Footer */}
      <p
        className={`text-slate-400 leading-tight ${
          compact ? "text-[8px]" : "text-[10px]"
        }`}
      >
        If found, please return to
        <br />
        <span className="font-semibold text-slate-500">Nice School System</span>
      </p>
    </div>
  );
}
