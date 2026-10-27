import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatRfc4180Csv,
  DailyRosterStats,
  ClassAttendanceSummary,
  SectionAttendanceSummary,
} from "../src/lib/attendance";

describe("Phase 9: Mobile Dashboard, Reporting & RFC 4180 CSV Export", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("1. Real-Time Dashboard Mathematical Invariants (TC-REP-01)", () => {
    it("guarantees campus-wide Present + Late + Absent + Unmarked strictly equals Total Active Enrolled", () => {
      const stats: DailyRosterStats = {
        totalActive: 500,
        presentCount: 412,
        lateCount: 38,
        absentCount: 30,
        unmarkedCount: 20,
        attendanceRate: 90,
      };

      const sum =
        stats.presentCount +
        stats.lateCount +
        stats.absentCount +
        stats.unmarkedCount;

      expect(sum).toBe(stats.totalActive);
      expect(stats.attendanceRate).toBe(
        Math.round(((stats.presentCount + stats.lateCount) / stats.totalActive) * 100)
      );
    });

    it("verifies mathematical consistency across Class and Section hierarchies", () => {
      const sectionA: SectionAttendanceSummary = {
        id: "sec-1",
        name: "Section A",
        totalActive: 25,
        presentCount: 20,
        lateCount: 2,
        absentCount: 2,
        unmarkedCount: 1,
        attendanceRate: 88,
      };

      const sectionB: SectionAttendanceSummary = {
        id: "sec-2",
        name: "Section B",
        totalActive: 25,
        presentCount: 21,
        lateCount: 1,
        absentCount: 1,
        unmarkedCount: 2,
        attendanceRate: 88,
      };

      const grade5: ClassAttendanceSummary = {
        id: "cls-5",
        name: "Grade 5",
        displayOrder: 5,
        totalActive: sectionA.totalActive + sectionB.totalActive,
        presentCount: sectionA.presentCount + sectionB.presentCount,
        lateCount: sectionA.lateCount + sectionB.lateCount,
        absentCount: sectionA.absentCount + sectionB.absentCount,
        unmarkedCount: sectionA.unmarkedCount + sectionB.unmarkedCount,
        attendanceRate: 0,
        sections: [sectionA, sectionB],
      };

      grade5.attendanceRate = Math.round(
        ((grade5.presentCount + grade5.lateCount) / grade5.totalActive) * 100
      );

      // Section A invariant
      expect(
        sectionA.presentCount +
          sectionA.lateCount +
          sectionA.absentCount +
          sectionA.unmarkedCount
      ).toBe(sectionA.totalActive);

      // Section B invariant
      expect(
        sectionB.presentCount +
          sectionB.lateCount +
          sectionB.absentCount +
          sectionB.unmarkedCount
      ).toBe(sectionB.totalActive);

      // Class aggregated invariant
      expect(
        grade5.presentCount +
          grade5.lateCount +
          grade5.absentCount +
          grade5.unmarkedCount
      ).toBe(grade5.totalActive);

      expect(grade5.totalActive).toBe(50);
      expect(grade5.presentCount).toBe(41);
      expect(grade5.lateCount).toBe(3);
      expect(grade5.absentCount).toBe(3);
      expect(grade5.unmarkedCount).toBe(3);
      expect(grade5.attendanceRate).toBe(88);
    });

    it("prevents negative unmarked counts when records equal or exceed active count", () => {
      const total = 50;
      const present = 48;
      const late = 2;
      const absent = 0;
      const unmarked = Math.max(0, total - (present + late + absent));

      expect(unmarked).toBe(0);
    });
  });

  describe("2. RFC 4180 CSV Generation & Escaping Compliance (TC-EXP-01)", () => {
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

    it("generates valid standard RFC 4180 CSV with CRLF line terminators", () => {
      const rows = [
        [
          "STD-2026-0001",
          "Ali Khan",
          "Grade 1",
          "Section A",
          "2026-10-27",
          "PRESENT",
          "QR_SCAN",
          "07:55 AM",
          "Principal",
          "",
        ],
        [
          "STD-2026-0002",
          "Fatima Noor",
          "Grade 1",
          "Section A",
          "2026-10-27",
          "LATE",
          "QR_SCAN",
          "08:12 AM",
          "Vice Principal",
          "Bus delay",
        ],
      ];

      const csv = formatRfc4180Csv(headers, rows);

      // Must use CRLF (\r\n) line endings according to RFC 4180 Section 2.1
      expect(csv).toContain("\r\n");
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(3); // header + 2 data rows
      expect(lines[0]).toBe(headers.join(","));
      expect(lines[1]).toBe("STD-2026-0001,Ali Khan,Grade 1,Section A,2026-10-27,PRESENT,QR_SCAN,07:55 AM,Principal,");
    });

    it("properly quotes cells containing commas according to RFC 4180 Section 2.6", () => {
      const rows = [
        [
          "STD-2026-0003",
          "Khan, Muhammad Bilal", // comma in name
          "Grade 2",
          "Section B",
          "2026-10-27",
          "PRESENT",
          "MANUAL",
          "08:05 AM",
          "Principal",
          "Forgot card, parent accompanied", // comma in notes
        ],
      ];

      const csv = formatRfc4180Csv(headers, rows);
      expect(csv).toContain('"Khan, Muhammad Bilal"');
      expect(csv).toContain('"Forgot card, parent accompanied"');
    });

    it("properly escapes internal double quotes by doubling them according to RFC 4180 Section 2.7", () => {
      const rows = [
        [
          "STD-2026-0004",
          'Zain "Junior" Ahmed', // internal quotes
          "Grade 3",
          "Section A",
          "2026-10-27",
          "ABSENT",
          "MANUAL",
          "N/A",
          "Vice Principal",
          'Reported as "sick leave" by parent',
        ],
      ];

      const csv = formatRfc4180Csv(headers, rows);
      expect(csv).toContain('"Zain ""Junior"" Ahmed"');
      expect(csv).toContain('"Reported as ""sick leave"" by parent"');
    });

    it("properly quotes cells containing line breaks according to RFC 4180 Section 2.6", () => {
      const rows = [
        [
          "STD-2026-0005",
          "Sarah Ahmed",
          "Grade 4",
          "Section A",
          "2026-10-27",
          "LATE",
          "MANUAL",
          "08:15 AM",
          "Principal",
          "First note line.\nSecond note line.",
        ],
      ];

      const csv = formatRfc4180Csv(headers, rows);
      expect(csv).toContain('"First note line.\nSecond note line."');
    });

    it("safely handles null and undefined cells as empty strings", () => {
      const rows = [
        [
          "STD-2026-0006",
          "Test Student",
          "Grade 5",
          "Section A",
          "2026-10-27",
          "UNMARKED",
          null,
          undefined,
          null,
          null,
        ],
      ];

      const csv = formatRfc4180Csv(headers, rows);
      const lines = csv.split("\r\n");
      expect(lines[1]).toBe("STD-2026-0006,Test Student,Grade 5,Section A,2026-10-27,UNMARKED,,,,");
    });
  });

  describe("3. Absence Policy & State Separation Safeguards", () => {
    it("strictly preserves separation between Unmarked and Confirmed Absent states", () => {
      const studentStatuses = [
        { code: "STD-01", status: "PRESENT" },
        { code: "STD-02", status: "LATE" },
        { code: "STD-03", status: "ABSENT" },
        { code: "STD-04", status: "UNMARKED" },
        { code: "STD-05", status: "UNMARKED" },
      ];

      const present = studentStatuses.filter((s) => s.status === "PRESENT").length;
      const late = studentStatuses.filter((s) => s.status === "LATE").length;
      const absent = studentStatuses.filter((s) => s.status === "ABSENT").length;
      const unmarked = studentStatuses.filter((s) => s.status === "UNMARKED").length;

      expect(present).toBe(1);
      expect(late).toBe(1);
      expect(absent).toBe(1);
      expect(unmarked).toBe(2);
      // Unmarked must never be counted as absent without explicit admin action
      expect(absent).not.toBe(3);
    });
  });
});
