"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Process, Position, RaciType } from "@/types";
import { buildTree } from "@/lib/tree";

interface RaciItem {
  id: string;
  processId: string;
  positionId: string;
  raciType: RaciType;
}

const RACI_TYPES: RaciType[] = ["RESPONSIBLE", "ACCOUNTABLE", "CONSULTED", "INFORMED"];
const RACI_SHORT: Record<RaciType, string> = { RESPONSIBLE: "R", ACCOUNTABLE: "A", CONSULTED: "C", INFORMED: "I" };
const RACI_LABEL: Record<RaciType, string> = { RESPONSIBLE: "Ответственный", ACCOUNTABLE: "Согласующий", CONSULTED: "Консультируемый", INFORMED: "Информируемый" };
const RACI_COLOR: Record<RaciType, string> = {
  RESPONSIBLE: "bg-blue-600 text-white",
  ACCOUNTABLE: "bg-purple-600 text-white",
  CONSULTED: "bg-amber-500 text-white",
  INFORMED: "bg-gray-400 text-white",
};

function flatten(processes: Process[], depth = 0): { process: Process; depth: number }[] {
  const result: { process: Process; depth: number }[] = [];
  for (const p of processes) {
    result.push({ process: p, depth });
    if (p.children?.length) result.push(...flatten(p.children, depth + 1));
  }
  return result;
}

export default function RaciPage() {
  const qc = useQueryClient();

  const { data: processes = [], isLoading: procLoading } = useQuery<Process[]>({
    queryKey: ["processes"],
    queryFn: () => fetch("/api/processes").then((r) => r.json()),
  });

  const { data: positions = [], isLoading: posLoading } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const { data: raciItems = [], isLoading: raciLoading } = useQuery<RaciItem[]>({
    queryKey: ["raci"],
    queryFn: () => fetch("/api/raci").then((r) => r.json()),
  });

  const addMut = useMutation({
    mutationFn: (data: { processId: string; positionId: string; raciType: RaciType }) =>
      fetch("/api/raci", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raci"] }),
  });

  const removeMut = useMutation({
    mutationFn: (data: { processId: string; positionId: string; raciType: RaciType }) =>
      fetch("/api/raci", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raci"] }),
  });

  function getCell(processId: string, positionId: string): RaciType[] {
    return raciItems.filter((r) => r.processId === processId && r.positionId === positionId).map((r) => r.raciType);
  }

  function toggle(processId: string, positionId: string, raciType: RaciType) {
    const exists = raciItems.some((r) => r.processId === processId && r.positionId === positionId && r.raciType === raciType);
    if (exists) removeMut.mutate({ processId, positionId, raciType });
    else addMut.mutate({ processId, positionId, raciType });
  }

  const isLoading = procLoading || posLoading || raciLoading;
  const tree = buildTree(processes);
  const flatProcs = flatten(tree);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="RACI-матрица" description="Матрица ответственности: процессы × должности" />
        <div className="p-4 text-sm text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (processes.length === 0 || positions.length === 0) {
    return (
      <div>
        <PageHeader title="RACI-матрица" description="Матрица ответственности: процессы × должности" />
        <div className="p-8 text-center text-gray-400 text-sm">
          <p>Для работы RACI-матрицы нужны <strong>процессы</strong> и <strong>должности</strong>.</p>
          <p className="mt-1">Добавьте их в соответствующих разделах.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="RACI-матрица"
        description="Матрица ответственности: процессы × должности"
        action={
          <div className="flex gap-3 text-xs text-gray-500">
            {RACI_TYPES.map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${RACI_COLOR[t]}`}>{RACI_SHORT[t]}</span>
                {RACI_LABEL[t]}
              </span>
            ))}
          </div>
        }
      />

      <div className="p-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 bg-gray-50 sticky left-0 z-10 min-w-[220px]">
                  Процесс / Должность
                </th>
                {positions.map((pos) => (
                  <th key={pos.id} className="px-2 py-3 text-xs font-medium text-gray-600 bg-gray-50 min-w-[90px] border-l border-gray-100">
                    <div className="text-center leading-tight">
                      <div>{pos.name}</div>
                      {pos.orgUnit && <div className="text-[10px] text-gray-400 font-normal">{pos.orgUnit.name}</div>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flatProcs.map(({ process, depth }) => {
                const isParent = (process.children?.length ?? 0) > 0;
                return (
                  <tr key={process.id} className={`border-b border-gray-100 ${isParent ? "bg-gray-50" : "hover:bg-blue-50/30"}`}>
                    <td className="px-4 py-2 sticky left-0 z-10 bg-inherit border-r border-gray-100">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
                        {isParent && <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />}
                        <span className={`text-xs ${isParent ? "font-semibold text-gray-700" : "text-gray-600"} truncate max-w-[180px]`}>
                          {process.code ? `${process.code}. ` : ""}{process.name}
                        </span>
                      </div>
                    </td>
                    {positions.map((pos) => {
                      const cellTypes = getCell(process.id, pos.id);
                      return (
                        <td key={pos.id} className="border-l border-gray-100 px-1 py-1">
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {RACI_TYPES.map((raciType) => {
                              const active = cellTypes.includes(raciType);
                              return (
                                <button
                                  key={raciType}
                                  onClick={() => !isParent && toggle(process.id, pos.id, raciType)}
                                  disabled={isParent || addMut.isPending || removeMut.isPending}
                                  title={RACI_LABEL[raciType]}
                                  className={`w-5 h-5 rounded text-[10px] font-bold transition-all
                                    ${isParent ? "cursor-default opacity-20" : "cursor-pointer hover:opacity-90"}
                                    ${active ? RACI_COLOR[raciType] : "bg-gray-100 text-gray-300 hover:bg-gray-200"}`}
                                >
                                  {RACI_SHORT[raciType]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
