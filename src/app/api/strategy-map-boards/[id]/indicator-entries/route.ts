import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { indicatorId, x, y } = await req.json();
  const entry = await prisma.strategyMapIndicatorEntry.upsert({
    where: { boardId_indicatorId: { boardId, indicatorId } },
    create: { boardId, indicatorId, x: x ?? 100, y: y ?? 100 },
    update: { x: x ?? 100, y: y ?? 100 },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { indicatorId } = await req.json();
  await prisma.strategyMapIndicatorEntry.deleteMany({ where: { boardId, indicatorId } });
  return NextResponse.json({ ok: true });
}
