"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AddButton({ onClick, children, className, disabled }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-full",
        "bg-blue-600 text-white text-sm font-semibold",
        "shadow-sm hover:shadow-blue-200 hover:shadow-md",
        "cursor-pointer hover:bg-blue-700 active:scale-95",
        "transition-all duration-150 ease-out",
        "disabled:opacity-50 disabled:pointer-events-none",
        "group",
        className
      )}
    >
      <Plus
        size={15}
        strokeWidth={2.5}
        className="transition-transform duration-200 group-hover:rotate-90"
      />
      {children}
    </button>
  );
}
