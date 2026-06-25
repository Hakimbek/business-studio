"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TreeNodeProps {
  label: string;
  subtitle?: string;
  badge?: React.ReactNode;
  depth?: number;
  hasChildren?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TreeNode({
  label,
  subtitle,
  badge,
  depth = 0,
  hasChildren = false,
  defaultOpen = false,
  children,
  onAdd,
  onEdit,
  onDelete,
}: TreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md group hover:bg-gray-50 cursor-pointer",
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => hasChildren && setOpen(!open)}
          className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400"
        >
          {hasChildren ? (
            open ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-1 h-1 rounded-full bg-gray-300 block mx-auto" />
          )}
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2" onClick={() => hasChildren && setOpen(!open)}>
          <span className="text-sm text-gray-800 font-medium truncate">{label}</span>
          {subtitle && <span className="text-xs text-gray-400 truncate">{subtitle}</span>}
          {badge}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAdd && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onAdd(); }}>
              <Plus size={12} />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil size={12} />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </div>

      {open && children && <div>{children}</div>}
    </div>
  );
}
