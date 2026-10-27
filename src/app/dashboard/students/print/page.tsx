import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { requireAdminAuth } from '@/lib/auth/guard';
import prisma from '@/lib/prisma';
import { generateQrDataUrl } from '@/lib/qr';
import { IdCard } from '../_components/id-card';
import { PrintButton } from '../_components/print-button';

export const metadata = { title: 'Print ID Cards — NiceAttend' };

interface PrintPageSearchParams {
  ids?: string;
  classId?: string;
  sectionId?: string;
}

export default async function PrintPage({
  searchParams,
}: {
  searchParams: PrintPageSearchParams;
}) {
  await requireAdminAuth();

  // Build Prisma where clause
  const where: Prisma.StudentWhereInput = { isActive: true };

  if (searchParams.ids) {
    const idList = searchParams.ids.split(',').map((s) => s.trim()).filter(Boolean);
    where.id = { in: idList };
  } else if (searchParams.classId) {
    where.classId = searchParams.classId;
    if (searchParams.sectionId) {
      where.sectionId = searchParams.sectionId;
    }
  }

  // Limit to 100 max for performance
  const students = await prisma.student.findMany({
    where,
    orderBy: [{ class: { displayOrder: 'asc' } }, { fullName: 'asc' }],
    take: 100,
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });

  // Generate QR data URLs server-side for all students
  const studentsWithQr = await Promise.all(
    students.map(async (s) => ({
      ...s,
      qrDataUrl: await generateQrDataUrl(s.qrToken),
    }))
  );

  const isFiltered = !!(searchParams.ids || searchParams.classId);

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-content { display: block !important; }
          @page { size: A4; margin: 10mm; }
          .card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            width: 100%;
          }
          .id-card-wrapper {
            border: 1px dashed #ccc;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 4px;
          }
        }
      `}</style>

      {/* Screen-only header */}
      <div className="print:hidden mb-6">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 font-medium"
        >
          ← Back to Students
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Print ID Cards</h2>
            <p className="text-sm text-slate-500">
              {studentsWithQr.length} card{studentsWithQr.length !== 1 ? 's' : ''} ready
              {!isFiltered && ' — showing all active students'}
            </p>
          </div>

          <PrintButton label="🖨️ Print All Cards" />
        </div>

        {/* Performance note */}
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
          <strong>💡 Tip:</strong> Printing by class/section is recommended for best
          performance (25–50 students at a time). Maximum 100 cards per sheet.
        </div>

        {/* Filter quick-links */}
        <div className="mt-3 text-xs text-slate-500">
          Filter by URL params:{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
            ?classId=...&amp;sectionId=...
          </code>{' '}
          or{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
            ?ids=id1,id2,...
          </code>
        </div>
      </div>

      {/* Cards grid — visible on screen + print */}
      <div id="print-content">
        {studentsWithQr.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div className="text-5xl mb-4">🪪</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No students found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your filters or add students first.
            </p>
          </div>
        ) : (
          <div className="card-grid grid grid-cols-2 gap-3">
            {studentsWithQr.map((student) => (
              <div
                key={student.id}
                className="id-card-wrapper flex justify-center border border-dashed border-slate-300 rounded-xl p-2"
              >
                <IdCard
                  fullName={student.fullName}
                  studentCode={student.studentCode}
                  className={student.class.name}
                  sectionName={student.section.name}
                  qrDataUrl={student.qrDataUrl}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
