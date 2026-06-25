"use client";

import {
  forwardRef, useEffect, useLayoutEffect, useRef, useState,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Link2, PenLine, Plus, Pencil, Trash2, X, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddButton } from "@/components/shared/AddButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import type {
  Goal, Indicator, StrategyMapBoard, StrategyMapEntry,
  StrategyMapIndicatorEntry, StrategyMapRegion, StrategyMapIndicatorLink,
} from "@/types";

// ── RAG status helpers ─────────────────────────────────────────────────────────

type RagStatus = "green" | "yellow" | "red" | null;

function indicatorStatus(ind: Indicator): RagStatus {
  const actual = ind.values?.[0]?.value ?? ind.actualValue;
  if (actual == null || ind.targetValue == null || ind.targetValue === 0) return null;
  const ratio = actual / ind.targetValue;
  if (ratio >= 0.8) return "green";
  if (ratio >= 0.5) return "yellow";
  return "red";
}

function goalStatus(
  goalId: string,
  indicatorLinks: StrategyMapIndicatorLink[],
  indicatorEntries: StrategyMapIndicatorEntry[],
): RagStatus {
  const linkedIds = new Set(indicatorLinks.filter(l => l.goalId === goalId).map(l => l.indicatorId));
  const statuses = indicatorEntries
    .filter(ie => linkedIds.has(ie.indicatorId))
    .map(ie => indicatorStatus(ie.indicator))
    .filter((s): s is NonNullable<RagStatus> => s !== null);
  if (statuses.length === 0) return null;
  if (statuses.includes("red"))    return "red";
  if (statuses.includes("yellow")) return "yellow";
  return "green";
}

