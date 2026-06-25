"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/shared/AddButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Position, OrgUnit } from "@/types";

interface FormState { name: string; description: string; orgUnitId: string; }
const empty: FormState = { name: "", description: "", orgUnitId: "" };

export default function ResponsiblePage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Position | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const { data: positions = [], isLoading } = useQuery<(Position & { orgUnit: OrgUnit | null })[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ["org-units"],
    queryFn: () => fetch("/api/org-units").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: FormState) =>
      fetch("/api/positions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["positions"] }); closeDialog(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      fetch(`/api/positions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["positions"] }); closeDialog(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/positions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["positions"] }); setDeleteId(null); },
  });

  function openCreate() { setEditItem(null); setForm(empty); setDialogOpen(true); }
  function openEdit(p: Position & { orgUnit: OrgUnit | null }) {
    setEditItem(p);
    setForm({ name: p.name, description: p.description ?? "", orgUnitId: p.orgUnitId ?? "" });
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); setEditItem(null); setForm(empty); }
  function submit() {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  }

  const loading = createMut.isPending || updateMut.isPending;

  const flatUnits = flattenUnits(orgUnits);

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Ответственные"
        description="Должности и роли, назначаемые на цели и показатели"
        action={<AddButton onClick={openCreate}>Добавить должность</AddButton>}
      />

      <div className="p-4">
        {isLoading && <p className="text-sm text-gray-400 px-2">Загрузка...</p>}

        {!isLoading && positions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Должностей пока нет.</p>
            <AddButton onClick={openCreate} className="mt-3">Добавить первую должность</AddButton>
          </div>
        )}

        {positions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {positions.map((pos) => (
              <div key={pos.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600">{pos.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{pos.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {pos.orgUnit && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Building2 size={11} />
                        {pos.orgUnit.name}
                      </span>
                    )}
                    {pos.description && (
                      <span className="text-xs text-gray-400 truncate">{pos.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => openEdit(pos)}><Pencil size={13} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => setDeleteId(pos.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать должность" : "Новая должность"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Директор по маркетингу, CFO..." />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Краткое описание роли..." />
            </div>
            {flatUnits.length > 0 && (
              <div className="space-y-1.5">
                <Label>Подразделение</Label>
                <Select value={form.orgUnitId || "__none__"} onValueChange={(v) => setForm({ ...form, orgUnitId: v === "__none__" ? "" : (v ?? "") })}>
                  <SelectTrigger>
                    {form.orgUnitId
                      ? <span>{flatUnits.find((u) => u.id === form.orgUnitId)?.label}</span>
                      : <span className="text-gray-400">— не выбрано —</span>}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— не выбрано —</SelectItem>
                    {flatUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span style={{ paddingLeft: u.depth * 12 }}>{u.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

function flattenUnits(units: OrgUnit[], depth = 0): { id: string; label: string; depth: number }[] {
  const result: { id: string; label: string; depth: number }[] = [];
  for (const u of units) {
    result.push({ id: u.id, label: u.name, depth });
    if (u.children?.length) result.push(...flattenUnits(u.children, depth + 1));
  }
  return result;
}
