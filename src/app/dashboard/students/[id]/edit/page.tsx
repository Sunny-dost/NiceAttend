import { notFound } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/guard";
import { getStudentById, getClassesWithSections } from "@/lib/students";
import { EditStudentForm } from "./_components/edit-student-form";

export const metadata = { title: "Edit Student — NiceAttend" };

export default async function EditStudentPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminAuth();

  const [student, classes] = await Promise.all([
    getStudentById(params.id),
    getClassesWithSections(),
  ]);

  if (!student) notFound();

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Edit Student</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Update details for{" "}
          <span className="font-semibold text-slate-700">{student.fullName}</span>
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <EditStudentForm
          student={{
            id: student.id,
            studentCode: student.studentCode,
            fullName: student.fullName,
            classId: student.classId,
            sectionId: student.sectionId,
            guardianPhone: student.guardianPhone,
          }}
          classes={classes}
        />
      </div>
    </div>
  );
}
