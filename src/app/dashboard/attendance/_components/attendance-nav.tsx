"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AttendanceNav() {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/dashboard/attendance",
      label: "Camera Scanner",
      emoji: "📷",
      exact: true,
    },
    {
      href: "/dashboard/attendance/roster",
      label: "Daily Roster & Manual",
      emoji: "📋",
      exact: false,
    },
    {
      href: "/dashboard/attendance/audit",
      label: "Audit Trail",
      emoji: "🛡️",
      exact: false,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl mb-6 max-w-lg mx-auto overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
              isActive
                ? "bg-white text-blue-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
