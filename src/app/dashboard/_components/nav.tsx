"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "📊" },
  { href: "/dashboard/students", label: "Students", emoji: "👥" },
  { href: "/dashboard/attendance", label: "Attendance", emoji: "📅" },
  { href: "/dashboard/reports", label: "Reports", emoji: "📋" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-area-pb print:hidden">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-blue-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="text-xl leading-none">{item.emoji}</span>
              <span className="leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-blue-900 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopHeader() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg select-none">
            N
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Nice School System
            </h1>
            <p className="text-xs text-slate-500 font-medium">NiceAttend</p>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 transition"
          >
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}
