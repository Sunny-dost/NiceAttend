'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/auth/guard';

export type RegenerateQrResult = { success: true } | { error: string };

export async function regenerateQrTokenAction(studentId: string): Promise<RegenerateQrResult> {
  // 1. Auth check
  await requireAdminAuth();

  // 2. Verify student exists
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: 'Student not found.' };

  // 3. Generate new unique token
  const newToken = randomUUID();

  // 4. Update student
  await prisma.student.update({
    where: { id: studentId },
    data: { qrToken: newToken },
  });

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath(`/dashboard/students/${studentId}/card`);

  return { success: true };
}
