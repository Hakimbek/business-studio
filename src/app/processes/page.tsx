"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/shared/AddButton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { TreeNode } from "@/components/shared/TreeNode";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Process, Position } from "@/types";
import { buildTree } from "@/lib/tree";

const NOTATIONS = [
  { value: "PROCEDURE", label: "Процедура" },
  { value: "BPMN", label: "BPMN 2.0" },
  { value: "IDEF0", label: "IDEF0" },
  { value: "EPC", label: "EPC" },
];

interface FormState {
  name: string; description: string; notation: string;
  code: string; parentId: string; ownerRoleId: string;
}
const empty: FormState = { name: "", description: "", notation: "PROCEDURE", code: "", parentId: "", ownerRoleId: "" };

export default function ProcessesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Process | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const { data: processes = [], isLoading } = useQuery<Process[]>({
    queryKey: ["processes"],
    queryFn: () => fetch("/api/processes").then((r) => r.json()),
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) =>
      fetch("/api/processes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processes"] }); qc.invalidateQueries({ queryKey: ["stats"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      fetch(`/api/processes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processes"] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/processes/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processes"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setDeleteId(null); },
  });

  function openCreate(parentId = "") { setEditItem(null); setForm({ ...empty, parentId }); setDialogOpen(true); }
  function openEdit(item: Process) {
    setEditItem(item);
    setForm({ name: item.name, description: item.description ?? "", notation: item.notation, code: item.code ?? "", parentId: item.parentId ?? "", ownerRoleId: item.ownerRoleId ?? "" });
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); setEditItem(null); setForm(empty); }
  function submit() {
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  }

  const tree = buildTree(processes);
  const loading = createMutation.isPending || updateMutation.isPending;

  function renderTree(nodes: Process[], depth = 0): React.ReactNode {
    return nodes.map((proc) => (
      <TreeNode
        key={proc.id}
        label={`${proc.code ? proc.code + ". " : ""}${proc.name}`}
        badge={<Badge variant="outline" className="text-xs">{NOTATIONS.find(n => n.value === proc.notation)?.label}</Badge>}
        subtitle={proc.ownerRole?.name}
        depth={depth}
        hasChildren={(proc.children?.length ?? 0) > 0}
        defaultOpen={depth === 0}
        onAdd={() => openCreate(proc.id)}
        onEdit={() => openEdit(proc)}
        onDelete={() => setDeleteId(proc.id)}
      >
        {renderTree(proc.children ?? [], depth + 1)}
      </TreeNode>
    ));
  }

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Процессы"
        description="Иерархия бизнес-процессов компании"
        action={<AddButton onClick={() => openCreate()}>Добавить процесс</AddButton>}
      />

      <div className="p-4">
        {isLoading && <p className="text-sm text-gray-400 px-2">Загрузка...</p>}

        {!isLoading && tree.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Процессов пока нет.</p>
            <AddButton onClick={() => openCreate()} className="mt-3">Создать первый процесс</AddButton>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-2">
          {renderTree(tree)}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать процесс" : "Новый процесс"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Код</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1.2.3" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Нотация</Label>
                <Select value={form.notation} onValueChange={(v) => setForm({ ...form, notation: (v ?? "") })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTATIONS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Управление продажами" />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Владелец процесса</Label>
              <Select value={form.ownerRoleId || "__none__"} onValueChange={(v) => setForm({ ...form, ownerRoleId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="— не задан —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— не задан —</SelectItem>
                  {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Родительский процесс</Label>
              <Select value={form.parentId || "__none__"} onValueChange={(v) => setForm({ ...form, parentId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="— корневой —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— корневой —</SelectItem>
                  {processes.filter((p) => p.id !== editItem?.id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code}. ` : ""}{p.name}</SelectItem>
                  ))}
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

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  );
}
