export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-900 mb-4">
          Phase 3 Configured
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Nice School System
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          NiceAttend — Attendance Management System
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Project structure, Tailwind CSS, Prisma ORM schema, and 500-student demo seed definitions initialized.
        </p>
      </div>
    </main>
  );
}
