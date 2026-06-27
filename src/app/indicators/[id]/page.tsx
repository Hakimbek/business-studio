"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Indicator } from "@/types";
import { periodLabel, MONTHS_RU } from "@/lib/utils";

interface IndicatorValue { id: string; period: string; value: number; note?: string | null; }

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

export default function IndicatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [period, setPeriod] = useState(currentPeriod());
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: indicator, isLoading } = useQuery<Indicator>({
    queryKey: ["indicator", id],
    queryFn: () => fetch(`/api/indicators/${id}`).then((r) => r.json()),
  });

  const { data: values = [] } = useQuery<IndicatorValue[]>({
    queryKey: ["indicator-values", id],
    queryFn: () => fetch(`/api/indicator-values?indicatorId=${id}`).then((r) => r.json()),
  });

  const addMut = useMutation({
    mutationFn: (d: { indicatorId: string; period: string; value: number; note: string }) =>
      fetch("/api/indicator-values", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicator-values", id] });
      qc.invalidateQueries({ queryKey: ["indicators"] });
      setValue(""); setNote(""); setAdding(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (valueId: string) => fetch(`/api/indicator-values/${valueId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indicator-values", id] });
      qc.invalidateQueries({ queryKey: ["indicators"] });
    },
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Загрузка...</div>;
  if (!indicator) return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Показатель не найден</div>;

  const months = monthOptions();
  const latestValue = values[0];
  const pct = indicator.targetValue && latestValue ? Math.round((latestValue.value / indicator.targetValue) * 100) : null;
  const pctColor = pct == null ? "text-gray-400" : pct >= 100 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-500";
  const pctBg = pct == null ? "bg-gray-50" : pct >= 100 ? "bg-green-50" : pct >= 70 ? "bg-yellow-50" : "bg-red-50";

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer mb-3"
        >
          <ArrowLeft size={15} /> Показатели
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{indicator.name}</h1>
            {indicator.goal && <p className="text-sm text-gray-500 mt-0.5">Цель: {indicator.goal.name}</p>}
            {indicator.description && <p className="text-sm text-gray-500 mt-1">{indicator.description}</p>}
          </div>
          {pct != null && (
            <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${pctBg}`}>
              <span className={`text-2xl font-bold ${pctColor}`}>{pct}%</span>
              <span className="text-xs text-gray-400 mt-0.5">выполнение</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Целевое значение", value: indicator.targetValue != null ? `${indicator.targetValue}${indicator.unit ? ` ${indicator.unit}` : ""}` : "—" },
            { label: "Последний факт", value: latestValue != null ? `${latestValue.value}${indicator.unit ? ` ${indicator.unit}` : ""}` : "—" },
            { label: "Ответственный", value: indicator.owner?.name ?? "—" },
            { label: "Дедлайн", value: indicator.deadline ? new Date(indicator.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "—" },
          ].map(({ label, value: val }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{val}</p>
            </div>
          ))}
        </div>

        {/* Period history */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">История фактических значений</h2>
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <PlusCircle size={14} /> Добавить
              </button>
            )}
          </div>

          {adding && (
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">Период</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v ?? currentPeriod())}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Факт{indicator.unit ? ` (${indicator.unit})` : ""}</Label>
                  <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className="h-8 text-xs" autoFocus />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Примечание</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="необязательно" className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAdding(false)}>Отмена</Button>
                <Button size="sm" className="h-7 text-xs"
                  onClick={() => addMut.mutate({ indicatorId: id, period, value: Number(value), note })}
                  disabled={!value || addMut.isPending}>
                  {addMut.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          )}

          {values.length === 0 && !adding && (
            <p className="px-4 py-6 text-sm text-center text-gray-400">Данных пока нет. Нажмите «Добавить» чтобы внести первое значение.</p>
          )}

          {values.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Период</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Факт</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Цель</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Примечание</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {values.map((v) => {
                  const p = indicator.targetValue ? Math.round((v.value / indicator.targetValue) * 100) : null;
                  const pc = p == null ? "text-gray-400" : p >= 100 ? "text-green-600" : p >= 70 ? "text-yellow-600" : "text-red-500";
                  return (
                    <tr key={v.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{periodLabel(v.period)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{v.value}{indicator.unit ? ` ${indicator.unit}` : ""}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{indicator.targetValue ?? "—"}{indicator.unit ? ` ${indicator.unit}` : ""}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${pc}`}>{p != null ? `${p}%` : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-sm">{v.note ?? ""}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button onClick={() => deleteMut.mutate(v.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity cursor-pointer">
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