const RAG: Record<NonNullable<RagStatus>, { border: string; bg: string; badge: string; label: string }> = {
  green:  { border: "#16a34a", bg: "#f0fdf4", badge: "bg-green-100 text-green-700",  label: "В норме" },
  yellow: { border: "#ca8a04", bg: "#fefce8", badge: "bg-yellow-100 text-yellow-700", label: "Под риском" },
  red:    { border: "#dc2626", bg: "#fef2f2", badge: "bg-red-100 text-red-700",       label: "Отстаёт" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type DragKind = "goal" | "indicator" | "region" | "resize";
type DragState = {
  kind: DragKind;
  id: string;
  startCX: number; startCY: number;
  startEX: number; startEY: number;
  startW?: number; startH?: number;
};
type ConnectSource = { kind: "goal" | "indicator"; id: string };
interface Arrow {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  kind: "goal-goal" | "ind-goal";
  sourceId: string;
  targetId: string;
  strength: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REGION_COLORS = [
  "#16a34a", "#2563eb", "#ea580c", "#9333ea",
  "#dc2626", "#0891b2", "#ca8a04", "#6b7280",
];

// ── SVG Links overlay ─────────────────────────────────────────────────────────

function LinksOverlay({
  board, cardRefs, canvasRef, onDeleteLink, onUnlinkIndicator, onUpdateStrength, viewMode,
}: {
  board: StrategyMapBoard;
  cardRefs: React.RefObject<Map<string, HTMLElement>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onDeleteLink: (id: string) => void;
  onUnlinkIndicator: (indicatorId: string, goalId: string) => void;
  onUpdateStrength: (arrow: Arrow, strength: number) => void;
  viewMode: boolean;
}) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const entryGoalIds = new Set(board.entries.map((e) => e.goalId));
  const indEntryIds  = new Set(board.indicatorEntries.map((e) => e.indicatorId));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    const next: Arrow[] = [];

    for (const link of board.links) {
      const s = cardRefs.current?.get(link.sourceGoalId);
      const t = cardRefs.current?.get(link.targetGoalId);
      if (!s || !t) continue;
      const sr = s.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      next.push({ id: link.id, sourceId: link.sourceGoalId, targetId: link.targetGoalId, kind: "goal-goal", strength: link.strength ?? 2,
        x1: sr.right - cr.left, y1: sr.top + sr.height / 2 - cr.top,
        x2: tr.left - cr.left,  y2: tr.top + tr.height / 2 - cr.top });
    }
    for (const il of board.indicatorLinks) {
      if (!indEntryIds.has(il.indicatorId) || !entryGoalIds.has(il.goalId)) continue;
      const s = cardRefs.current?.get(`ind-${il.indicatorId}`);
      const t = cardRefs.current?.get(il.goalId);
      if (!s || !t) continue;
      const sr = s.getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      next.push({ id: il.id, sourceId: il.indicatorId, targetId: il.goalId, kind: "ind-goal", strength: il.strength ?? 2,
        x1: sr.right - cr.left, y1: sr.top + sr.height / 2 - cr.top,
        x2: tr.left - cr.left,  y2: tr.top + tr.height / 2 - cr.top });
    }

    setArrows((prev) => {
      if (prev.length === next.length &&
        prev.every((a, i) => a.id === next[i].id &&
          a.x1 === next[i].x1 && a.y1 === next[i].y1 &&
          a.x2 === next[i].x2 && a.y2 === next[i].y2 &&
          a.strength === next[i].strength)) return prev;
      return next;
    });
  });

  if (arrows.length === 0) return null;

  return (
    <svg className="absolute inset-0 overflow-visible pointer-events-none"
      style={{ width: "100%", height: "100%", zIndex: 20 }}>
      <defs>
        <marker id="arr"     markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#6366f1" /></marker>
        <marker id="arr-ind" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#0891b2" /></marker>
        <marker id="arr-h"   markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#ef4444" /></marker>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {arrows.map((a) => {
        const isH = !viewMode && hovered === a.id;
        const color = a.kind === "ind-goal" ? "#0891b2" : "#6366f1";
        const markerId = isH ? "arr-h" : a.kind === "ind-goal" ? "arr-ind" : "arr";
        const curve = Math.max(60, Math.abs(a.x2 - a.x1) * 0.45);
        const d = `M ${a.x1} ${a.y1} C ${a.x1 + curve} ${a.y1} ${a.x2 - curve} ${a.y2} ${a.x2} ${a.y2}`;
        const mx = (a.x1 + a.x2) / 2;
        const my = (a.y1 + a.y2) / 2;
        const sw = a.strength === 1 ? 1.5 : a.strength === 3 ? 4.5 : 2.5;
        return (
          <g key={a.id} style={{ pointerEvents: viewMode ? "none" : "all" }}>
            {!viewMode && (
              <path d={d} stroke="transparent" strokeWidth={18} fill="none" style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(a.id)} onMouseLeave={() => setHovered(null)} />
            )}
            {!isH && <path d={d} stroke={color} strokeWidth={sw + 1} fill="none" opacity={0.2} filter="url(#glow)" style={{ pointerEvents: "none" }} />}
            <path d={d} stroke={isH ? "#ef4444" : color} strokeWidth={isH ? sw + 0.5 : sw} fill="none"
              className={isH ? undefined : "arrow-flow"}
              style={{ pointerEvents: "none", transition: "stroke 0.15s" }} />
            {isH && (
              <g transform={`translate(${mx},${my})`}
                onMouseEnter={() => setHovered(a.id)} onMouseLeave={() => setHovered(null)}
                style={{ pointerEvents: "all" }}>
                {/* Popup background */}
                <rect x={-72} y={-15} width={144} height={30} rx={15} fill="white" stroke="#e5e7eb" strokeWidth={1} filter="url(#glow)" />
                {/* Thin */}
                <g transform="translate(-48,0)" style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); onUpdateStrength(a, 1); }}>
                  <rect x={-14} y={-13} width={28} height={26} rx={5} fill={a.strength === 1 ? "#eff6ff" : "transparent"} />
                  <line x1={-9} y1={0} x2={9} y2={0} stroke={a.strength === 1 ? "#2563eb" : "#9ca3af"} strokeWidth={1.5} strokeLinecap="round" />
                </g>
                {/* Medium */}
                <g transform="translate(-10,0)" style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); onUpdateStrength(a, 2); }}>
                  <rect x={-14} y={-13} width={28} height={26} rx={5} fill={a.strength === 2 ? "#eff6ff" : "transparent"} />
                  <line x1={-9} y1={0} x2={9} y2={0} stroke={a.strength === 2 ? "#2563eb" : "#9ca3af"} strokeWidth={3} strokeLinecap="round" />
                </g>
                {/* Thick */}
                <g transform="translate(28,0)" style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); onUpdateStrength(a, 3); }}>
                  <rect x={-14} y={-13} width={28} height={26} rx={5} fill={a.strength === 3 ? "#eff6ff" : "transparent"} />
                  <line x1={-9} y1={0} x2={9} y2={0} stroke={a.strength === 3 ? "#2563eb" : "#9ca3af"} strokeWidth={5} strokeLinecap="round" />
                </g>
                {/* Separator */}
                <line x1={48} y1={-8} x2={48} y2={8} stroke="#e5e7eb" strokeWidth={1} />
                {/* Delete */}
                <g transform="translate(60,0)" style={{ cursor: "pointer" }}
                  onClick={() => a.kind === "goal-goal" ? onDeleteLink(a.id) : onUnlinkIndicator(a.sourceId, a.targetId)}>
                  <rect x={-12} y={-13} width={24} height={26} rx={5} fill="transparent" />
                  <line x1={-4} y1={-4} x2={4} y2={4} stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
                  <line x1={4} y1={-4} x2={-4} y2={4} stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
                </g>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Region box ────────────────────────────────────────────────────────────────

