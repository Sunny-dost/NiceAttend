'use client';

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = '🖨️ Print This Card', className }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'inline-flex items-center gap-2 bg-blue-900 text-white rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-blue-800 transition-colors shadow-sm'
      }
    >
      {label}
    </button>
  );
}
