"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompany, type Company } from "@/contexts/company";

export function CompanySelect() {
  const qc = useQueryClient();
  const { selectCompany } = useCompany();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => fetch("/api/companies").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: async (name: string) => {
      const r = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error ?? "Ошибка");
      }
      return r.json() as Promise<Company>;
    },
    onSuccess: (company) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      setName("");
      setError("");
      selectCompany(company);
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    createMut.mutate(trimmed);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Business Studio</h1>
          <p className="text-sm text-gray-500 mt-1">Выберите компанию для работы</p>
        </div>

        {/* Create form */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Новая компания</p>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Название компании"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className={error ? "border-red-400 focus-visible:ring-red-300" : ""}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createMut.isPending}
              className="shrink-0 w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-700 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none group"
            >
              <Plus size={16} strokeWidth={2.5} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Existing companies */}
        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-4">Загрузка...</p>
        )}

        {!isLoading && companies.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-2">
              Существующие компании
            </p>
            {companies.map((c, i) => (
              <button
                key={c.id}
                onClick={() => selectCompany(c)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors group ${i > 0 ? "border-t border-gray-100" : ""}`}
              >
                <span>{c.name}</span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400" />
              </button>
            ))}
          </div>
        )}

        {!isLoading && companies.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Нет компаний — создайте первую выше.</p>
        )}
      </div>
    </div>
  );
}
