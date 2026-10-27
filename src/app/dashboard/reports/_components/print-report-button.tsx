"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 active:bg-slate-900 transition shadow-sm"
    >
      <span>🖨️</span>
      <span>Print Official Report</span>
    </button>
  );
}
