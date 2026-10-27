import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminAuth } from '@/lib/auth/guard';
import { getStudentById } from '@/lib/students';
import { generateQrDataUrl } from '@/lib/qr';
import { regenerateQrTokenAction } from '@/actions/qr';
import { PrintButton } from '../../_components/print-button';
import { IdCard } from '../../_components/id-card';

export const metadata = { title: 'Student ID Card — NiceAttend' };

export default async function StudentCardPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminAuth();

  const student = await getStudentById(params.id);
  if (!student) notFound();

  const qrDataUrl = await generateQrDataUrl(student.qrToken);

  async function regenerate() {
    'use server';
    await regenerateQrTokenAction(params.id);
  }

  return (
    <>
      {/* Print-only: hide everything except #print-content */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-content { display: block !important; }
          @page { size: A4; margin: 20mm; }
        }
        @media screen {
          #print-content { display: block; }
        }
      `}</style>

      {/* Screen-only controls */}
      <div className="max-w-sm mx-auto print:hidden">
        <Link
          href={`/dashboard/students/${student.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 font-medium"
        >
          ← Back to Student
        </Link>

        <h2 className="text-xl font-bold text-slate-900 mb-4">Student ID Card</h2>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <PrintButton label="🖨️ Print This Card" />

          <form action={regenerate}>
            <button
              type="submit"
              className="w-full border border-rose-300 text-rose-700 bg-rose-50 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-rose-100 transition-colors"
            >
              🔄 Regenerate QR Token
            </button>
            <p className="text-xs text-slate-500 mt-1.5 text-center">
              ⚠️ This will invalidate the student&apos;s current physical ID card.
            </p>
          </form>
        </div>
      </div>

      {/* ID Card — shown on screen + printed */}
      <div id="print-content" className="flex justify-center">
        <IdCard
          fullName={student.fullName}
          studentCode={student.studentCode}
          className={student.class.name}
          sectionName={student.section.name}
          qrDataUrl={qrDataUrl}
        />
      </div>
    </>
  );
}
