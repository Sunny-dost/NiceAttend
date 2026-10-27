"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const studentBaseSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name must be at most 100 characters."),
  classId: z.string().uuid("Please select a valid class."),
  sectionId: z.string().uuid("Please select a valid section."),
  guardianPhone: z
    .string()
    .max(25, "Guardian phone must be at most 25 characters.")
    .optional()
    .or(z.literal("")),
});

const createStudentSchema = studentBaseSchema.extend({
  studentCode: z
    .string()
    .min(3, "Student code must be at least 3 characters.")
    .max(30, "Student code must be at most 30 characters.")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Student code may only contain letters, digits, and hyphens."
    ),
});

const updateStudentSchema = studentBaseSchema.extend({
  id: z.string().uuid("Invalid student ID."),
});

// ---------------------------------------------------------------------------
// Helper: verify sectionId belongs to classId
// ---------------------------------------------------------------------------
async function verifySectionBelongsToClass(
  sectionId: string,
  classId: string
): Promise<boolean> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { classId: true },
  });
  return section?.classId === classId;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createStudentAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminAuth();

  const raw = {
    studentCode: String(formData.get("studentCode") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    classId: String(formData.get("classId") ?? "").trim(),
    sectionId: String(formData.get("sectionId") ?? "").trim(),
    guardianPhone: String(formData.get("guardianPhone") ?? "").trim(),
  };

  const parsed = createStudentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { studentCode, fullName, classId, sectionId, guardianPhone } =
    parsed.data;

  const sectionValid = await verifySectionBelongsToClass(sectionId, classId);
  if (!sectionValid) {
    return { error: "Selected section does not belong to the selected class." };
  }

  try {
    await prisma.student.create({
      data: {
        studentCode,
        fullName,
        classId,
        sectionId,
        guardianPhone: guardianPhone || null,
        qrToken: randomUUID(),
      },
    });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2002") {
      return { error: "A student with that code already exists." };
    }
    console.error("createStudentAction error:", err);
    return { error: "Failed to create student. Please try again." };
  }

  revalidatePath("/dashboard/students");
  redirect("/dashboard/students");
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export async function updateStudentAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminAuth();

  const raw = {
    id: String(formData.get("id") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    classId: String(formData.get("classId") ?? "").trim(),
    sectionId: String(formData.get("sectionId") ?? "").trim(),
    guardianPhone: String(formData.get("guardianPhone") ?? "").trim(),
  };

  const parsed = updateStudentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, fullName, classId, sectionId, guardianPhone } = parsed.data;

  const sectionValid = await verifySectionBelongsToClass(sectionId, classId);
  if (!sectionValid) {
    return { error: "Selected section does not belong to the selected class." };
  }

  try {
    await prisma.student.update({
      where: { id },
      data: {
        fullName,
        classId,
        sectionId,
        guardianPhone: guardianPhone || null,
      },
    });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "P2025") {
      return { error: "Student not found." };
    }
    console.error("updateStudentAction error:", err);
    return { error: "Failed to update student. Please try again." };
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${id}`);
  redirect(`/dashboard/students/${id}`);
}

// ---------------------------------------------------------------------------
// Deactivate
// ---------------------------------------------------------------------------
export async function deactivateStudentAction(
  studentId: string
): Promise<ActionResult> {
  await requireAdminAuth();

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { isActive: false },
    });
  } catch (err) {
    console.error("deactivateStudentAction error:", err);
    return { error: "Failed to deactivate student." };
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reactivate
// ---------------------------------------------------------------------------
export async function reactivateStudentAction(
  studentId: string
): Promise<ActionResult> {
  await requireAdminAuth();

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { isActive: true },
    });
  } catch (err) {
    console.error("reactivateStudentAction error:", err);
    return { error: "Failed to reactivate student." };
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}
