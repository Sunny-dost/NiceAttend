import Link from "next/link";
import { getStudents, getClassesWithSections } from "@/lib/students";
import { requireAdminAuth } from "@/lib/auth/guard";

export const metadata = { title: "Students — NiceAttend" };

interface SearchParams {
  search?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  page?: string;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminAuth();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const status =
    searchParams.status === "active" || searchParams.status === "inactive"
      ? searchParams.status
      : "all";

  const [{ students, total, totalPages }, classes] = await Promise.all([
    getStudents({
      search: searchParams.search,
      classId: searchParams.classId,
      sectionId: searchParams.sectionId,
      status,
      page,
      pageSize: 25,
    }),
    getClassesWithSections(),
  ]);

  // Sections for selected class
  const selectedClass = classes.find((c) => c.id === searchParams.classId);
  const sections = selectedClass?.sections ?? [];

  // Build query string helper
  function buildQuery(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {
      ...(searchParams.search ? { search: searchParams.search } : {}),
      ...(searchParams.classId ? { classId: searchParams.classId } : {}),
      ...(searchParams.sectionId ? { sectionId: searchParams.sectionId } : {}),
      ...(searchParams.status ? { status: searchParams.status } : {}),
      page: String(page),
    };
    const merged = { ...base, ...overrides };
    // Remove undefined/empty
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/dashboard/students?${params.toString()}`;
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Students</h2>
          <p className="text-sm text-slate-500">
            {total} student{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/students/print"
            className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm"
          >
            🖨️ Print All Cards
          </Link>
          <Link
            href="/dashboard/students/new"
            className="inline-flex items-center gap-1.5 bg-blue-900 text-white rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-blue-800 transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span>
            Add Student
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            name="search"
            defaultValue={searchParams.search}
            placeholder="Search by name or code…"
            className="w-full border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Class filter */}
          <select
            name="classId"
            defaultValue={searchParams.classId ?? ""}
            className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Section filter */}
          <select
            name="sectionId"
            defaultValue={searchParams.sectionId ?? ""}
            className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            name="status"
            defaultValue={searchParams.status ?? "all"}
            className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-blue-800 transition-colors"
          >
            Apply Filters
          </button>
          <Link
            href="/dashboard/students"
            className="flex-1 text-center border border-slate-300 text-slate-700 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Clear
          </Link>
        </div>
      </form>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No students found</h3>
          <p className="text-sm text-slate-500 mb-6">
            {searchParams.search || searchParams.classId || searchParams.sectionId
              ? "Try adjusting your search or filters."
              : "Get started by adding your first student."}
          </p>
          <Link
            href="/dashboard/students/new"
            className="inline-flex items-center gap-1.5 bg-blue-900 text-white rounded-xl py-2.5 px-5 font-semibold text-sm hover:bg-blue-800 transition-colors"
          >
            + Add Student
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-base flex-shrink-0">
                {student.fullName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight">
                      {student.fullName}
                    </p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-medium">
                      {student.studentCode}
                    </span>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      student.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {student.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {student.class.name} · {student.section.name}
                </p>
              </div>

              <Link
                href={`/dashboard/students/${student.id}`}
                className="flex-shrink-0 text-blue-900 font-semibold text-sm hover:underline"
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildQuery({ page: String(page - 1) })}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildQuery({ page: String(page + 1) })}
                className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
