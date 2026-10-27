import { requireAdminAuth } from "@/lib/auth/guard";
import { Scanner } from "./_components/scanner";
import { AttendanceNav } from "./_components/attendance-nav";

export const metadata = {
  title: "Live Attendance Scanner — NiceAttend",
  description: "Mobile QR scanner for Principal and Vice Principal",
};

export default async function AttendancePage() {
  const user = await requireAdminAuth();

  return (
    <div className="pb-8">
      <AttendanceNav />
      <Scanner
        currentUser={{
          id: user.id,
          fullName: user.fullName,
          role: user.role === "PRINCIPAL" ? "Principal" : "Vice Principal",
        }}
      />
    </div>
  );
}
