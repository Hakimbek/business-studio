"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, CalendarDays, User, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddButton } from "@/components/shared/AddButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus, Position } from "@/types";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  ACTIVE:    { label: "Активен",        className: "bg-blue-100 text-blue-700" },
  ON_HOLD:   { label: "Приостановлен",  className: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Завершён",       className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Отменён",        className: "bg-gray-100 text-gray-500" },
};

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  status: ProjectStatus;
  deadline: string;
  ownerId: string;
}

const EMPTY: FormState = { name: "", description: "", status: "ACTIVE", deadline: "", ownerId: "" };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: () => fetch("/api/positions").then((r) => r.json()),
  });

  const createMut = useMutation({
    mutationFn: (data: FormState) =>
      fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); close(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      fetch(`/api/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); close(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setDeleteId(null); },
  });

  function openCreate() { setEditItem(null); setForm(EMPTY); setDialogOpen(true); }
  function openEdit(p: Project) {
    setEditItem(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      deadline: p.deadline ? p.deadline.slice(0, 10) : "",
      ownerId: p.ownerId ?? "",
    });
    setDialogOpen(true);
  }
  function close() { setDialogOpen(false); setEditItem(null); setForm(EMPTY); }
  function submit() {
    if (editItem) updateMut.mutate({ id: editItem.id, data: form });
    else createMut.mutate(form);
  }

  const loading = createMut.isPending || updateMut.isPending;

  // Group by status for kanban-style display
  const active    = projects.filter((p) => p.status === "ACTIVE");
  const onHold    = projects.filter((p) => p.status === "ON_HOLD");
  const completed = projects.filter((p) => p.status === "COMPLETED");
  const cancelled = projects.filter((p) => p.status === "CANCELLED");

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Проекты"
        description="Управление проектами компании"
        action={<AddButton onClick={openCreate}>Добавить проект</AddButton>}
      />

      <div className="p-4">
        {isLoading && <p className="text-sm text-gray-400 px-2">Загрузка...</p>}

        {!isLoading && projects.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FolderKanban size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Проектов пока нет.</p>
            <AddButton onClick={openCreate} className="mt-3">Создать первый проект</AddButton>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-6">
            {[
              { status: "ACTIVE"    as ProjectStatus, items: active },
              { status: "ON_HOLD"   as ProjectStatus, items: onHold },
              { status: "COMPLETED" as ProjectStatus, items: completed },
              { status: "CANCELLED" as ProjectStatus, items: cancelled },
            ].filter(({ items }) => items.length > 0).map(({ status, items }) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.className)}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onEdit={() => openEdit(p)}
                        onDelete={() => setDeleteId(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать проект" : "Новый проект"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Название проекта"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Краткое описание"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [ProjectStatus, typeof STATUS_CONFIG[ProjectStatus]][]).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Дедлайн</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ответственный</Label>
              <Select
                value={form.ownerId || "__none__"}
                onValueChange={(v) => setForm({ ...form, ownerId: v === "__none__" ? "" : (v ?? "") })}
              >
                <SelectTrigger>
                  {form.ownerId
                    ? <span>{positions.find((p) => p.id === form.ownerId)?.name}</span>
                    : <span className="text-gray-400">— не выбран —</span>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— не выбран —</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Отмена</Button>
            <Button onClick={submit} disabled={!form.name.trim() || loading}>
              {loading ? "Сохранение..." : editItem ? "Сохранить" : "Создать"}
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

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, onEdit, onDelete }: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[project.status];
  const isOverdue = project.deadline != null && project.status !== "COMPLETED" && project.status !== "CANCELLED"
    && new Date(project.deadline) < new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 group hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{project.name}</span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.className)}>
              {cfg.label}
            </span>
          </div>

          {project.description && (
            <p className="text-xs text-gray-500 mb-2 leading-relaxed">{project.description}</p>
          )}

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {project.owner && (
              <span className="flex items-center gap-1">
                <User size={11} className="text-gray-400" />
                {project.owner.name}
              </span>
            )}
            {project.deadline && (
              <span className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
                <CalendarDays size={11} className={isOverdue ? "text-red-400" : "text-gray-400"} />
                {new Date(project.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                {isOverdue && " — просрочен"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil size={13} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onDelete}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}
