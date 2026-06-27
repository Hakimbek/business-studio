"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, PlusCircle, Trash2, X, Search, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/shared/AddButton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Indicator } from "@/types";
import { periodLabel, MONTHS_RU } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Utils ────────────────────────────────────────────────────────────────────

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: val, label: periodLabel(val) });
  }
  return options.reverse();
}

// ─── Period section ───────────────────────────────────────────────────────────

interface IndicatorValue { id: string; period: string; value: number; note?: string | null; }

function PeriodSection({ indicator }: { indicator: Indicator }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: values = [] } = useQuery<IndicatorValue[]>({
    queryKey: ["indicator-values", indicator.id],
    queryFn: () => fetch(`/api/indicator-values?indicatorId=${indicator.id}`).then((r) => r.json()),
  });

  const addMut = useMutation({
    mutationFn: (d: { indicatorId: string; period: string; value: number; note: string }) =>
      fetch("/api/indicator-values", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicator-values", indicator.id] });
      qc.invalidateQueries({ queryKey: ["indicators"] });
      setValue(""); setNote(""); setAdding(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/indicator-values/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicator-values", indicator.id] });
      qc.invalidateQueries({ queryKey: ["indicators"] });
    },
  });

  const months = monthOptions();

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-3">
      {values.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 font-medium">
              <th className="text-left pb-1.5">Период</th>
              <th className="text-right pb-1.5">Факт</th>
              <th className="text-right pb-1.5">Цель</th>
              <th className="text-right pb-1.5">%</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {values.map((v) => {
              const pct = indicator.targetValue ? Math.round((v.value / indicator.targetValue) * 100) : null;
              const pctColor = pct == null ? "text-gray-400" : pct >= 100 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-500";
              return (
                <tr key={v.id} className="group hover:bg-gray-100 transition-colors">
                  <td className="py-1.5 text-gray-700 font-medium">{periodLabel(v.period)}</td>
                  <td className="py-1.5 text-right text-gray-900 font-semibold">{v.value}{indicator.unit ? ` ${indicator.unit}` : ""}</td>
                  <td className="py-1.5 text-right text-gray-400">{indicator.targetValue ?? "—"}{indicator.unit ? ` ${indicator.unit}` : ""}</td>
                  <td className={`py-1.5 text-right font-bold ${pctColor}`}>{pct != null ? `${pct}%` : "—"}</td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => deleteMut.mutate(v.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity cursor-pointer">
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {values.length === 0 && !adding && (
        <p className="text-xs text-gray-400">Данных пока нет</p>
      )}

      {adding ? (
        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">Период</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v ?? currentPeriod())}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Факт{indicator.unit ? ` (${indicator.unit})` : ""}</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="0" className="h-7 text-xs" autoFocus />
            </div>
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Примечание (необязательно)" className="h-7 text-xs" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setAdding(false)}>Отмена</Button>
            <Button size="sm" className="h-6 text-xs px-2"
              onClick={() => addMut.mutate({ indicatorId: indicator.id, period, value: Number(value), note })}
              disabled={!value || addMut.isPending}>
              {addMut.isPending ? "..." : "Сохранить"}
            </Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors cursor-pointer">
          <PlusCircle size={12} /> Добавить период
        </button>
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string; description: string; unit: string;
  targetValue: string; deadline: string; ownerId: string;
}
const empty: FormState = { name: "", description: "", unit: "", targetValue: "", deadline: "", ownerId: "" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IndicatorsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Indicator | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailIndicator, setDetailIndicator] = useState<Indicator | null>(null);

  const { data: indicators = [], isLoading } = useQuery<Indicator[]>({
    queryKey: ["indicators"],
    queryFn: () => fetch("/api/indicators").then((r) => r.json()),
  });

  const { data: positions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) =>
      fetch("/api/indicators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["indicators"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      fetch(`/api/indicators/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["indicators"] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/indicators/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["indicators"] }); setDeleteId(null); },
  });


  function openCreate() { setEditItem(null); setForm(empty); setDialogOpen(true); }
  function openEdit(item: Indicator) {
    setEditItem(item);
    setForm({ name: item.name, description: item.description ?? "", unit: item.unit ?? "", targetValue: item.targetValue?.toString() ?? "", deadline: item.deadline ? item.deadline.slice(0, 10) : "", ownerId: item.ownerId ?? "" });
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); setEditItem(null); setForm(empty); }
  function submit() {
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  const visibleIndicators = useMemo(() => {
    const list = indicators.filter((ind) =>
      ind.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortDir === "asc" ? da - db : db - da;
    });
  }, [indicators, search, sortDir]);

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Показатели"
        description="KPI и метрики, привязанные к целям"
        action={<AddButton onClick={openCreate}>Добавить показатель</AddButton>}
      />

      <div className="p-4">
        {isLoading && <p className="text-sm text-gray-400">Загрузка...</p>}

        {!isLoading && indicators.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Показателей пока нет.</p>
            <AddButton onClick={openCreate} className="mt-3">Создать первый показатель</AddButton>
          </div>
        )}

        {indicators.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию..."
                className="w-full pl-8 pr-3 h-8 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              />
            </div>
            <button
              onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              {sortDir === "desc" ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
              {sortDir === "desc" ? "Сначала новые" : "Сначала старые"}
            </button>
          </div>
        )}

        {indicators.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 w-10">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Название</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Цель (зн.)</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Факт</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ответственный</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Дедлайн</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleIndicators.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-sm text-center text-gray-400">Ничего не найдено</td>
                  </tr>
                )}
                {visibleIndicators.map((ind, idx) => {
                  const pct = ind.targetValue && ind.actualValue != null
                    ? Math.round((ind.actualValue / ind.targetValue) * 100)
                    : null;
                  const pctColor = pct == null ? "text-gray-400"
                    : pct >= 100 ? "text-green-600"
                    : pct >= 70  ? "text-yellow-600"
                    : "text-red-500";

                  return (
                    <tr key={ind.id}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => setDetailIndicator(ind)}>
                      <td className="px-3 py-2.5 text-xs text-gray-400 text-center">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900 text-sm">{ind.name}</div>
                        {ind.goal && <div className="text-[11px] text-gray-400 mt-0.5">{ind.goal.name}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {ind.targetValue != null
                          ? <>{ind.targetValue}{ind.unit && <span className="text-gray-400 ml-1">{ind.unit}</span>}</>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {ind.actualValue != null
                          ? <>{ind.actualValue}{ind.unit && <span className="text-gray-400 ml-1">{ind.unit}</span>}</>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={cn("px-3 py-2.5 text-sm font-semibold", pctColor)}>
                        {pct != null ? `${pct}%` : <span className="text-gray-300 font-normal">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">
                        {ind.owner?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">
                        {ind.deadline
                          ? new Date(ind.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-700 cursor-pointer" onClick={() => openEdit(ind)}><Pencil size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => setDeleteId(ind.id)}><Trash2 size={12} /></Button>
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
            <DialogTitle>{editItem ? "Редактировать показатель" : "Новый показатель"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Выручка, Доля рынка..." />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Единица измерения</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, руб, шт" />
              </div>
              <div className="space-y-1.5">
                <Label>Целевое значение</Label>
                <Input type="number" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} placeholder="100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Дедлайн</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button onClick={submit} disabled={!form.name || loading}>
              {loading ? "Сохранение..." : editItem ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />

      <Dialog open={!!detailIndicator} onOpenChange={(open) => { if (!open) setDetailIndicator(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailIndicator?.name}</DialogTitle>
            {detailIndicator?.goal && (
              <p className="text-sm text-gray-500 mt-0.5">{detailIndicator.goal.name}</p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Цель</p>
              <p className="text-sm font-medium text-gray-800">
                {detailIndicator?.targetValue != null
                  ? `${detailIndicator.targetValue}${detailIndicator.unit ? ` ${detailIndicator.unit}` : ""}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Ответственный</p>
              <p className="text-sm font-medium text-gray-800">{detailIndicator?.owner?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Дедлайн</p>
              <p className="text-sm font-medium text-gray-800">
                {detailIndicator?.deadline
                  ? new Date(detailIndicator.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
          {detailIndicator && <PeriodSection indicator={detailIndicator} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
