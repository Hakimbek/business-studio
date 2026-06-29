"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCompany, type Company } from "@/contexts/company";

export function CompanySelect() {
  const qc = useQueryClient();
  const { selectCompany } = useCompany();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
      setDialogOpen(false);
      selectCompany(company);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/companies/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); setDeleteId(null); },
  });

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    createMut.mutate(trimmed);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white">
        {/* Logo left */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Business Studio</span>
        </div>

        {/* Add button right */}
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Новая компания
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Компании</p>

        {isLoading && <p className="text-sm text-gray-400">Загрузка...</p>}

        {!isLoading && companies.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <p className="text-sm">Компаний пока нет.</p>
            <button onClick={() => setDialogOpen(true)} className="mt-3 text-sm text-blue-500 hover:underline cursor-pointer">Создать первую</button>
          </div>
        )}

        {!isLoading && companies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {companies.map((c) => (
              <div key={c.id} className="relative group">
                <button
                  onClick={() => selectCompany(c)}
                  className="w-full h-32 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-150 flex flex-col items-center justify-center gap-3 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Building2 size={20} className="text-blue-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 text-center px-3 leading-snug">{c.name}</span>
                </button>
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow-sm border border-gray-100 text-gray-300 hover:text-red-500 hover:border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Удалить компанию"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setName(""); setError(""); } setDialogOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая компания</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Название *</Label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Название компании"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className={error ? "border-red-400 focus-visible:ring-red-300" : ""}
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setName(""); setError(""); }}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createMut.isPending}>
              {createMut.isPending ? "Создание..." : "Создать"}
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
