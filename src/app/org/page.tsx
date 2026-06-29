"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton } from "@/components/shared/AddButton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { TreeNode } from "@/components/shared/TreeNode";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { OrgUnit, Position } from "@/types";
import { buildTree } from "@/lib/tree";

const ORG_TYPES = [
  { value: "COMPANY", label: "Компания" },
  { value: "DIVISION", label: "Дивизион" },
  { value: "DEPARTMENT", label: "Отдел" },
  { value: "GROUP", label: "Группа" },
];

interface UnitForm { name: string; description: string; type: string; parentId: string; }
interface PosForm { name: string; description: string; orgUnitId: string; }
const emptyUnit: UnitForm = { name: "", description: "", type: "DEPARTMENT", parentId: "" };
const emptyPos: PosForm = { name: "", description: "", orgUnitId: "" };

export default function OrgPage() {
  const qc = useQueryClient();
  const [unitDialog, setUnitDialog] = useState(false);
  const [posDialog, setPosDialog] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState<string | null>(null);
  const [deletePos, setDeletePos] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<OrgUnit | null>(null);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnit);
  const [posForm, setPosForm] = useState<PosForm>(emptyPos);

  const { data: units = [], isLoading: unitsLoading } = useQuery<OrgUnit[]>({
    queryKey: ["org-units"],
    queryFn: () => fetch("/api/org-units").then((r) => r.json()),
  });

  const { data: positions = [], isLoading: posLoading } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const createUnit = useMutation({
    mutationFn: (d: UnitForm) => fetch("/api/org-units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["org-units"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setUnitDialog(false); setEditUnit(null); setUnitForm(emptyUnit); },
  });
  const updateUnit = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitForm }) => fetch(`/api/org-units/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["org-units"] }); setUnitDialog(false); setEditUnit(null); setUnitForm(emptyUnit); },
  });
  const deleteUnitMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/org-units/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["org-units"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setDeleteUnit(null); },
  });

  const createPos = useMutation({
    mutationFn: (d: PosForm) => fetch("/api/positions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["positions"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setPosDialog(false); setEditPos(null); setPosForm(emptyPos); },
  });
  const updatePos = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PosForm }) => fetch(`/api/positions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["positions"] }); setPosDialog(false); setEditPos(null); setPosForm(emptyPos); },
  });
  const deletePosMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/positions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["positions"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setDeletePos(null); },
  });

  function openCreateUnit(parentId = "") { setEditUnit(null); setUnitForm({ ...emptyUnit, parentId }); setUnitDialog(true); }
  function openEditUnit(u: OrgUnit) { setEditUnit(u); setUnitForm({ name: u.name, description: u.description ?? "", type: u.type, parentId: u.parentId ?? "" }); setUnitDialog(true); }

  function openCreatePos(orgUnitId = "") { setEditPos(null); setPosForm({ ...emptyPos, orgUnitId }); setPosDialog(true); }
  function openEditPos(p: Position) { setEditPos(p); setPosForm({ name: p.name, description: p.description ?? "", orgUnitId: p.orgUnitId ?? "" }); setPosDialog(true); }

  const tree = buildTree(units);

  function renderUnitTree(nodes: OrgUnit[], depth = 0): React.ReactNode {
    return nodes.map((unit) => (
      <TreeNode
        key={unit.id}
        label={unit.name}
        badge={<Badge variant="outline" className="text-xs">{ORG_TYPES.find(t => t.value === unit.type)?.label}</Badge>}
        depth={depth}
        hasChildren={(unit.children?.length ?? 0) > 0}
        defaultOpen={depth === 0}
        onAdd={() => openCreateUnit(unit.id)}
        onEdit={() => openEditUnit(unit)}
        onDelete={() => setDeleteUnit(unit.id)}
      >
        {renderUnitTree(unit.children ?? [], depth + 1)}
      </TreeNode>
    ));
  }

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader title="Оргструктура" description="Подразделения и должности компании" />

      <div className="p-4">
        <Tabs defaultValue="units">
          <TabsList className="mb-4">
            <TabsTrigger value="units">Подразделения</TabsTrigger>
            <TabsTrigger value="positions">Должности</TabsTrigger>
          </TabsList>

          <TabsContent value="units">
            <div className="flex justify-end mb-3">
              <AddButton onClick={() => openCreateUnit()}>Добавить подразделение</AddButton>
            </div>
            {unitsLoading && <p className="text-sm text-gray-400">Загрузка...</p>}
            {!unitsLoading && tree.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Подразделений пока нет.</p>
                <AddButton onClick={() => openCreateUnit()} className="mt-3">Создать первое</AddButton>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 p-2">
              {renderUnitTree(tree)}
            </div>
          </TabsContent>

          <TabsContent value="positions">
            <div className="flex justify-end mb-3">
              <AddButton onClick={() => openCreatePos()}>Добавить должность</AddButton>
            </div>
            {posLoading && <p className="text-sm text-gray-400">Загрузка...</p>}
            {!posLoading && positions.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Должностей пока нет.</p>
                <AddButton onClick={() => openCreatePos()} className="mt-3">Создать первую</AddButton>
              </div>
            )}
            {positions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Должность</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Подразделение</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {positions.map((pos, idx) => (
                      <tr key={pos.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{pos.name}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{pos.orgUnit?.name ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-0.5 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => openEditPos(pos)}><Pencil size={13} /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 cursor-pointer" onClick={() => setDeletePos(pos.id)}><Trash2 size={13} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Unit dialog */}
      <Dialog open={unitDialog} onOpenChange={() => { setUnitDialog(false); setEditUnit(null); setUnitForm(emptyUnit); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editUnit ? "Редактировать подразделение" : "Новое подразделение"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="Отдел продаж" />
            </div>
            <div className="space-y-1.5">
              <Label>Тип</Label>
              <Select value={unitForm.type} onValueChange={(v) => setUnitForm({ ...unitForm, type: v ?? "DEPARTMENT" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Родительское подразделение</Label>
              <Select value={unitForm.parentId || "__none__"} onValueChange={(v) => setUnitForm({ ...unitForm, parentId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="— корневое —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— корневое —</SelectItem>
                  {units.filter((u) => u.id !== editUnit?.id).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnitDialog(false); setUnitForm(emptyUnit); }}>Отмена</Button>
            <Button onClick={() => editUnit ? updateUnit.mutate({ id: editUnit.id, data: unitForm }) : createUnit.mutate(unitForm)} disabled={!unitForm.name || createUnit.isPending || updateUnit.isPending}>
              {createUnit.isPending || updateUnit.isPending ? "Сохранение..." : editUnit ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position dialog */}
      <Dialog open={posDialog} onOpenChange={() => { setPosDialog(false); setEditPos(null); setPosForm(emptyPos); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editPos ? "Редактировать должность" : "Новая должность"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input value={posForm.name} onChange={(e) => setPosForm({ ...posForm, name: e.target.value })} placeholder="Руководитель отдела продаж" />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea value={posForm.description} onChange={(e) => setPosForm({ ...posForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Подразделение</Label>
              <Select value={posForm.orgUnitId || "__none__"} onValueChange={(v) => setPosForm({ ...posForm, orgUnitId: v === "__none__" ? "" : (v ?? "") })}>
                <SelectTrigger><SelectValue placeholder="— не задано —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— не задано —</SelectItem>
                  {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPosDialog(false); setPosForm(emptyPos); }}>Отмена</Button>
            <Button onClick={() => editPos ? updatePos.mutate({ id: editPos.id, data: posForm }) : createPos.mutate(posForm)} disabled={!posForm.name || createPos.isPending || updatePos.isPending}>
              {createPos.isPending || updatePos.isPending ? "Сохранение..." : editPos ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteUnit} onClose={() => setDeleteUnit(null)} onConfirm={() => deleteUnit && deleteUnitMut.mutate(deleteUnit)} loading={deleteUnitMut.isPending} />
      <ConfirmDialog open={!!deletePos} onClose={() => setDeletePos(null)} onConfirm={() => deletePos && deletePosMut.mutate(deletePos)} loading={deletePosMut.isPending} />
    </div>
  );
}
