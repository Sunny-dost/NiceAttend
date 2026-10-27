import { describe, it, expect } from "vitest";
import { generateSyntheticSeedData } from "../prisma/seed";

describe("Synthetic Demo Seed Generator", () => {
  const data = generateSyntheticSeedData();

  it("generates exactly 2 administrative users with correct roles", () => {
    expect(data.admins).toHaveLength(2);
    const principal = data.admins.find((a) => a.role === "PRINCIPAL");
    const vicePrincipal = data.admins.find((a) => a.role === "VICE_PRINCIPAL");

    expect(principal).toBeDefined();
    expect(principal?.username).toBe("principal");
    expect(principal?.fullName).toBe("Dr. Sarah Ahmed");
    expect(principal?.isActive).toBe(true);

    expect(vicePrincipal).toBeDefined();
    expect(vicePrincipal?.username).toBe("viceprincipal");
    expect(vicePrincipal?.fullName).toBe("Mr. Tariq Mahmood");
    expect(vicePrincipal?.isActive).toBe(true);
  });

  it("generates exactly 10 academic classes (Grade 1 through Grade 10)", () => {
    expect(data.classes).toHaveLength(10);
    for (let i = 1; i <= 10; i++) {
      const cls = data.classes.find((c) => c.name === `Grade ${i}`);
      expect(cls).toBeDefined();
      expect(cls?.displayOrder).toBe(i);
    }
  });

  it("generates exactly 20 sections (Section A and Section B per grade)", () => {
    expect(data.sections).toHaveLength(20);
    for (let i = 1; i <= 10; i++) {
      const secA = data.sections.find((s) => s.className === `Grade ${i}` && s.name === "Section A");
      const secB = data.sections.find((s) => s.className === `Grade ${i}` && s.name === "Section B");
      expect(secA).toBeDefined();
      expect(secB).toBeDefined();
    }
  });

  it("generates exactly 500 students with 25 students per section", () => {
    expect(data.students).toHaveLength(500);

    // Verify 25 students per each of the 20 sections
    for (let i = 1; i <= 10; i++) {
      for (const sec of ["Section A", "Section B"]) {
        const inSection = data.students.filter(
          (s) => s.className === `Grade ${i}` && s.sectionName === sec
        );
        expect(inSection).toHaveLength(25);
      }
    }
  });

  it("ensures all 500 student codes are unique and properly formatted", () => {
    const codes = data.students.map((s) => s.studentCode);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(500);

    for (const code of codes) {
      expect(code).toMatch(/^STD-2026-\d{4}$/);
    }
  });

  it("ensures all 500 QR tokens are unique, high-entropy UUIDv4 strings without PII", () => {
    const tokens = data.students.map((s) => s.qrToken);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(500);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const token of tokens) {
      expect(token).toMatch(uuidRegex);
    }
  });

  it("maintains the expected active vs inactive ratio (490 active, 10 inactive for testing)", () => {
    const activeStudents = data.students.filter((s) => s.isActive);
    const inactiveStudents = data.students.filter((s) => !s.isActive);

    expect(activeStudents).toHaveLength(490);
    expect(inactiveStudents).toHaveLength(10);
  });

  it("ensures all students have non-empty names and formatted guardian phone numbers", () => {
    for (const s of data.students) {
      expect(s.fullName.trim().length).toBeGreaterThan(3);
      expect(s.guardianPhone).toMatch(/^\+92-300-555\d{4}$/);
    }
  });
});
