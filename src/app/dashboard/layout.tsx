import { requireAdminAuth } from "@/lib/auth/guard";
import { TopHeader, BottomNav } from "./_components/nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white">
      <TopHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 print:p-0 print:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
