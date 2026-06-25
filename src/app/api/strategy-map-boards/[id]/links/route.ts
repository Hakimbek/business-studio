import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { sourceGoalId, targetGoalId } = await req.json();
  if (sourceGoalId === targetGoalId) return NextResponse.json({ error: "Нельзя соединить цель саму с собой" }, { status: 400 });
  const link = await prisma.strategyMapLink.upsert({
    where: { boardId_sourceGoalId_targetGoalId: { boardId, sourceGoalId, targetGoalId } },
    create: { boardId, sourceGoalId, targetGoalId },
    update: {},
  });
  return NextResponse.json(link, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { linkId, strength } = await req.json();
  const link = await prisma.strategyMapLink.update({ where: { id: linkId, boardId }, data: { strength } });
  return NextResponse.json(link);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { linkId } = await req.json();
  await prisma.strategyMapLink.delete({ where: { id: linkId, boardId } });
  return NextResponse.json({ ok: true });
}
