"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/shared/AddButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Goal } from "@/types";
import { goalPct, periodLabel } from "@/lib/utils";

interface Strategy { id: string; name: string; color: string; }
interface Position { id: string; name: string; }

interface FormState {
  name: string;
  description: string;
  weight: string;
  deadline: string;
  strategyId: string;
  ownerId: string;
}

const empty: FormState = { name: "", description: "", weight: "", deadline: "", strategyId: "", ownerId: "" };

export default function GoalsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [filterStrategyId, setFilterStrategyId] = useState<string>("__all__");
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => fetch("/api/goals").then((r) => r.json()),
  });

  const { data: strategies = [] } = useQuery<Strategy[]>({
    queryKey: ["strategies"],
    queryFn: () => fetch("/api/strategies").then((r) => r.json()),
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: FormState) =>
      fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); qc.invalidateQueries({ queryKey: ["strategies"] }); closeDialog(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      fetch(`/api/goals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); qc.invalidateQueries({ queryKey: ["strategies"] }); closeDialog(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); qc.invalidateQueries({ queryKey: ["strategies"] }); setDeleteId(null); },
  });

  function openCreate() { setEditGoal(null); setForm(empty); setDialogOpen(true); }

  function openEdit(goal: Goal) {
    setEditGoal(goal);
    setForm({ name: goal.name, description: goal.description ?? "", weight: goal.weight?.toString() ?? "", deadline: goal.deadline ?? "", strategyId: goal.strategyId ?? "", ownerId: goal.ownerId ?? "" });
    setDialogOpen(true);
  }

  function closeDialog() { setDialogOpen(false); setEditGoal(null); setForm(empty); }

  function submit() {
    if (editGoal) updateMut.mutate({ id: editGoal.id, data: form });
    else createMut.mutate(form);
  }

  const loading = createMut.isPending || updateMut.isPending;

  const strategyMap = Object.fromEntries(strategies.map((s) => [s.id, s]));

  const visibleGoals = useMemo(() => {
    let list = filterStrategyId === "__all__"
      ? goals
      : filterStrategyId === "__none__"
        ? goals.filter((g) => !g.strategyId)
        : goals.filter((g) => g.strategyId === filterStrategyId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) =>
      sortNewest
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return list;
  }, [goals, filterStrategyId, search, sortNewest]);

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Цели"
        description="Стратегические цели компании"
        action={<AddButton onClick={openCreate}>Добавить цель</AddButton>}
      />

      <div className="p-4">
        {/* Strategy filter */}
        {strategies.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setFilterStrategyId("__all__")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filterStrategyId === "__all__" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Все
            </button>
            {strategies.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterStrategyId(filterStrategyId === s.id ? "__all__" : s.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filterStrategyId === s.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                style={filterStrategyId === s.id ? { background: s.color } : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: filterStrategyId === s.id ? "white" : s.color }} />
                {s.name}
              </button>
            ))}
            <button
              onClick={() => setFilterStrategyId(filterStrategyId === "__none__" ? "__all__" : "__none__")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${filterStrategyId === "__none__" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Без стратегии
            </button>
          </div>
        )}

        {/* Search + sort toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors bg-white"
            />
          </div>
          <button
            onClick={() => setSortNewest((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
          >
            <ArrowUpDown size={13} />
            {sortNewest ? "Сначала новые" : "Сначала старые"}
          </button>
        </div>

        {isLoading && <p className="text-sm text-gray-400 px-2">Загрузка...</p>}

        {!isLoading && goals.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Целей пока нет.</p>
            <AddButton onClick={openCreate} className="mt-3">Создать первую цель</AddButton>
          </div>
        )}

        {!isLoading && goals.length > 0 && visibleGoals.length === 0 && (
          <p className="text-sm text-gray-400 px-2">Нет целей по выбранному фильтру.</p>
        )}

        {visibleGoals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Название</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Стратегия</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ответственный</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Дедлайн</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Вес</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Выполнение</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleGoals.map((goal, idx) => {
                  const strategy = goal.strategyId ? strategyMap[goal.strategyId] : null;
                  return (
                    <tr key={goal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-800">{goal.name}</span>
                        {goal.description && <p className="text-xs text-gray-400 truncate mt-0.5 max-w-xs">{goal.description}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        {strategy ? (
                          <span className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: strategy.color }} />
                            {strategy.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{goal.owner?.name ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{goal.deadline ? periodLabel(goal.deadline) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">{goal.weight != null ? `${goal.weight}%` : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold">
                        {(() => {
                          const pct = goalPct(goal.indicators ?? []);
                          if (pct == null) return <span className="text-gray-300 font-normal">—</span>;
                          const cls = pct >= 100 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-500";
                          return <span className={cls}>{pct}%</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(goal)}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => setDeleteId(goal.id)}><Trash2 size={13} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editGoal ? "Редактировать цель" : "Новая цель"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Увеличить выручку на 20%" />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Стратегия</Label>
              <Select value={form.strategyId || "__none__"} onValueChange={(v) => setForm({ ...form, strategyId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger>
                  {form.strategyId ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: strategyMap[form.strategyId]?.color }} />
                      <span>{strategyMap[form.strategyId]?.name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">— не выбрана —</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— не выбрана —</SelectItem>
                  {strategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ответственный</Label>
              <Select value={form.ownerId || "__none__"} onValueChange={(v) => setForm({ ...form, ownerId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger>
                  {form.ownerId ? <span>{positions.find((p) => p.id === form.ownerId)?.name}</span> : <span className="text-gray-400">— не выбран —</span>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— не выбран —</SelectItem>
                  {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Вес, %</Label>
              <Input type="number" min={0} max={100} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Введите вес в процентах" />
            </div>
            <div className="space-y-1.5">
              <Label>Дедлайн</Label>
              <Input type="month" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button onClick={submit} disabled={!form.name || loading}>
              {loading ? "Сохранение..." : editGoal ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
