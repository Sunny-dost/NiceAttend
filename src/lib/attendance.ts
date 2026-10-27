import { Prisma, AttendanceStatus, AttendanceMethod } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * School schedule configuration and timezone utilities for NiceAttend.
 */
export const SCHOOL_TIMEZONE = process.env.SCHOOL_TIMEZONE || "Asia/Karachi";

export const SCHEDULE = {
  // Gate opens at 07:30, on-time cutoff 08:00, late threshold until 08:30
  presentCutoffHour: 8, // 08:00 AM
  presentCutoffMinute: 0,
  lateCutoffHour: 8, // 08:30 AM
  lateCutoffMinute: 30,
} as const;

/**
 * Get today's date string in YYYY-MM-DD in the school's timezone.
 */
export function getTodayInSchoolTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Get the current local time in the school's timezone as { hours, minutes }.
 */
export function getCurrentTimeInSchoolTz(): { hours: number; minutes: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { hours, minutes };
}

/**
 * Determine attendance status based on the current school-timezone time.
 * Returns 'PRESENT' if before or at the cutoff, 'LATE' if after.
 */
export function determineAttendanceStatus(): "PRESENT" | "LATE" {
  const { hours, minutes } = getCurrentTimeInSchoolTz();
  const totalMinutes = hours * 60 + minutes;
  const cutoff = SCHEDULE.presentCutoffHour * 60 + SCHEDULE.presentCutoffMinute;
  return totalMinutes <= cutoff ? "PRESENT" : "LATE";
}

/**
 * Format a timestamp for display in the school timezone.
 */
export function formatTimeInSchoolTz(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Format date for display in the school timezone.
 */
export function formatDateInSchoolTz(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// -------------------------------------------------------------
// Data-fetching helpers for Phase 8 Manual Roster & Audit Trail
// -------------------------------------------------------------

export interface DailyRosterParams {
  date?: string; // YYYY-MM-DD
  classId?: string;
  sectionId?: string;
  statusFilter?: "ALL" | "UNMARKED" | "PRESENT" | "LATE" | "ABSENT";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DailyRosterStats {
  totalActive: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  unmarkedCount: number;
  attendanceRate: number;
}

export interface StudentRosterItem {
  id: string;
  studentCode: string;
  fullName: string;
  class: { id: string; name: string };
  section: { id: string; name: string };
  attendanceRecord: {
    id: string;
    status: AttendanceStatus;
    method: AttendanceMethod;
    scanTime: Date | null;
    createdAt: Date;
    notes: string | null;
    recordedBy: { fullName: string; role: string };
  } | null;
}

/**
 * Fetches the daily student attendance roster with summary metrics,
 * filtering, search, and pagination.
 */
export async function getDailyRoster(params: DailyRosterParams) {
  const dateStr = params.date || getTodayInSchoolTz();
  const attendanceDate = new Date(`${dateStr}T00:00:00.000Z`);
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 25);
  const statusFilter = params.statusFilter || "ALL";

  // Base scope for active students (optionally constrained by class/section)
  const baseStudentWhere: Prisma.StudentWhereInput = {
    isActive: true,
  };
  if (params.classId) baseStudentWhere.classId = params.classId;
  if (params.sectionId) baseStudentWhere.sectionId = params.sectionId;

  // 1. Calculate overall stats for this date and scope
  const [totalActive, groupedStats] = await Promise.all([
    prisma.student.count({ where: baseStudentWhere }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        attendanceDate,
        student: baseStudentWhere,
      },
      _count: { _all: true },
    }),
  ]);

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;

  for (const group of groupedStats) {
    if (group.status === "PRESENT") presentCount = group._count._all;
    else if (group.status === "LATE") lateCount = group._count._all;
    else if (group.status === "ABSENT") absentCount = group._count._all;
  }

  const unmarkedCount = Math.max(
    0,
    totalActive - (presentCount + lateCount + absentCount)
  );

  const attendanceRate =
    totalActive > 0
      ? Math.round(((presentCount + lateCount) / totalActive) * 100)
      : 0;

  const stats: DailyRosterStats = {
    totalActive,
    presentCount,
    lateCount,
    absentCount,
    unmarkedCount,
    attendanceRate,
  };

  // 2. Build filtered student query for the roster table/cards
  const filterWhere: Prisma.StudentWhereInput = {
    ...baseStudentWhere,
  };

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    filterWhere.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentCode: { contains: q, mode: "insensitive" } },
    ];
  }

  if (statusFilter === "UNMARKED") {
    filterWhere.attendanceRecords = { none: { attendanceDate } };
  } else if (
    statusFilter === "PRESENT" ||
    statusFilter === "LATE" ||
    statusFilter === "ABSENT"
  ) {
    filterWhere.attendanceRecords = {
      some: { attendanceDate, status: statusFilter },
    };
  }

  const [totalFiltered, rawStudents] = await Promise.all([
    prisma.student.count({ where: filterWhere }),
    prisma.student.findMany({
      where: filterWhere,
      orderBy: [
        { class: { displayOrder: "asc" } },
        { section: { name: "asc" } },
        { studentCode: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        attendanceRecords: {
          where: { attendanceDate },
          include: {
            recordedBy: { select: { fullName: true, role: true } },
          },
          take: 1,
        },
      },
    }),
  ]);

  const students: StudentRosterItem[] = rawStudents.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    class: s.class,
    section: s.section,
    attendanceRecord: s.attendanceRecords[0]
      ? {
          id: s.attendanceRecords[0].id,
          status: s.attendanceRecords[0].status,
          method: s.attendanceRecords[0].method,
          scanTime: s.attendanceRecords[0].scanTime,
          createdAt: s.attendanceRecords[0].createdAt,
          notes: s.attendanceRecords[0].notes,
          recordedBy: s.attendanceRecords[0].recordedBy,
        }
      : null,
  }));

  return {
    date: dateStr,
    stats,
    students,
    totalFiltered,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalFiltered / pageSize)),
  };
}

