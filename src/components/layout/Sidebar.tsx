"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, BarChart2, ChevronRight, Map, LineChart, Layers, ChevronsUpDown, Users, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/company";

const nav = [
  { href: "/strategies", label: "Стратегии", icon: Layers },
  { href: "/goals", label: "Цели", icon: Target },
  { href: "/indicators", label: "Показатели", icon: BarChart2 },
  { href: "/strategy-map", label: "Стратег. карта", icon: Map },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/responsible", label: "Ответственные", icon: Users },
  { href: "/reports", label: "Отчёты", icon: LineChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { company, clearCompany } = useCompany();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* App title */}
      <div className="h-14 flex items-center px-5 border-b border-gray-200 shrink-0">
        <span className="font-semibold text-blue-600 text-base tracking-tight">Business Studio</span>
      </div>

      {/* Company switcher */}
      <button
        onClick={clearCompany}
        className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors group w-full text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Компания</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{company?.name}</p>
        </div>
        <ChevronsUpDown size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
                active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon size={16} className={cn(active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">v1.0.0</p>
      </div>
    </aside>
  );
}
