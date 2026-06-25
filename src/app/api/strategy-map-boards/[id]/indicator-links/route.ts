import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { indicatorId, goalId } = await req.json();
  const link = await prisma.strategyMapIndicatorLink.upsert({
    where: { boardId_indicatorId_goalId: { boardId, indicatorId, goalId } },
    create: { boardId, indicatorId, goalId },
    update: {},
  });
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { indicatorId, goalId } = await req.json();
  await prisma.strategyMapIndicatorLink.deleteMany({ where: { boardId, indicatorId, goalId } });
  return NextResponse.json({ ok: true });
}