/**
 * Fetch immutable attendance audit trail entries.
 */
export async function getAttendanceAuditLogs(params: {
  date?: string;
  studentId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { date, studentId, page = 1, pageSize = 30 } = params;
  const where: Prisma.AttendanceAuditLogWhereInput = {};

  if (studentId) {
    where.attendanceRecord = { studentId };
  } else if (date) {
    const attendanceDate = new Date(`${date}T00:00:00.000Z`);
    where.attendanceRecord = { attendanceDate };
  }

  const [total, logs] = await Promise.all([
    prisma.attendanceAuditLog.count({ where }),
    prisma.attendanceAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        changedBy: { select: { fullName: true, role: true, username: true } },
        attendanceRecord: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                studentCode: true,
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    logs,
  };
}

/**
 * Fetch attendance history for an individual student.
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  limit = 30
) {
  return prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { attendanceDate: "desc" },
    take: limit,
    include: {
      recordedBy: { select: { fullName: true, role: true } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          changedBy: { select: { fullName: true, role: true } },
        },
      },
    },
  });
}

// -------------------------------------------------------------
// Phase 9: Class Breakdowns, RFC 4180 CSV & Export Helpers
// -------------------------------------------------------------

export interface SectionAttendanceSummary {
  id: string;
  name: string;
  totalActive: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  unmarkedCount: number;
  attendanceRate: number;
}

export interface ClassAttendanceSummary {
  id: string;
  name: string;
  displayOrder: number;
  totalActive: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  unmarkedCount: number;
  attendanceRate: number;
  sections: SectionAttendanceSummary[];
}

/**
 * Fetch hierarchical class and section attendance metrics for the mobile dashboard.
 */
export async function getClassAttendanceBreakdown(
  dateStr?: string
): Promise<{
  date: string;
  overallStats: DailyRosterStats;
  classes: ClassAttendanceSummary[];
}> {
  const targetDateStr = dateStr || getTodayInSchoolTz();
  const attendanceDate = new Date(`${targetDateStr}T00:00:00.000Z`);

  // 1. Fetch all classes and their sections
  const classesData = await prisma.class.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      sections: {
        orderBy: { name: "asc" },
      },
    },
  });

  // 2. Fetch all active students
  const activeStudents = await prisma.student.findMany({
    where: { isActive: true },
    select: {
      id: true,
      classId: true,
      sectionId: true,
    },
  });

  // 3. Fetch attendance records for this date
  const records = await prisma.attendanceRecord.findMany({
    where: {
      attendanceDate,
      student: { isActive: true },
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  const statusByStudentId = new Map<string, AttendanceStatus>();
  for (const r of records) {
    statusByStudentId.set(r.studentId, r.status);
  }

  type Accumulator = {
    total: number;
    present: number;
    late: number;
    absent: number;
  };

  const sectionMap = new Map<string, Accumulator>();
  const classMap = new Map<string, Accumulator>();

  for (const student of activeStudents) {
    let secAcc = sectionMap.get(student.sectionId);
    if (!secAcc) {
      secAcc = { total: 0, present: 0, late: 0, absent: 0 };
      sectionMap.set(student.sectionId, secAcc);
    }
    secAcc.total += 1;

    let clsAcc = classMap.get(student.classId);
    if (!clsAcc) {
      clsAcc = { total: 0, present: 0, late: 0, absent: 0 };
      classMap.set(student.classId, clsAcc);
    }
    clsAcc.total += 1;

    const status = statusByStudentId.get(student.id);
    if (status === "PRESENT") {
      secAcc.present += 1;
      clsAcc.present += 1;
    } else if (status === "LATE") {
      secAcc.late += 1;
      clsAcc.late += 1;
    } else if (status === "ABSENT") {
      secAcc.absent += 1;
      clsAcc.absent += 1;
    }
  }

  let totalEnrolled = 0;
  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;

  const classes: ClassAttendanceSummary[] = classesData.map((cls) => {
    const clsAcc = classMap.get(cls.id) || { total: 0, present: 0, late: 0, absent: 0 };
    const clsUnmarked = Math.max(0, clsAcc.total - (clsAcc.present + clsAcc.late + clsAcc.absent));
    const clsRate = clsAcc.total > 0 ? Math.round(((clsAcc.present + clsAcc.late) / clsAcc.total) * 100) : 0;

    totalEnrolled += clsAcc.total;
    totalPresent += clsAcc.present;
    totalLate += clsAcc.late;
    totalAbsent += clsAcc.absent;

    const sections: SectionAttendanceSummary[] = cls.sections.map((sec) => {
      const secAcc = sectionMap.get(sec.id) || { total: 0, present: 0, late: 0, absent: 0 };
      const secUnmarked = Math.max(0, secAcc.total - (secAcc.present + secAcc.late + secAcc.absent));
      const secRate = secAcc.total > 0 ? Math.round(((secAcc.present + secAcc.late) / secAcc.total) * 100) : 0;

      return {
        id: sec.id,
        name: sec.name,
        totalActive: secAcc.total,
        presentCount: secAcc.present,
        lateCount: secAcc.late,
        absentCount: secAcc.absent,
        unmarkedCount: secUnmarked,
        attendanceRate: secRate,
      };
    });

    return {
      id: cls.id,
      name: cls.name,
      displayOrder: cls.displayOrder,
      totalActive: clsAcc.total,
      presentCount: clsAcc.present,
      lateCount: clsAcc.late,
      absentCount: clsAcc.absent,
      unmarkedCount: clsUnmarked,
      attendanceRate: clsRate,
      sections,
    };
  });

  const overallUnmarked = Math.max(0, totalEnrolled - (totalPresent + totalLate + totalAbsent));
  const overallRate = totalEnrolled > 0 ? Math.round(((totalPresent + totalLate) / totalEnrolled) * 100) : 0;

  const overallStats: DailyRosterStats = {
    totalActive: totalEnrolled,
    presentCount: totalPresent,
    lateCount: totalLate,
    absentCount: totalAbsent,
    unmarkedCount: overallUnmarked,
    attendanceRate: overallRate,
  };

  return {
    date: targetDateStr,
    overallStats,
    classes,
  };
}

/**
 * Format records into an RFC 4180 compliant CSV string.
 * - Wraps cells containing commas, double quotes, or newlines in double quotes.
 * - Escapes double quotes inside a cell by doubling them ("").
 * - Uses standard CRLF (\r\n) line terminators.
 */
export function formatRfc4180Csv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escapeCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return "";
    const str = String(cell);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const rowLines = rows.map((row) => row.map(escapeCell).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

/**
 * Generate a complete RFC 4180 CSV export for attendance records
 * based on date and optional filters.
 */
export async function generateAttendanceCsv(params: {
  date?: string;
  classId?: string;
  sectionId?: string;
  statusFilter?: "ALL" | "UNMARKED" | "PRESENT" | "LATE" | "ABSENT";
  search?: string;
}): Promise<string> {
  const dateStr = params.date || getTodayInSchoolTz();
  const attendanceDate = new Date(`${dateStr}T00:00:00.000Z`);

  const where: Prisma.StudentWhereInput = { isActive: true };
  if (params.classId) where.classId = params.classId;
  if (params.sectionId) where.sectionId = params.sectionId;
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentCode: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.statusFilter === "UNMARKED") {
    where.attendanceRecords = { none: { attendanceDate } };
  } else if (
    params.statusFilter === "PRESENT" ||
    params.statusFilter === "LATE" ||
    params.statusFilter === "ABSENT"
  ) {
    where.attendanceRecords = {
      some: { attendanceDate, status: params.statusFilter },
    };
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: [
      { class: { displayOrder: "asc" } },
      { section: { name: "asc" } },
      { studentCode: "asc" },
    ],
    include: {
      class: { select: { name: true } },
      section: { select: { name: true } },
      attendanceRecords: {
        where: { attendanceDate },
        include: {
          recordedBy: { select: { fullName: true } },
        },
        take: 1,
      },
    },
  });

  const headers = [
    "Student Code",
    "Full Name",
    "Class",
    "Section",
    "Attendance Date",
    "Status",
    "Method",
    "Scan Time",
    "Recorded By",
    "Notes",
  ];

  const rows = students.map((s) => {
    const rec = s.attendanceRecords[0];
    const status = rec ? rec.status : "UNMARKED";
    const method = rec ? rec.method : "N/A";
    const scanTime = rec && rec.scanTime ? formatTimeInSchoolTz(rec.scanTime) : "N/A";
    const recordedBy = rec ? rec.recordedBy.fullName : "N/A";
    const notes = rec?.notes || "";

    return [
      s.studentCode,
      s.fullName,
      s.class.name,
      s.section.name,
      dateStr,
      status,
      method,
      scanTime,
      recordedBy,
      notes,
    ];
  });

  // Prepend UTF-8 BOM so spreadsheet viewers render characters flawlessly
  return "\uFEFF" + formatRfc4180Csv(headers, rows);
}
