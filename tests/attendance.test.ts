import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTodayInSchoolTz,
  getCurrentTimeInSchoolTz,
  determineAttendanceStatus,
  formatTimeInSchoolTz,
} from "../src/lib/attendance";

describe("Attendance Logic & Timezone Helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates today date correctly in Asia/Karachi (UTC+5)", () => {
    // 2026-10-27 02:30:00 UTC is 2026-10-27 07:30:00 PKT
    vi.setSystemTime(new Date("2026-10-27T02:30:00Z"));
    expect(getTodayInSchoolTz()).toBe("2026-10-27");
  });

  it("determines PRESENT when scanning before 08:00 AM", () => {
    // 07:45 AM PKT -> 02:45 UTC
    vi.setSystemTime(new Date("2026-10-27T02:45:00Z"));
    const time = getCurrentTimeInSchoolTz();
    expect(time.hours).toBe(7);
    expect(time.minutes).toBe(45);
    expect(determineAttendanceStatus()).toBe("PRESENT");
  });

  it("determines PRESENT at exactly 08:00 AM cutoff", () => {
    // 08:00 AM PKT -> 03:00 UTC
    vi.setSystemTime(new Date("2026-10-27T03:00:00Z"));
    expect(determineAttendanceStatus()).toBe("PRESENT");
  });

  it("determines LATE when scanning after 08:00 AM", () => {
    // 08:05 AM PKT -> 03:05 UTC
    vi.setSystemTime(new Date("2026-10-27T03:05:00Z"));
    expect(determineAttendanceStatus()).toBe("LATE");
  });

  it("formats time nicely for display in school timezone", () => {
    // 08:15:30 PKT -> 03:15:30 UTC
    const date = new Date("2026-10-27T03:15:30Z");
    const formatted = formatTimeInSchoolTz(date);
    expect(formatted).toContain("8:15:30");
    expect(formatted).toMatch(/AM/i);
  });
});
