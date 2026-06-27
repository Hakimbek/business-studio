import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { projectId, x, y } = await req.json();
  const entry = await prisma.strategyMapProjectEntry.upsert({
    where: { boardId_projectId: { boardId, projectId } },
    create: { boardId, projectId, x: x ?? 100, y: y ?? 100 },
    update: {},
    include: { project: true },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { projectId, x, y } = await req.json();
  await prisma.strategyMapProjectEntry.updateMany({ where: { boardId, projectId }, data: { x, y } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { projectId } = await req.json();
  await prisma.strategyMapProjectEntry.deleteMany({ where: { boardId, projectId } });
  return NextResponse.json({ ok: true });
}
