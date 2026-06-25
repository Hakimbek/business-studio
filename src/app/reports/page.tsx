"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Indicator } from "@/types";
import { periodLabel } from "@/lib/utils";

interface IndicatorValue { id: string; period: string; value: number; note?: string | null; }

function ratingColor(pct: number | null) {
  if (pct == null) return "text-gray-400";
  if (pct >= 100) return "text-green-600";
  if (pct >= 70) return "text-yellow-600";
  return "text-red-500";
}

export default function ReportsPage() {
  const [selectedId, setSelectedId] = useState<string>("");

  const { data: indicators = [] } = useQuery<Indicator[]>({
    queryKey: ["indicators"],
    queryFn: () => fetch("/api/indicators").then((r) => r.json()),
  });

  const selected = indicators.find((i) => i.id === selectedId) ?? null;

  const { data: values = [] } = useQuery<IndicatorValue[]>({
    queryKey: ["indicator-values", selectedId],
    queryFn: () => fetch(`/api/indicator-values?indicatorId=${selectedId}`).then((r) => r.json()),
    enabled: !!selectedId,
  });

  const chartData = values.map((v) => ({
    period: periodLabel(v.period),
    Факт: v.value,
    План: selected?.targetValue ?? undefined,
  }));

  const lastValue = values[values.length - 1]?.value ?? null;
  const pct = selected?.targetValue && lastValue != null
    ? Math.round((lastValue / selected.targetValue) * 100)
    : null;

  const avg = values.length > 0
    ? Math.round(values.reduce((s, v) => s + v.value, 0) / values.length * 10) / 10
    : null;

  const best = values.length > 0 ? Math.max(...values.map((v) => v.value)) : null;

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Отчёты" description="Динамика показателей по периодам" />

      <div className="p-6 space-y-6">
        {/* Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="text-xs font-medium text-gray-500 block mb-2">Выберите показатель</label>
          <Select value={selectedId || "__none__"} onValueChange={(v) => setSelectedId(v === "__none__" ? "" : (v ?? ""))}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="— выбрать показатель —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— выбрать —</SelectItem>
              {indicators.map((ind) => (
                <SelectItem key={ind.id} value={ind.id}>
                  {ind.name}{ind.goal ? ` (${ind.goal.name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Плановое значение", value: selected.targetValue != null ? `${selected.targetValue} ${selected.unit ?? ""}` : "—", sub: "" },
                { label: "Последний факт", value: lastValue != null ? `${lastValue} ${selected.unit ?? ""}` : "—", sub: "" },
                { label: "Выполнение (посл.)", value: pct != null ? `${pct}%` : "—", color: ratingColor(pct) },
                { label: "Среднее за период", value: avg != null ? `${avg} ${selected.unit ?? ""}` : "—", sub: "" },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color ?? "text-gray-900"}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {values.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
                Данных по периодам пока нет. Добавьте их в разделе «Показатели».
              </div>
            ) : (
              <>
                {/* Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    {selected.name}
                    {selected.unit && <span className="text-gray-400 font-normal ml-1">({selected.unit})</span>}
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(val, name) => [`${val} ${selected.unit ?? ""}`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {selected.targetValue && (
                        <ReferenceLine y={selected.targetValue} stroke="#16a34a" strokeDasharray="5 5" label={{ value: "План", fontSize: 11, fill: "#16a34a" }} />
                      )}
                      <Line type="monotone" dataKey="Факт" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">История значений</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                        <th className="text-left px-4 py-2.5 font-medium">Период</th>
                        <th className="text-right px-4 py-2.5 font-medium">Факт</th>
                        <th className="text-right px-4 py-2.5 font-medium">План</th>
                        <th className="text-right px-4 py-2.5 font-medium">Выполнение</th>
                        <th className="text-left px-4 py-2.5 font-medium">Примечание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...values].reverse().map((v) => {
                        const p = selected.targetValue ? Math.round((v.value / selected.targetValue) * 100) : null;
                        return (
                          <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-700">{periodLabel(v.period)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{v.value} {selected.unit ?? ""}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{selected.targetValue ?? "—"} {selected.unit ?? ""}</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${ratingColor(p)}`}>{p != null ? `${p}%` : "—"}</td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{v.note ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {!selected && indicators.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            Сначала создайте показатели в разделе «Показатели».
          </div>
        )}
      </div>
    </div>
  );
}
