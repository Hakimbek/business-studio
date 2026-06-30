import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export function periodLabel(period: string) {
  const [year, month] = period.split("-");
  return `${MONTHS_RU[parseInt(month) - 1]} ${year}`;
}

export function indicatorPct(ind: { type?: string | null; targetValue?: number | null; actualValue?: number | null; values?: { value: number }[] }): number | null {
  if (ind.type === "BOOLEAN") {
    const actual = ind.values?.[0]?.value ?? ind.actualValue;
    if (actual == null) return 0;
    return actual === 1 ? 100 : 0;
  }
  if (!ind.targetValue || ind.targetValue === 0) return null;
  const actual = ind.values?.[0]?.value ?? ind.actualValue;
  if (actual == null) return 0;
  return Math.round((actual / ind.targetValue) * 100);
}

export function goalPct(indicators: { weight?: number | null; targetValue?: number | null; actualValue?: number | null; values?: { value: number }[] }[]): number | null {
  const items = indicators.map(i => ({ pct: indicatorPct(i), w: i.weight ?? null }));
  const valid = items.filter(i => i.pct != null);
  if (valid.length === 0) return null;
  const hasWeights = valid.some(i => i.w != null && i.w > 0);
  if (hasWeights) {
    const sumW = valid.reduce((s, i) => s + (i.w ?? 0), 0);
    if (sumW === 0) return null;
    return Math.round(valid.reduce((s, i) => s + (i.w ?? 0) * i.pct!, 0) / sumW);
  }
  return Math.round(valid.reduce((s, i) => s + i.pct!, 0) / valid.length);
}

export function boardPct(goals: { weight?: number | null; indicators?: { weight?: number | null; targetValue?: number | null; actualValue?: number | null; values?: { value: number }[] }[] }[]): number | null {
  const items = goals.map(g => ({ pct: goalPct(g.indicators ?? []), w: g.weight ?? null }));
  const valid = items.filter(i => i.pct != null);
  if (valid.length === 0) return null;
  const hasWeights = valid.some(i => i.w != null && i.w > 0);
  if (hasWeights) {
    const sumW = valid.reduce((s, i) => s + (i.w ?? 0), 0);
    if (sumW === 0) return null;
    return Math.round(valid.reduce((s, i) => s + (i.w ?? 0) * i.pct!, 0) / sumW);
  }
  return Math.round(valid.reduce((s, i) => s + i.pct!, 0) / valid.length);
}
