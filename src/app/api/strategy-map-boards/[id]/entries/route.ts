import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { goalId, x, y } = await req.json();
  const entry = await prisma.strategyMapEntry.upsert({
    where: { boardId_goalId: { boardId, goalId } },
    create: { boardId, goalId, x: x ?? 100, y: y ?? 100 },
    update: { x: x ?? 100, y: y ?? 100 },
  });
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { goalId, x, y } = await req.json();
  await prisma.strategyMapEntry.update({
    where: { boardId_goalId: { boardId, goalId } },
    data: { x, y },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { goalId } = await req.json();
  await prisma.strategyMapEntry.deleteMany({ where: { boardId, goalId } });
  return NextResponse.json({ ok: true });
}
