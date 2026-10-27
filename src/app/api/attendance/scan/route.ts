import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/auth/guard";
import {
  getTodayInSchoolTz,
  determineAttendanceStatus,
  formatTimeInSchoolTz,
} from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAuthenticatedAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "QR token is required." },
        { status: 400 }
      );
    }

    // 1. Locate student by opaque qr_token
    const student = await prisma.student.findUnique({
      where: { qrToken: token },
      include: {
        class: true,
        section: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "UNKNOWN_TOKEN", message: "QR code not recognized." },
        { status: 404 }
      );
    }

    // 2. Reject inactive students
    if (!student.isActive) {
      return NextResponse.json(
        {
          error: "STUDENT_INACTIVE",
          message: "Student is inactive or withdrawn.",
          student: {
            id: student.id,
            fullName: student.fullName,
            studentCode: student.studentCode,
          },
        },
        { status: 422 }
      );
    }

    // 3. Resolve today's date in school timezone
    const todayStr = getTodayInSchoolTz(); // e.g. "YYYY-MM-DD"
    const attendanceDate = new Date(`${todayStr}T00:00:00.000Z`);

    // 4. Check if student has already been marked today
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        studentId_attendanceDate: {
          studentId: student.id,
          attendanceDate,
        },
      },
      include: {
        recordedBy: {
          select: { fullName: true, username: true },
        },
      },
    });

    if (existing) {
      const recordedTime = existing.scanTime ?? existing.createdAt;
      return NextResponse.json(
        {
          error: "ALREADY_MARKED",
          message: "Attendance already recorded for today.",
          student: {
            id: student.id,
            fullName: student.fullName,
            studentCode: student.studentCode,
            className: student.class.name,
            sectionName: student.section.name,
          },
          existing: {
            status: existing.status,
            timestamp: recordedTime.toISOString(),
            formattedTime: formatTimeInSchoolTz(recordedTime),
            recordedBy: existing.recordedBy.fullName,
          },
        },
        { status: 409 }
      );
    }

    // 5. Evaluate on-time cutoff vs current school time
    const status = determineAttendanceStatus(); // 'PRESENT' | 'LATE'
    const scanTime = new Date();

    // 6. Record attendance
    try {
      const record = await prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          attendanceDate,
          status,
          scanTime,
          recordedByUserId: adminUser.id,
          method: "QR_SCAN",
        },
        include: {
          recordedBy: {
            select: { fullName: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        status: record.status,
        student: {
          id: student.id,
          fullName: student.fullName,
          studentCode: student.studentCode,
          className: student.class.name,
          sectionName: student.section.name,
        },
        timestamp: scanTime.toISOString(),
        formattedTime: formatTimeInSchoolTz(scanTime),
        recordedBy: record.recordedBy.fullName,
      });
    } catch (dbError: any) {
      // Catch concurrent scan unique constraint violation (P2002)
      if (dbError?.code === "P2002") {
        const winningRecord = await prisma.attendanceRecord.findUnique({
          where: {
            studentId_attendanceDate: {
              studentId: student.id,
              attendanceDate,
            },
          },
          include: {
            recordedBy: { select: { fullName: true } },
          },
        });

        const recordTime = winningRecord?.scanTime ?? winningRecord?.createdAt ?? new Date();

        return NextResponse.json(
          {
            error: "ALREADY_MARKED",
            message: "Attendance already recorded for today.",
            student: {
              id: student.id,
              fullName: student.fullName,
              studentCode: student.studentCode,
              className: student.class.name,
              sectionName: student.section.name,
            },
            existing: {
              status: winningRecord?.status ?? "PRESENT",
              timestamp: recordTime.toISOString(),
              formattedTime: formatTimeInSchoolTz(recordTime),
              recordedBy: winningRecord?.recordedBy.fullName ?? "Another Administrator",
            },
          },
          { status: 409 }
        );
      }

      console.error("Attendance scan DB error:", dbError);
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to record attendance." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Attendance scan route error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
