"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
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
import type { Process } from "@/types";

interface Risk {
  id: string;
  name: string;
  description?: string | null;
  probability?: number | null;
  impact?: number | null;
  processId?: string | null;
  process?: Process | null;
  createdAt: string;
}

interface FormState {
  name: string;
  description: string;
  probability: string;
  impact: string;
  processId: string;
}

const empty: FormState = { name: "", description: "", probability: "", impact: "", processId: "" };

const LEVELS = ["1", "2", "3", "4", "5"];

function riskScore(p?: number | null, i?: number | null) {
  if (!p || !i) return null;
  return p * i;
}

function riskColor(score: number | null) {
  if (!score) return "bg-gray-100 text-gray-500";
  if (score <= 4) return "bg-green-100 text-green-700";
  if (score <= 9) return "bg-yellow-100 text-yellow-700";
  if (score <= 16) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function riskLabel(score: number | null) {
  if (!score) return "—";
  if (score <= 4) return "Низкий";
  if (score <= 9) return "Средний";
  if (score <= 16) return "Высокий";
  return "Критический";
}

// 5x5 heat map cell color
function heatColor(p: number, i: number) {
  const s = p * i;
  if (s <= 4) return "bg-green-200";
  if (s <= 9) return "bg-yellow-200";
  if (s <= 16) return "bg-orange-300";
  return "bg-red-400";
}

export default function RisksPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Risk | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [view, setView] = useState<"list" | "matrix">("list");

  const { data: risks = [], isLoading } = useQuery<Risk[]>({
    queryKey: ["risks"],
    queryFn: () => fetch("/api/risks").then((r) => r.json()),
  });

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ["processes"],
    queryFn: () => fetch("/api/processes").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (d: FormState) =>
      fetch("/api/risks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risks"] }); qc.invalidateQueries({ queryKey: ["stats"] }); closeDialog(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      fetch(`/api/risks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risks"] }); closeDialog(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/risks/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risks"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setDeleteId(null); },
  });

  function openCreate() { setEditItem(null); setForm(empty); setDialogOpen(true); }
  function openEdit(r: Risk) {
    setEditItem(r);
    setForm({ name: r.name, description: r.description ?? "", probability: r.probability?.toString() ?? "", impact: r.impact?.toString() ?? "", processId: r.processId ?? "" });
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); setEditItem(null); setForm(empty); }
  function submit() {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  }

  const loading = createMut.isPending || updateMut.isPending;

  // Build 5x5 matrix: count risks per cell
  const matrix: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  risks.forEach((r) => {
    if (r.probability && r.impact) {
      matrix[r.probability - 1][r.impact - 1].push(r);
    }
  });

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Риски"
        description="Управление операционными рисками"
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Список</button>
              <button onClick={() => setView("matrix")} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "matrix" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>Матрица</button>
            </div>
            <AddButton onClick={openCreate}>Добавить риск</AddButton>
          </div>
        }
      />

      <div className="p-4">
        {isLoading && <p className="text-sm text-gray-400">Загрузка...</p>}

        {!isLoading && risks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Рисков пока нет.</p>
            <AddButton onClick={openCreate} className="mt-3">Добавить первый риск</AddButton>
          </div>
        )}

        {view === "list" && risks.length > 0 && (
          <div className="space-y-2">
            {risks.map((risk) => {
              const score = riskScore(risk.probability, risk.impact);
              return (
                <div key={risk.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{risk.name}</span>
                      <Badge className={`text-xs border-0 ${riskColor(score)}`}>{riskLabel(score)}{score ? ` (${score})` : ""}</Badge>
                    </div>
                    {risk.description && <p className="text-xs text-gray-500 mb-2">{risk.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {risk.probability && <span>Вероятность: <strong className="text-gray-700">{risk.probability}/5</strong></span>}
                      {risk.impact && <span>Влияние: <strong className="text-gray-700">{risk.impact}/5</strong></span>}
                      {risk.process && <span>Процесс: <strong className="text-gray-700">{risk.process.name}</strong></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(risk)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setDeleteId(risk.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "matrix" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex gap-2 mb-4 text-xs text-gray-500 items-center">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Низкий (1–4)</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Средний (5–9)</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" /> Высокий (10–16)</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Критический (17–25)</span>
            </div>
            <div className="flex gap-1">
              {/* Y-axis label */}
              <div className="flex flex-col items-center justify-center w-6 mr-1">
                <span className="text-xs text-gray-400 -rotate-90 whitespace-nowrap">Вероятность</span>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                {/* Matrix rows: probability 5→1 (top=high) */}
                {[5, 4, 3, 2, 1].map((p) => (
                  <div key={p} className="flex gap-1 items-center">
                    <span className="text-xs text-gray-400 w-4 text-right">{p}</span>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const cellRisks = matrix[p - 1][i - 1];
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-14 rounded flex items-center justify-center text-xs font-medium ${heatColor(p, i)} transition-all`}
                          title={cellRisks.map((r) => r.name).join(", ")}
                        >
                          {cellRisks.length > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold">{cellRisks.length}</span>
                              {cellRisks.length === 1 && (
                                <span className="text-[10px] text-center px-1 leading-tight max-w-[70px] truncate">{cellRisks[0].name}</span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {/* X-axis */}
                <div className="flex gap-1 mt-1">
                  <span className="w-4" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="flex-1 text-xs text-gray-400 text-center">{i}</span>
                  ))}
                </div>
                <div className="flex justify-center mt-1">
                  <span className="text-xs text-gray-400">Влияние</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать риск" : "Новый риск"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Потеря ключевого поставщика" />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Вероятность (1–5)</Label>
                <Select value={form.probability || "__none__"} onValueChange={(v) => setForm({ ...form, probability: v === "__none__" ? "" : (v ?? "") })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Влияние (1–5)</Label>
                <Select value={form.impact || "__none__"} onValueChange={(v) => setForm({ ...form, impact: v === "__none__" ? "" : (v ?? "") })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.probability && form.impact && (
              <div className={`px-3 py-2 rounded-md text-sm font-medium ${riskColor(Number(form.probability) * Number(form.impact))}`}>
                Уровень риска: {riskLabel(Number(form.probability) * Number(form.impact))} ({Number(form.probability) * Number(form.impact)})
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Процесс</Label>
              <Select value={form.processId || "__none__"} onValueChange={(v) => setForm({ ...form, processId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="— не выбран —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— не выбран —</SelectItem>
                  {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code}. ` : ""}{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMut.mutate(deleteId)} loading={deleteMut.isPending} />
    </div>
  );
}
