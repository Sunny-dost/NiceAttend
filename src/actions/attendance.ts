"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/guard";
import { AttendanceStatus } from "@prisma/client";

export interface AttendanceActionResult {
  success?: boolean;
  error?: string;
  count?: number;
  message?: string;
}

/**
 * Manually mark attendance for a student (e.g. forgotten card fallback).
 */
export async function markManualAttendanceAction(
  studentId: string,
  dateStr: string,
  status: AttendanceStatus,
  notes?: string
): Promise<AttendanceActionResult> {
  try {
    const adminUser = await requireAdminAuth();

    if (!studentId) return { error: "Student ID is required." };
    if (!dateStr) return { error: "Date is required." };
    if (!["PRESENT", "LATE", "ABSENT"].includes(status)) {
      return { error: "Invalid attendance status." };
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, isActive: true },
    });

    if (!student) return { error: "Student not found." };
    if (!student.isActive) {
      return { error: "Cannot mark attendance for an inactive student." };
    }

    const attendanceDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        studentId_attendanceDate: {
          studentId,
          attendanceDate,
        },
      },
    });

    if (existing) {
      return {
        error: `Student is already marked as ${existing.status}. Use 'Edit Status' to record a correction.`,
      };
    }

    await prisma.attendanceRecord.create({
      data: {
        studentId,
        attendanceDate,
        status,
        method: "MANUAL",
        recordedByUserId: adminUser.id,
        notes: notes?.trim() || "Manual roster entry",
      },
    });

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/attendance/roster");
    revalidatePath(`/dashboard/students/${studentId}`);

    return {
      success: true,
      message: `${student.fullName} marked as ${status}.`,
    };
  } catch (err: any) {
    console.error("Manual attendance error:", err);
    return { error: err.message || "Failed to record manual attendance." };
  }
}

/**
 * Correct attendance status with mandatory justification reason
 * and immutable forensic audit logging.
 */
export async function correctAttendanceStatusAction(
  recordId: string,
  newStatus: AttendanceStatus,
  reason: string
): Promise<AttendanceActionResult> {
  try {
    const adminUser = await requireAdminAuth();

    if (!recordId) return { error: "Record ID is required." };
    if (!["PRESENT", "LATE", "ABSENT"].includes(newStatus)) {
      return { error: "Invalid attendance status." };
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      return {
        error: "A mandatory justification reason (min. 3 characters) is required for audit compliance.",
      };
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: {
        student: { select: { fullName: true, studentCode: true } },
      },
    });

    if (!record) return { error: "Attendance record not found." };

    if (record.status === newStatus) {
      return {
        error: `Record is already marked as ${newStatus}. Choose a different status to update.`,
      };
    }

    // Atomic update + audit log creation
    await prisma.$transaction([
      prisma.attendanceRecord.update({
        where: { id: recordId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }),
      prisma.attendanceAuditLog.create({
        data: {
          attendanceRecordId: recordId,
          changedByUserId: adminUser.id,
          previousStatus: record.status,
          newStatus,
          reason: trimmedReason,
        },
      }),
    ]);

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/attendance/roster");
    revalidatePath("/dashboard/attendance/audit");
    revalidatePath(`/dashboard/students/${record.studentId}`);

    return {
      success: true,
      message: `Updated ${record.student.fullName} status from ${record.status} to ${newStatus}.`,
    };
  } catch (err: any) {
    console.error("Attendance correction error:", err);
    return { error: err.message || "Failed to correct attendance record." };
  }
}

/**
 * Bulk action: Confirm all remaining UNMARKED active students as ABSENT.
 */
export async function confirmBulkAbsenceAction(
  dateStr: string,
  classId?: string,
  sectionId?: string
): Promise<AttendanceActionResult> {
  try {
    const adminUser = await requireAdminAuth();

    if (!dateStr) return { error: "Date is required." };
    const attendanceDate = new Date(`${dateStr}T00:00:00.000Z`);

    // Build filter for students
    const studentFilter: any = { isActive: true };
    if (classId) studentFilter.classId = classId;
    if (sectionId) studentFilter.sectionId = sectionId;

    // Find active students with NO attendance record for that date
    studentFilter.attendanceRecords = { none: { attendanceDate } };

    const unmarkedStudents = await prisma.student.findMany({
      where: studentFilter,
      select: { id: true },
    });

    if (unmarkedStudents.length === 0) {
      return {
        success: true,
        count: 0,
        message: "No unmarked students remaining for this selection.",
      };
    }

    // Insert absent records in chunks to prevent database transaction limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < unmarkedStudents.length; i += CHUNK_SIZE) {
      const chunk = unmarkedStudents.slice(i, i + CHUNK_SIZE);
      await prisma.$transaction(
        chunk.map((s) =>
          prisma.attendanceRecord.create({
            data: {
              studentId: s.id,
              attendanceDate,
              status: "ABSENT",
              method: "MANUAL",
              recordedByUserId: adminUser.id,
              notes: "Confirmed by bulk absence action",
            },
          })
        )
      );
    }

    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/attendance/roster");

    return {
      success: true,
      count: unmarkedStudents.length,
      message: `Successfully confirmed ${unmarkedStudents.length} student${
        unmarkedStudents.length === 1 ? "" : "s"
      } as ABSENT.`,
    };
  } catch (err: any) {
    console.error("Bulk absence error:", err);
    return { error: err.message || "Failed to process bulk absences." };
  }
}
