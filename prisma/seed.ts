import { PrismaClient, Role } from "@prisma/client";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// Fictional naming pools for synthetic student generation
const FIRST_NAMES = [
  "Ali", "Fatima", "Bilal", "Zainab", "Hamza", "Ayesha", "Omar", "Hania",
  "Usman", "Maryam", "Saad", "Noor", "Ibrahim", "Maham", "Zayan", "Dua",
  "Rayyan", "Iman", "Daniyal", "Eshal", "Mustafa", "Anaya", "Hassan", "Minahil",
  "Farhan", "Rida", "Ahmed", "Laiba", "Kashif", "Sana", "Adnan", "Haleema"
];

const LAST_NAMES = [
  "Khan", "Ahmed", "Malik", "Shah", "Qureshi", "Siddiqui", "Rehman", "Butt",
  "Chaudhry", "Abbasi", "Mirza", "Sheikh", "Bhatti", "Ansari", "Javed", "Iqbal"
];

export interface SyntheticAdmin {
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
}

export interface SyntheticClass {
  name: string;
  displayOrder: number;
}

export interface SyntheticSection {
  className: string;
  name: string;
}

export interface SyntheticStudent {
  studentCode: string;
  fullName: string;
  className: string;
  sectionName: string;
  qrToken: string;
  guardianPhone: string;
  isActive: boolean;
}

export interface SyntheticSeedData {
  admins: SyntheticAdmin[];
  classes: SyntheticClass[];
  sections: SyntheticSection[];
  students: SyntheticStudent[];
}

/**
 * Pure generator for synthetic demo seed data.
 * Produces exactly 500 students across 10 grades and 20 sections.
 */
export function generateSyntheticSeedData(): SyntheticSeedData {
  const admins: SyntheticAdmin[] = [
    {
      username: "principal",
      email: "principal@niceschool.edu",
      fullName: "Dr. Sarah Ahmed",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$samplehashforprincipaldemoonly$samplehash",
      role: Role.PRINCIPAL,
      isActive: true,
    },
    {
      username: "viceprincipal",
      email: "vp@niceschool.edu",
      fullName: "Mr. Tariq Mahmood",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$samplehashforvpdemoonly$samplehash",
      role: Role.VICE_PRINCIPAL,
      isActive: true,
    },
  ];

  const classes: SyntheticClass[] = [];
  const sections: SyntheticSection[] = [];
  const students: SyntheticStudent[] = [];

  let studentCounter = 1;

  for (let gradeNum = 1; gradeNum <= 10; gradeNum++) {
    const className = `Grade ${gradeNum}`;
    classes.push({
      name: className,
      displayOrder: gradeNum,
    });

    for (const sectionName of ["Section A", "Section B"]) {
      sections.push({
        className,
        name: sectionName,
      });

      // 25 students per section = 20 sections * 25 = 500 students
      for (let s = 1; s <= 25; s++) {
        const studentCode = `STD-2026-${String(studentCounter).padStart(4, "0")}`;
        const firstName = FIRST_NAMES[(studentCounter * 7 + s) % FIRST_NAMES.length];
        const lastName = LAST_NAMES[(studentCounter * 11 + s) % LAST_NAMES.length];
        const fullName = `${firstName} ${lastName}`;
        const qrToken = randomUUID();
        const guardianPhone = `+92-300-555${String(studentCounter).padStart(4, "0")}`;
        const isActive = studentCounter <= 490; // 490 active, 10 inactive for deactivation testing

        students.push({
          studentCode,
          fullName,
          className,
          sectionName,
          qrToken,
          guardianPhone,
          isActive,
        });

        studentCounter++;
      }
    }
  }

  return { admins, classes, sections, students };
}

/**
 * Database seed execution function.
 */
export async function seedDatabase(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? new PrismaClient();
  const data = generateSyntheticSeedData();

  console.log("Seeding administrative users...");
  const adminPasswordHash = await bcrypt.hash("NiceAttend2026!", 12);

  for (const admin of data.admins) {
    await prisma.user.upsert({
      where: { username: admin.username },
      update: {
        passwordHash: adminPasswordHash,
      },
      create: {
        ...admin,
        passwordHash: adminPasswordHash,
      },
    });
  }

  console.log("Seeding classes and sections...");
  const classMap = new Map<string, string>();
  for (const c of data.classes) {
    const record = await prisma.class.upsert({
      where: { name: c.name },
      update: { displayOrder: c.displayOrder },
      create: c,
    });
    classMap.set(c.name, record.id);
  }

  const sectionMap = new Map<string, string>();
  for (const s of data.sections) {
    const classId = classMap.get(s.className)!;
    const record = await prisma.section.upsert({
      where: {
        classId_name: {
          classId,
          name: s.name,
        },
      },
      update: {},
      create: {
        classId,
        name: s.name,
      },
    });
    sectionMap.set(`${s.className}:${s.name}`, record.id);
  }

  console.log("Seeding 500 synthetic students...");
  for (const student of data.students) {
    const classId = classMap.get(student.className)!;
    const sectionId = sectionMap.get(`${student.className}:${student.sectionName}`)!;

    await prisma.student.upsert({
      where: { studentCode: student.studentCode },
      update: {
        fullName: student.fullName,
        classId,
        sectionId,
        guardianPhone: student.guardianPhone,
        isActive: student.isActive,
      },
      create: {
        studentCode: student.studentCode,
        fullName: student.fullName,
        classId,
        sectionId,
        qrToken: student.qrToken,
        guardianPhone: student.guardianPhone,
        isActive: student.isActive,
      },
    });
  }

  console.log(`Seeded ${data.students.length} students across ${data.classes.length} classes and ${data.sections.length} sections.`);
}

export async function main() {
  const prisma = new PrismaClient();
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  });
}