const RegionBox = forwardRef<HTMLDivElement, {
  region: StrategyMapRegion;
  pos: { x: number; y: number };
  size: { w: number; h: number };
  viewMode: boolean;
  onHeaderMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onLabelChange: (label: string) => void;
}>(function RegionBox({ region, pos, size, viewMode, onHeaderMouseDown, onResizeMouseDown, onDelete, onLabelChange }, ref) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(region.label);

  function commitLabel() {
    setEditing(false);
    if (draft.trim() && draft !== region.label) onLabelChange(draft.trim());
    else setDraft(region.label);
  }

  return (
    <div ref={ref} className="absolute select-none"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, width: size.w, height: size.h, zIndex: 0 }}>
      <div className="absolute inset-0 rounded-xl border-2"
        style={{ background: `${region.color}18`, borderColor: `${region.color}55` }} />
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-8 rounded-t-xl flex items-center px-2 gap-2",
          !viewMode && "cursor-move",
        )}
        style={{ background: region.color }}
        onMouseDown={!viewMode ? onHeaderMouseDown : undefined}
      >
        {!viewMode && editing ? (
          <input autoFocus
            className="flex-1 text-xs font-semibold text-white bg-transparent border-b border-white/50 outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => { if (e.key === "Enter") commitLabel(); if (e.key === "Escape") { setEditing(false); setDraft(region.label); } }}
            onMouseDown={(e) => e.stopPropagation()} />
        ) : (
          <span
            className={cn("flex-1 text-xs font-semibold text-white truncate", !viewMode && "cursor-text")}
            onDoubleClick={!viewMode ? (e) => { e.stopPropagation(); setEditing(true); } : undefined}
          >
            {region.label}
          </span>
        )}
        {!viewMode && (
          <button className="text-white/70 hover:text-white transition-colors shrink-0 cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()} onClick={onDelete}>
            <X size={12} />
          </button>
        )}
      </div>
      {!viewMode && (
        <div className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-end justify-end"
          onMouseDown={onResizeMouseDown}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M9 1 L1 9 M9 5 L5 9" stroke={region.color} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
});

// ── Goal card ─────────────────────────────────────────────────────────────────

const GOAL_D = 140;

function GoalCard({
  entry, pos, status, connectMode, isSource, viewMode, cardRef, onMouseDown, onRemove, onConnect, onPortConnect,
}: {
  entry: StrategyMapEntry;
  pos: { x: number; y: number };
  status: RagStatus;
  connectMode: boolean;
  isSource: boolean;
  viewMode: boolean;
  cardRef: (el: HTMLElement | null) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onConnect: () => void;
  onPortConnect: () => void;
}) {
  const goal = entry.goal;
  const rag = status ? RAG[status] : null;
  const borderColor = rag?.border ?? "#6366f1";
  const bgColor     = rag?.bg ?? "#ffffff";

  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute group rounded-full border-4 shadow-md select-none overflow-visible transition-shadow",
        "flex flex-col items-center justify-center text-center",
        viewMode
          ? "cursor-default hover:shadow-lg"
          : connectMode
            ? "cursor-pointer hover:shadow-lg"
            : "cursor-move hover:shadow-lg",
        isSource && "ring-4 ring-offset-2 ring-pulse",
      )}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: GOAL_D, height: GOAL_D,
        zIndex: 10,
        borderColor,
        background: bgColor,
        "--tw-ring-color": borderColor,
      } as React.CSSProperties}
      onMouseDown={viewMode ? undefined : connectMode ? undefined : onMouseDown}
      onClick={!viewMode && connectMode ? onConnect : undefined}
    >
      <div className="px-3 w-full">
        <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-3">{goal.name}</p>
        {rag && (
          <div className="mt-1.5 flex justify-center">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: borderColor }} />
          </div>
        )}
      </div>

      {/* Port circle — only in edit mode */}
      {!viewMode && (
        <div
          title="Соединить"
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow cursor-pointer z-30 transition-opacity",
            connectMode ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            isSource && "scale-125",
          )}
          style={{ background: borderColor }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onPortConnect(); }}
        />
      )}

      {/* Delete — only in edit mode */}
      {!viewMode && !connectMode && (
        <button
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer shadow"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        ><X size={10} /></button>
      )}
    </div>
  );
}

// ── Indicator card ────────────────────────────────────────────────────────────

