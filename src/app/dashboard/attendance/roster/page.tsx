import Link from "next/link";
import { requireAdminAuth } from "@/lib/auth/guard";
import { getClassesWithSections } from "@/lib/students";
import {
  getDailyRoster,
  getTodayInSchoolTz,
  formatDateInSchoolTz,
} from "@/lib/attendance";
import { AttendanceNav } from "../_components/attendance-nav";
import { RosterClient } from "./_components/roster-client";

export const metadata = {
  title: "Daily Attendance Roster — NiceAttend",
  description: "View and manage daily attendance, manual entries, and corrections",
};

interface RosterPageProps {
  searchParams: {
    date?: string;
    classId?: string;
    sectionId?: string;
    statusFilter?: "ALL" | "UNMARKED" | "PRESENT" | "LATE" | "ABSENT";
    search?: string;
    page?: string;
  };
}

export default async function AttendanceRosterPage({
  searchParams,
}: RosterPageProps) {
  await requireAdminAuth();

  const todayStr = getTodayInSchoolTz();
  const dateStr = searchParams.date || todayStr;
  const classId = searchParams.classId;
  const sectionId = searchParams.sectionId;
  const statusFilter = searchParams.statusFilter || "ALL";
  const search = searchParams.search;
  const page = parseInt(searchParams.page || "1", 10) || 1;

  const [classes, rosterData] = await Promise.all([
    getClassesWithSections(),
    getDailyRoster({
      date: dateStr,
      classId,
      sectionId,
      statusFilter,
      search,
      page,
      pageSize: 25,
    }),
  ]);

  const { stats, students, totalFiltered, totalPages } = rosterData;

  // Selected class's sections for the section dropdown
  const selectedClass = classes.find((c) => c.id === classId);
  const sections = selectedClass?.sections || [];

  // Helper to build URL with updated searchParams
  const makeFilterUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (dateStr) params.set("date", dateStr);
    if (classId) params.set("classId", classId);
    if (sectionId) params.set("sectionId", sectionId);
    if (statusFilter && statusFilter !== "ALL") params.set("statusFilter", statusFilter);
    if (search) params.set("search", search);

    Object.entries(overrides).forEach(([key, val]) => {
      if (val === undefined || val === "" || (key === "statusFilter" && val === "ALL")) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    return `/dashboard/attendance/roster?${params.toString()}`;
  };

  return (
    <div className="space-y-6 pb-12">
      <AttendanceNav />

      {/* Date & Title Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Daily Attendance Roster
              </h2>
              {dateStr === todayStr && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formatDateInSchoolTz(new Date(`${dateStr}T00:00:00.000Z`))}
            </p>
          </div>

          {/* Date Selector Form */}
          <form method="GET" className="flex items-center gap-2 flex-wrap">
            {classId && <input type="hidden" name="classId" value={classId} />}
            {sectionId && <input type="hidden" name="sectionId" value={sectionId} />}
            {statusFilter !== "ALL" && (
              <input type="hidden" name="statusFilter" value={statusFilter} />
            )}
            {search && <input type="hidden" name="search" value={search} />}

            <input
              type="date"
              name="date"
              defaultValue={dateStr}
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white font-medium focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
            <button
              type="submit"
              className="py-1.5 px-3 bg-blue-900 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 transition"
            >
              Go
            </button>
            {dateStr !== todayStr && (
              <Link
                href={makeFilterUrl({ date: todayStr })}
                className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                Today
              </Link>
            )}
          </form>
        </div>

        {/* Attendance Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mt-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Enrolled
            </span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {stats.totalActive}
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Present
            </span>
            <span className="text-xl font-black text-emerald-700 mt-0.5 block">
              {stats.presentCount}
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Late
            </span>
            <span className="text-xl font-black text-amber-700 mt-0.5 block">
              {stats.lateCount}
            </span>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
              Absent
            </span>
            <span className="text-xl font-black text-rose-700 mt-0.5 block">
              {stats.absentCount}
            </span>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Unmarked
            </span>
            <span className="text-xl font-black text-slate-700 mt-0.5 block">
              {stats.unmarkedCount}
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
              Attendance
            </span>
            <span className="text-xl font-black text-blue-900 mt-0.5 block">
              {stats.attendanceRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input type="hidden" name="date" value={dateStr} />
          {statusFilter !== "ALL" && (
            <input type="hidden" name="statusFilter" value={statusFilter} />
          )}

          {/* Search Field */}
          <div className="sm:col-span-2">
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search by student name or roll number..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          {/* Class Select */}
          <div>
            <select
              name="classId"
              defaultValue={classId || ""}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white text-slate-700"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-blue-900 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 transition"
            >
              Filter
            </button>
            {(classId || sectionId || search) && (
              <Link
                href={`/dashboard/attendance/roster?date=${dateStr}`}
                className="py-2 px-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition text-center"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {/* Status Filter Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: "ALL", label: "All", count: stats.totalActive },
            { id: "UNMARKED", label: "Unmarked", count: stats.unmarkedCount },
            { id: "PRESENT", label: "Present", count: stats.presentCount },
            { id: "LATE", label: "Late", count: stats.lateCount },
            { id: "ABSENT", label: "Absent", count: stats.absentCount },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <Link
                key={tab.id}
                href={makeFilterUrl({ statusFilter: tab.id, page: "1" })}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label} ({tab.count})
              </Link>
            );
          })}
        </div>
      </div>

      {/* Student List & Actions */}
      <RosterClient
        students={students}
        dateStr={dateStr}
        classId={classId}
        sectionId={sectionId}
        unmarkedCount={stats.unmarkedCount}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs">
          <span className="text-slate-500">
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalFiltered} students)
          </span>

          <div className="flex items-center gap-1.5">
            {page > 1 ? (
              <Link
                href={makeFilterUrl({ page: String(page - 1) })}
                className="py-1.5 px-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Prev
              </Link>
            ) : (
              <span className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed">
                ← Prev
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={makeFilterUrl({ page: String(page + 1) })}
                className="py-1.5 px-3 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next →
              </Link>
            ) : (
              <span className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-300 cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
