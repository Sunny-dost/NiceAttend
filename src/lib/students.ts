import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Fetch all classes with their sections, ordered by display order.
 */
export async function getClassesWithSections() {
  return prisma.class.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      sections: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export interface GetStudentsParams {
  search?: string;
  classId?: string;
  sectionId?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  pageSize?: number;
}

/**
 * Fetch students with pagination, search, and filters.
 */
export async function getStudents(params: GetStudentsParams = {}) {
  const {
    search = "",
    classId,
    sectionId,
    status = "all",
    page = 1,
    pageSize = 25,
  } = params;

  const where: Prisma.StudentWhereInput = {};

  if (search.trim()) {
    where.OR = [
      { fullName: { contains: search.trim(), mode: "insensitive" } },
      { studentCode: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  if (classId) {
    where.classId = classId;
  }

  if (sectionId) {
    where.sectionId = sectionId;
  }

  if (status === "active") {
    where.isActive = true;
  } else if (status === "inactive") {
    where.isActive = false;
  }

  const skip = (page - 1) * pageSize;

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ fullName: "asc" }],
      skip,
      take: pageSize,
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    students,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Fetch a single student by ID with class and section info.
 */
export async function getStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
    },
  });
}