function IndicatorCard({
  entry, pos, connectMode, isSource, viewMode, cardRef, onMouseDown, onRemove, onConnect, onPortConnect,
}: {
  entry: StrategyMapIndicatorEntry;
  pos: { x: number; y: number };
  connectMode: boolean;
  isSource: boolean;
  viewMode: boolean;
  cardRef: (el: HTMLElement | null) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onConnect: () => void;
  onPortConnect: () => void;
}) {
  const ind = entry.indicator;
  const status = indicatorStatus(ind);
  const rag = status ? RAG[status] : null;
  const borderColor = rag?.border ?? "#0891b2";
  const bgColor     = rag?.bg ?? "#ffffff";

  const actual = ind.values?.[0]?.value ?? ind.actualValue;
  const pct = (actual != null && ind.targetValue) ? Math.round((actual / ind.targetValue) * 100) : null;

  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute group rounded-xl shadow-sm border border-gray-200 select-none overflow-visible transition-shadow",
        viewMode
          ? "cursor-default hover:shadow-md"
          : connectMode
            ? "cursor-pointer hover:shadow-md"
            : "cursor-move hover:shadow-md",
        isSource && "ring-2 ring-pulse",
      )}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, width: 170, zIndex: 10, borderLeft: `4px solid ${borderColor}`, background: bgColor, ["--tw-ring-color" as string]: borderColor }}
      onMouseDown={viewMode ? undefined : connectMode ? undefined : onMouseDown}
      onClick={!viewMode && connectMode ? onConnect : undefined}
    >
      <div className="p-3">
        <p className="text-xs font-semibold text-gray-800 leading-snug">{ind.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          {ind.targetValue != null && (
            <p className="text-[10px] text-gray-500">
              Цель: <strong className="text-gray-700">{ind.targetValue}{ind.unit ? ` ${ind.unit}` : ""}</strong>
            </p>
          )}
          {pct != null && (
            <span className={cn("text-[10px] font-bold ml-auto", rag?.badge ?? "text-gray-400")}>
              {pct}%
            </span>
          )}
        </div>
        {pct != null && (
          <div className="mt-1.5 h-1 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: borderColor }} />
          </div>
        )}
      </div>

      {/* Port circle — only in edit mode */}
      {!viewMode && (
        <div
          title="Соединить с целью"
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow cursor-pointer z-30 transition-opacity",
            connectMode ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            isSource && "scale-125",
          )}
          style={{ background: borderColor }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onPortConnect(); }}
        />
      )}

      {/* Delete — only in edit mode */}
      {!viewMode && !connectMode && (
        <button
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        ><X size={10} /></button>
      )}
    </div>
  );
}

// ── Add region dialog ─────────────────────────────────────────────────────────

