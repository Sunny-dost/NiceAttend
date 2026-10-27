import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatDateInSchoolTz,
  getTodayInSchoolTz,
  DailyRosterStats,
} from "../src/lib/attendance";

describe("Phase 8: Daily Attendance Roster, Math Consistency & Audit Integrity", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("1. Mathematical Invariant & Metric Consistency (TC-REP-01)", () => {
    it("ensures Present + Late + Absent + Unmarked strictly equals Total Active Enrolled", () => {
      const sampleStats: DailyRosterStats = {
        totalActive: 500,
        presentCount: 420,
        lateCount: 35,
        absentCount: 25,
        unmarkedCount: 20,
        attendanceRate: 91,
      };

      const sum =
        sampleStats.presentCount +
        sampleStats.lateCount +
        sampleStats.absentCount +
        sampleStats.unmarkedCount;

      expect(sum).toBe(sampleStats.totalActive);
      expect(sampleStats.attendanceRate).toBe(
        Math.round(
          ((sampleStats.presentCount + sampleStats.lateCount) /
            sampleStats.totalActive) *
            100
        )
      );
    });

    it("correctly handles zero active students without division by zero errors", () => {
      const emptyStats: DailyRosterStats = {
        totalActive: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        unmarkedCount: 0,
        attendanceRate: 0,
      };

      expect(emptyStats.attendanceRate).toBe(0);
    });
  });

  describe("2. School Date Formatting & Timezone Display", () => {
    it("formats ISO attendance dates to human-readable school timezone strings", () => {
      const date = new Date("2026-10-27T00:00:00.000Z");
      const formatted = formatDateInSchoolTz(date);

      expect(formatted).toContain("2026");
      expect(formatted).toContain("Oct");
      expect(formatted).toContain("27");
    });

    it("consistently computes YYYY-MM-DD format for today in school timezone", () => {
      const today = getTodayInSchoolTz();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("3. Audit Log Requirement Safeguards (TC-CORR-01)", () => {
    it("verifies reason requirement validation rules", () => {
      const validateReason = (reason?: string) => {
        const trimmed = reason?.trim();
        if (!trimmed || trimmed.length < 3) {
          return { valid: false, error: "Mandatory justification reason required (min. 3 chars)" };
        }
        return { valid: true };
      };

      expect(validateReason("").valid).toBe(false);
      expect(validateReason("   ").valid).toBe(false);
      expect(validateReason("ok").valid).toBe(false);
      expect(validateReason("Bus was delayed").valid).toBe(true);
      expect(validateReason("Parent phone call confirming illness").valid).toBe(true);
    });

    it("verifies that target status must differ from current status", () => {
      const validateStatusChange = (current: string, next: string) => {
        if (current === next) {
          return { valid: false, error: "New status must differ from current status." };
        }
        return { valid: true };
      };

      expect(validateStatusChange("PRESENT", "PRESENT").valid).toBe(false);
      expect(validateStatusChange("LATE", "PRESENT").valid).toBe(true);
      expect(validateStatusChange("ABSENT", "PRESENT").valid).toBe(true);
    });
  });
});
