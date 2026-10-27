"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import Link from "next/link";
import { updateStudentAction, ActionResult } from "@/actions/students";

interface Section {
  id: string;
  name: string;
  classId: string;
}

interface ClassWithSections {
  id: string;
  name: string;
  sections: Section[];
}

interface EditStudentFormProps {
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    classId: string;
    sectionId: string;
    guardianPhone: string | null;
  };
  classes: ClassWithSections[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

export function EditStudentForm({ student, classes }: EditStudentFormProps) {
  const [state, formAction] = useFormState<ActionResult, FormData>(
    updateStudentAction,
    {}
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(
    student.classId
  );
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);

  useEffect(() => {
    if (selectedClassId) {
      const cls = classes.find((c) => c.id === selectedClassId);
      setFilteredSections(cls?.sections ?? []);
    } else {
      setFilteredSections([]);
    }
  }, [selectedClassId, classes]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Hidden student ID */}
      <input type="hidden" name="id" value={student.id} />

      {state?.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
          {state.error}
        </div>
      )}

      {/* Student Code (read-only) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">
          Student Code
        </label>
        <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500 font-mono">
          {student.studentCode}
        </div>
        <p className="text-xs text-slate-400">Student codes are immutable after creation.</p>
      </div>

      {/* Full Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="fullName">
          Full Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={student.fullName}
          placeholder="e.g. Maria Santos"
          className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
        />
      </div>

      {/* Class */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="classId">
          Class <span className="text-rose-500">*</span>
        </label>
        <select
          id="classId"
          name="classId"
          required
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
        >
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Section */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="sectionId">
          Section <span className="text-rose-500">*</span>
        </label>
        <select
          id="sectionId"
          name="sectionId"
          required
          defaultValue={student.sectionId}
          disabled={filteredSections.length === 0}
          className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
        >
          <option value="">
            {filteredSections.length === 0
              ? "Select a class first…"
              : "Select a section…"}
          </option>
          {filteredSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Guardian Phone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="guardianPhone">
          Guardian Phone{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="guardianPhone"
          name="guardianPhone"
          type="tel"
          defaultValue={student.guardianPhone ?? ""}
          placeholder="e.g. +63 912 345 6789"
          className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Link
          href={`/dashboard/students/${student.id}`}
          className="flex-1 text-center border border-slate-300 text-slate-700 rounded-xl py-2.5 px-4 font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