function AddRegionDialog({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (label: string, color: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(REGION_COLORS[0]);

  function submit() {
    if (!label.trim()) return;
    onAdd(label.trim(), color);
    setLabel(""); setColor(REGION_COLORS[0]); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle className="text-sm">Добавить перспективу</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <Input autoFocus placeholder="Название (например: Финансы)" value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="text-sm" />
          <div>
            <p className="text-[11px] text-gray-400 mb-2">Цвет</p>
            <div className="flex gap-2 flex-wrap">
              {REGION_COLORS.map((c) => (
                <button key={c}
                  className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer",
                    color === c ? "border-gray-700 scale-110" : "border-transparent")}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <Button className="w-full" size="sm" disabled={!label.trim()} onClick={submit}>Добавить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── BoardView ─────────────────────────────────────────────────────────────────

function BoardView({ board, allGoals, allIndicators }: {
  board: StrategyMapBoard;
  allGoals: Goal[];
  allIndicators: Indicator[];
}) {
  const qc = useQueryClient();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const regionRefs = useRef(new Map<string, HTMLElement>());

  const dragRef = useRef<DragState | null>(null);
  const draggedEl = useRef<HTMLElement | null>(null);
  const finalDragPos = useRef<{ x: number; y: number } | null>(null);
  const finalDragSize = useRef<{ w: number; h: number } | null>(null);

  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});
  const [localSize, setLocalSize] = useState<Record<string, { w: number; h: number }>>({});

  const [viewMode, setViewMode] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connecting, setConnecting] = useState<ConnectSource | null>(null);
  const [addRegionOpen, setAddRegionOpen] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const inv = () => qc.invalidateQueries({ queryKey: ["strategy-map-boards"] });

  const addGoalMut    = useMutation({ mutationFn: ({ goalId, x, y }: { goalId: string; x: number; y: number }) => fetch(`/api/strategy-map-boards/${board.id}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId, x, y }) }).then(r => r.json()), onSuccess: inv });
  const removeGoalMut = useMutation({ mutationFn: (goalId: string) => fetch(`/api/strategy-map-boards/${board.id}/entries`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId }) }), onSuccess: inv });
  const moveGoalMut   = useMutation({ mutationFn: ({ goalId, x, y }: { goalId: string; x: number; y: number }) => fetch(`/api/strategy-map-boards/${board.id}/entries`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goalId, x, y }) }), onSuccess: inv });

  const addIndMut    = useMutation({ mutationFn: ({ indicatorId, x, y }: { indicatorId: string; x: number; y: number }) => fetch(`/api/strategy-map-boards/${board.id}/indicator-entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicatorId, x, y }) }).then(r => r.json()), onSuccess: inv });
  const removeIndMut = useMutation({ mutationFn: (indicatorId: string) => fetch(`/api/strategy-map-boards/${board.id}/indicator-entries`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicatorId }) }), onSuccess: inv });
  const moveIndMut   = useMutation({ mutationFn: ({ indicatorId, x, y }: { indicatorId: string; x: number; y: number }) => fetch(`/api/strategy-map-boards/${board.id}/indicator-entries/${indicatorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x, y }) }), onSuccess: inv });

  const addRegionMut    = useMutation({ mutationFn: ({ label, color }: { label: string; color: string }) => fetch(`/api/strategy-map-boards/${board.id}/regions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, color }) }).then(r => r.json()), onSuccess: inv });
  const deleteRegionMut = useMutation({ mutationFn: (regionId: string) => fetch(`/api/strategy-map-boards/${board.id}/regions`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regionId }) }), onSuccess: inv });
  const updateRegionMut = useMutation({ mutationFn: ({ regionId, ...data }: { regionId: string; label?: string; x?: number; y?: number; width?: number; height?: number }) => fetch(`/api/strategy-map-boards/${board.id}/regions/${regionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), onSuccess: inv });

  const linkMut          = useMutation({ mutationFn: ({ sourceGoalId, targetGoalId }: { sourceGoalId: string; targetGoalId: string }) => fetch(`/api/strategy-map-boards/${board.id}/links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceGoalId, targetGoalId }) }).then(r => r.json()), onSuccess: inv });
  const deleteLinkMut    = useMutation({ mutationFn: (linkId: string) => fetch(`/api/strategy-map-boards/${board.id}/links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId }) }), onSuccess: inv });
  const addIndLinkMut          = useMutation({ mutationFn: ({ indicatorId, goalId }: { indicatorId: string; goalId: string }) => fetch(`/api/strategy-map-boards/${board.id}/indicator-links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicatorId, goalId }) }).then(r => r.json()), onSuccess: inv });
  const deleteIndLinkMut       = useMutation({ mutationFn: ({ indicatorId, goalId }: { indicatorId: string; goalId: string }) => fetch(`/api/strategy-map-boards/${board.id}/indicator-links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicatorId, goalId }) }), onSuccess: inv });
  const updateLinkStrengthMut  = useMutation({ mutationFn: ({ linkId, strength }: { linkId: string; strength: number }) => fetch(`/api/strategy-map-boards/${board.id}/links`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId, strength }) }), onSuccess: inv });
  const updateIndStrengthMut   = useMutation({ mutationFn: ({ indicatorId, goalId, strength }: { indicatorId: string; goalId: string; strength: number }) => fetch(`/api/strategy-map-boards/${board.id}/indicator-links`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ indicatorId, goalId, strength }) }), onSuccess: inv });

  // ── Ref-based drag ─────────────────────────────────────────────────────────

  function startDrag(e: React.MouseEvent, state: DragState, el: HTMLElement | null) {
    if (viewMode) return;
    e.preventDefault();
    dragRef.current = state;
    draggedEl.current = el;
    finalDragPos.current = null;
    finalDragSize.current = null;
    document.body.style.cursor = "move";
    document.body.style.userSelect = "none";
  }

  function onMouseMove(e: React.MouseEvent) {
    const drag = dragRef.current;
    if (!drag || !draggedEl.current) return;
    const dx = e.clientX - drag.startCX;
    const dy = e.clientY - drag.startCY;
    if (drag.kind === "resize") {
      const w = Math.max(160, (drag.startW ?? 280) + dx);
      const h = Math.max(80,  (drag.startH ?? 200) + dy);
      finalDragSize.current = { w, h };
      draggedEl.current.style.width  = `${w}px`;
      draggedEl.current.style.height = `${h}px`;
    } else {
      const x = drag.startEX + dx;
      const y = drag.startEY + dy;
      finalDragPos.current = { x, y };
      draggedEl.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  function onMouseUp() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    draggedEl.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    if (drag.kind === "goal" && finalDragPos.current) {
      const { x, y } = finalDragPos.current;
      setLocalPos(p => ({ ...p, [drag.id]: { x, y } }));
      moveGoalMut.mutate({ goalId: drag.id, x, y });
    } else if (drag.kind === "indicator" && finalDragPos.current) {
      const { x, y } = finalDragPos.current;
      setLocalPos(p => ({ ...p, [`ind-${drag.id}`]: { x, y } }));
      moveIndMut.mutate({ indicatorId: drag.id, x, y });
    } else if (drag.kind === "region" && finalDragPos.current) {
      const { x, y } = finalDragPos.current;
      setLocalPos(p => ({ ...p, [drag.id]: { x, y } }));
      updateRegionMut.mutate({ regionId: drag.id, x, y });
    } else if (drag.kind === "resize" && finalDragSize.current) {
      const { w, h } = finalDragSize.current;
      setLocalSize(p => ({ ...p, [drag.id]: { w, h } }));
      updateRegionMut.mutate({ regionId: drag.id, width: w, height: h });
    }
    finalDragPos.current = null;
    finalDragSize.current = null;
  }

  // ── Drop from side panel ───────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    if (viewMode) return;
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent) {
    if (viewMode) return;
    e.preventDefault();
    const kind = e.dataTransfer.getData("kind");
    const id   = e.dataTransfer.getData("id");
    if (!id || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + wrapperRef.current.scrollLeft;
    const y = e.clientY - rect.top  + wrapperRef.current.scrollTop;
    if (kind === "goal")           addGoalMut.mutate({ goalId: id, x, y });
    else if (kind === "indicator") addIndMut.mutate({ indicatorId: id, x, y });
  }

  // ── Connect ────────────────────────────────────────────────────────────────

  function handleConnect(kind: "goal" | "indicator", id: string) {
    if (!connecting) { setConnecting({ kind, id }); return; }
    if (connecting.id === id && connecting.kind === kind) { setConnecting(null); return; }
    if (connecting.kind === "goal" && kind === "goal")
      linkMut.mutate({ sourceGoalId: connecting.id, targetGoalId: id });
    else if (connecting.kind === "indicator" && kind === "goal")
      addIndLinkMut.mutate({ indicatorId: connecting.id, goalId: id });
    else if (connecting.kind === "goal" && kind === "indicator")
      addIndLinkMut.mutate({ indicatorId: id, goalId: connecting.id });
    setConnecting(null);
  }

  function handlePortConnect(kind: "goal" | "indicator", id: string) {
    if (!connectMode) setConnectMode(true);
    handleConnect(kind, id);
  }

  function toggleConnectMode() {
    setConnectMode(v => !v);
    setConnecting(null);
  }

  function enterViewMode() {
    setViewMode(true);
    setConnectMode(false);
    setConnecting(null);
  }

  function enterEditMode() {
    setViewMode(false);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const assignedGoalIds = new Set(board.entries.map(e => e.goalId));
  const assignedIndIds  = new Set(board.indicatorEntries.map(e => e.indicatorId));
  const poolGoals = allGoals.filter(g => !assignedGoalIds.has(g.id));
  const poolInds  = allIndicators.filter(i => !assignedIndIds.has(i.id));
  const isEmpty   = board.regions.length === 0 && board.entries.length === 0 && board.indicatorEntries.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Side panel — edit mode only */}
      {!viewMode && (
        <div className="w-56 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col overflow-y-auto">
          <div className="p-3 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Цели {poolGoals.length > 0 && `(${poolGoals.length})`}
              </p>
              {poolGoals.length === 0
                ? <p className="text-[11px] text-gray-400 italic">Все цели на карте</p>
                : <div className="space-y-1">{poolGoals.map(g => (
                    <div key={g.id} draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("kind", "goal"); e.dataTransfer.setData("id", g.id); }}
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 cursor-move hover:border-indigo-400 hover:text-indigo-700 hover:shadow-sm transition-all select-none">
                      {g.name}
                    </div>
                  ))}</div>
              }
            </div>

            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Показатели {poolInds.length > 0 && `(${poolInds.length})`}
              </p>
              {poolInds.length === 0
                ? <p className="text-[11px] text-gray-400 italic">Все показатели на карте</p>
                : <div className="space-y-1">{poolInds.map(ind => (
                    <div key={ind.id} draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("kind", "indicator"); e.dataTransfer.setData("id", ind.id); }}
                      className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 cursor-move hover:border-cyan-400 hover:text-cyan-700 hover:shadow-sm transition-all select-none">
                      {ind.name}
                    </div>
                  ))}</div>
              }
            </div>

            <button onClick={() => setAddRegionOpen(true)}
              className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer">
              <Plus size={12} /> Добавить перспективу
            </button>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white shrink-0">
          {/* Connect mode toggle — edit mode only */}
          {!viewMode && (
            <>
              <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-full">
                <button
                  onClick={() => { setConnectMode(false); setConnecting(null); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    !connectMode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}>
                  <Link2 size={11} /> Режим связи выкл
                </button>
                <button
                  onClick={() => setConnectMode(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                    connectMode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}>
                  <Link2 size={11} /> Режим связи вкл
                </button>
              </div>
              {connectMode && (
                <span className="text-xs text-gray-400">
                  {connecting
                    ? "Нажмите на цель или кружок — соединение будет создано"
                    : "Наведите на карточку и нажмите на кружок справа"}
                </span>
              )}
            </>
          )}

          {/* Mode segmented toggle */}
          <div className="ml-auto flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-full">
            <button
              onClick={enterEditMode}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                !viewMode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}>
              <PenLine size={11} /> Редактирование
            </button>
            <button
              onClick={enterViewMode}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                viewMode ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}>
              <Eye size={11} /> Просмотр
            </button>
          </div>
        </div>

        {/* Canvas wrapper */}
        <div ref={wrapperRef} className="flex-1 overflow-auto"
          onDragOver={onDragOver} onDrop={onDrop}
          onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          <div ref={canvasRef} className="relative"
            style={{
              width: 3000, height: 2000,
              background: "#f8fafc",
              backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}>
            {isEmpty && !viewMode && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-gray-400 text-center">
                  Добавьте перспективу и перетащите цели на карту
                </p>
              </div>
            )}

            {/* Regions */}
            {board.regions.map((region) => {
              const lp = localPos[region.id];
              const ls = localSize[region.id];
              const pos  = { x: lp?.x ?? region.x,     y: lp?.y ?? region.y };
              const size = { w: ls?.w ?? region.width,  h: ls?.h ?? region.height };
              return (
                <RegionBox key={region.id} ref={(el) => { if (el) regionRefs.current.set(region.id, el); else regionRefs.current.delete(region.id); }}
                  region={region} pos={pos} size={size} viewMode={viewMode}
                  onHeaderMouseDown={(e) => startDrag(e,
                    { kind: "region", id: region.id, startCX: e.clientX, startCY: e.clientY, startEX: pos.x, startEY: pos.y },
                    regionRefs.current.get(region.id) ?? null)}
                  onResizeMouseDown={(e) => { e.stopPropagation(); startDrag(e,
                    { kind: "resize", id: region.id, startCX: e.clientX, startCY: e.clientY, startEX: pos.x, startEY: pos.y, startW: size.w, startH: size.h },
                    regionRefs.current.get(region.id) ?? null); }}
                  onDelete={() => deleteRegionMut.mutate(region.id)}
                  onLabelChange={(label) => updateRegionMut.mutate({ regionId: region.id, label })} />
              );
            })}

            {/* Goal cards */}
            {board.entries.map((entry) => {
              const lp  = localPos[entry.goalId];
              const pos = { x: lp?.x ?? entry.x, y: lp?.y ?? entry.y };
              return (
                <GoalCard key={entry.id} entry={entry} pos={pos} viewMode={viewMode}
                  status={goalStatus(entry.goalId, board.indicatorLinks, board.indicatorEntries)}
                  connectMode={connectMode}
                  isSource={connecting?.id === entry.goalId && connecting?.kind === "goal"}
                  cardRef={(el) => { if (el) cardRefs.current.set(entry.goalId, el); else cardRefs.current.delete(entry.goalId); }}
                  onMouseDown={(e) => startDrag(e,
                    { kind: "goal", id: entry.goalId, startCX: e.clientX, startCY: e.clientY, startEX: pos.x, startEY: pos.y },
                    cardRefs.current.get(entry.goalId) ?? null)}
                  onRemove={() => removeGoalMut.mutate(entry.goalId)}
                  onConnect={() => handleConnect("goal", entry.goalId)}
                  onPortConnect={() => handlePortConnect("goal", entry.goalId)} />
              );
            })}

            {/* Indicator cards */}
            {board.indicatorEntries.map((ie) => {
              const lp  = localPos[`ind-${ie.indicatorId}`];
              const pos = { x: lp?.x ?? ie.x, y: lp?.y ?? ie.y };
              return (
                <IndicatorCard key={ie.id} entry={ie} pos={pos} viewMode={viewMode}
                  connectMode={connectMode}
                  isSource={connecting?.id === ie.indicatorId && connecting?.kind === "indicator"}
                  cardRef={(el) => { if (el) cardRefs.current.set(`ind-${ie.indicatorId}`, el); else cardRefs.current.delete(`ind-${ie.indicatorId}`); }}
                  onMouseDown={(e) => startDrag(e,
                    { kind: "indicator", id: ie.indicatorId, startCX: e.clientX, startCY: e.clientY, startEX: pos.x, startEY: pos.y },
                    cardRefs.current.get(`ind-${ie.indicatorId}`) ?? null)}
                  onRemove={() => removeIndMut.mutate(ie.indicatorId)}
                  onConnect={() => handleConnect("indicator", ie.indicatorId)}
                  onPortConnect={() => handlePortConnect("indicator", ie.indicatorId)} />
              );
            })}

            <LinksOverlay board={board} cardRefs={cardRefs} canvasRef={canvasRef} viewMode={viewMode}
              onDeleteLink={(id) => deleteLinkMut.mutate(id)}
              onUnlinkIndicator={(indicatorId, goalId) => deleteIndLinkMut.mutate({ indicatorId, goalId })}
              onUpdateStrength={(arrow, strength) => {
                if (arrow.kind === "goal-goal") updateLinkStrengthMut.mutate({ linkId: arrow.id, strength });
                else updateIndStrengthMut.mutate({ indicatorId: arrow.sourceId, goalId: arrow.targetId, strength });
              }} />
          </div>
        </div>
      </div>

      <AddRegionDialog open={addRegionOpen} onClose={() => setAddRegionOpen(false)}
        onAdd={(label, color) => addRegionMut.mutate({ label, color })} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StrategyMapPage() {
  const qc = useQueryClient();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: boards = [], isLoading } = useQuery<StrategyMapBoard[]>({
    queryKey: ["strategy-map-boards"],
    queryFn: () => fetch("/api/strategy-map-boards").then(r => r.json()),
  });

  useEffect(() => {
    if (activeBoardId === null && boards.length > 0) setActiveBoardId(boards[0].id);
  }, [boards, activeBoardId]);

  const { data: allGoals = [] } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => fetch("/api/goals").then(r => r.json()),
  });

  const { data: allIndicators = [] } = useQuery<Indicator[]>({
    queryKey: ["indicators"],
    queryFn: () => fetch("/api/indicators").then(r => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (name: string) => fetch("/api/strategy-map-boards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(r => r.json()),
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ["strategy-map-boards"] });
      setActiveBoardId(board.id); setCreating(false); setNewName("");
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetch(`/api/strategy-map-boards/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategy-map-boards"] }); setRenamingId(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/strategy-map-boards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["strategy-map-boards"] });
      if (deleteId === activeBoardId) setActiveBoardId(boards.find(b => b.id !== deleteId)?.id ?? null);
      setDeleteId(null);
    },
  });

  const activeBoard = boards.find(b => b.id === activeBoardId) ?? null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader
        title="Стратегические карты"
        description="Свободная расстановка целей и показателей на холсте"
        action={<AddButton onClick={() => setCreating(true)}>Добавить карту</AddButton>}
      />

      {(boards.length > 0 || creating) && (
        <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-100 bg-white overflow-x-auto shrink-0">
          {boards.map((board) => (
            <div key={board.id} className="flex items-center shrink-0">
              {renamingId === board.id ? (
                <form onSubmit={(e) => { e.preventDefault(); renameMut.mutate({ id: board.id, name: renameValue }); }}
                  className="flex items-center gap-1">
                  <Input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    className="h-7 text-xs w-36" onBlur={() => setRenamingId(null)} />
                </form>
              ) : (
                <button onClick={() => setActiveBoardId(board.id)}
                  className={cn("group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    activeBoardId === board.id ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700")}>
                  <MapIcon size={12} />
                  {board.name}
                  <span className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span onClick={(e) => { e.stopPropagation(); setRenamingId(board.id); setRenameValue(board.name); }}
                      className="hover:text-blue-600 p-0.5 rounded cursor-pointer"><Pencil size={10} /></span>
                    <span onClick={(e) => { e.stopPropagation(); setDeleteId(board.id); }}
                      className="hover:text-red-500 p-0.5 rounded cursor-pointer"><Trash2 size={10} /></span>
                  </span>
                </button>
              )}
            </div>
          ))}

          {creating && (
            <form onSubmit={(e) => { e.preventDefault(); if (newName.trim()) createMut.mutate(newName.trim()); }}
              className="flex items-center gap-1 shrink-0">
              <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Название карты" className="h-7 text-xs w-36"
                onBlur={() => { if (!newName.trim()) setCreating(false); }} />
              <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!newName.trim()}><Plus size={12} /></Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2"
                onClick={() => { setCreating(false); setNewName(""); }}><X size={12} /></Button>
            </form>
          )}
        </div>
      )}

      {isLoading && <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Загрузка...</div>}

      {!isLoading && boards.length === 0 && !creating && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
          <MapIcon size={40} className="opacity-20" />
          <p className="text-sm">Нет стратегических карт.</p>
          <AddButton onClick={() => setCreating(true)}>Создать первую карту</AddButton>
        </div>
      )}

      {activeBoard && (
        <BoardView key={activeBoard.id} board={activeBoard} allGoals={allGoals} allIndicators={allIndicators} />
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)} loading={deleteMut.isPending} />
    </div>
  );
}
