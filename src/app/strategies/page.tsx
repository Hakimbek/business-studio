"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/shared/AddButton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Goal } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Strategy {
  id: string; name: string; description?: string | null; color: string;
  goals: (Goal & { indicators: { targetValue?: number | null; actualValue?: number | null }[] })[];
}

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS = [
  "#2563eb", "#9333ea", "#16a34a", "#ea580c",
  "#0891b2", "#db2777", "#ca8a04", "#64748b",
];

// ─── Strategy card ────────────────────────────────────────────────────────────

function StrategyCard({ strategy, onEdit, onDelete }: { strategy: Strategy; onEdit: () => void; onDelete: () => void }) {
  const goalCount = strategy.goals.length;
  const totalTarget = strategy.goals.reduce((s, g) => s + g.indicators.reduce((a, i) => a + (i.targetValue ?? 0), 0), 0);
  const totalActual = strategy.goals.reduce((s, g) => s + g.indicators.reduce((a, i) => a + (i.actualValue ?? 0), 0), 0);
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-sm transition-shadow">
      <div className="h-1.5" style={{ background: strategy.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: strategy.color }} />
            <h3 className="font-semibold text-gray-900 text-sm">{strategy.name}</h3>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={12} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={onDelete}><Trash2 size={12} /></Button>
          </div>
        </div>

        {strategy.description && (
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">{strategy.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Target size={11} />
            <span>{goalCount} {goalCount === 1 ? "цель" : goalCount < 5 ? "цели" : "целей"}</span>
          </span>
          {pct != null && (
            <Badge className={`text-xs border-0 ${pct >= 100 ? "bg-green-100 text-green-700" : pct >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
              {pct}%
            </Badge>
          )}
        </div>

        {/* Goals list */}
        {goalCount > 0 && (
          <div className="space-y-1.5">
            {strategy.goals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: strategy.color }} />
                <span className="flex-1 truncate">{goal.name}</span>
              </div>
            ))}
          </div>
        )}

        {goalCount === 0 && (
          <p className="text-xs text-gray-300 italic">Нет привязанных целей</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface StrategyForm { name: string; description: string; color: string; }
const emptyForm: StrategyForm = { name: "", description: "", color: "#2563eb" };

export default function StrategiesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Strategy | null>(null);
  const [form, setForm] = useState<StrategyForm>(emptyForm);

  const { data: strategies = [], isLoading } = useQuery<Strategy[]>({
    queryKey: ["strategies"],
    queryFn: () => fetch("/api/strategies").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (d: StrategyForm) =>
      fetch("/api/strategies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategies"] }); closeDialog(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StrategyForm }) =>
      fetch(`/api/strategies/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategies"] }); closeDialog(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/strategies/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["strategies"] }); setDeleteId(null); },
  });

  function openCreate() { setEditItem(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(s: Strategy) { setEditItem(s); setForm({ name: s.name, description: s.description ?? "", color: s.color }); setDialogOpen(true); }
  function closeDialog() { setDialogOpen(false); setEditItem(null); setForm(emptyForm); }
  function submit() {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  }

  const loading = createMut.isPending || updateMut.isPending;

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Стратегии"
        description="Стратегические направления компании"
        action={<AddButton onClick={openCreate}>Добавить стратегию</AddButton>}
      />

      <div className="p-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Стратегические направления</h2>
            <span className="text-xs text-gray-400">{strategies.length} направлений</span>
          </div>

          {isLoading && <p className="text-sm text-gray-400">Загрузка...</p>}

          {!isLoading && strategies.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
              <p className="text-sm mb-3">Стратегических направлений пока нет.</p>
              <AddButton onClick={openCreate}>Добавить первое</AddButton>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {strategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleteId(s.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Strategy dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать направление" : "Новое стратегическое направление"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Рост выручки, Цифровизация..." />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Краткое описание стратегии..." />
            </div>
            <div className="space-y-1.5">
              <Label>Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 ring-offset-2"
                    style={{ background: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button onClick={submit} disabled={!form.name || loading} style={{ background: form.color }}>
              {loading ? "Сохранение..." : editItem ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} loading={deleteMut.isPending} />
    </div>
  );
}
