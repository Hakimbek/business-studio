import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { projectId, goalId } = await req.json();
  const link = await prisma.strategyMapProjectLink.upsert({
    where: { boardId_projectId_goalId: { boardId, projectId, goalId } },
    create: { boardId, projectId, goalId },
    update: {},
  });
  return NextResponse.json(link, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { projectId, goalId, strength } = await req.json();
  await prisma.strategyMapProjectLink.updateMany({ where: { boardId, projectId, goalId }, data: { strength } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { projectId, goalId } = await req.json();
  await prisma.strategyMapProjectLink.deleteMany({ where: { boardId, projectId, goalId } });
  return NextResponse.json({ ok: true });
}
