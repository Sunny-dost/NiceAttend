import { requireAdminAuth } from "@/lib/auth/guard";
import { getClassesWithSections } from "@/lib/students";
import { NewStudentForm } from "./_components/new-student-form";

export const metadata = { title: "Add Student — NiceAttend" };

export default async function NewStudentPage() {
  await requireAdminAuth();
  const classes = await getClassesWithSections();

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Add New Student</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Fill in the details below to enroll a new student.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <NewStudentForm classes={classes} />
      </div>
    </div>
  );
}
