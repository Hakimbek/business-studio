import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  const board = await prisma.strategyMapBoard.update({
    where: { id },
    data: { name },
    include: { entries: { include: { goal: { include: { indicators: true } } } } },
  });
  return NextResponse.json(board);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.strategyMapBoard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
