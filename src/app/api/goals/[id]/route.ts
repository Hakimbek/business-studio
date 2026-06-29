import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { owner: true, indicators: true },
  });
  if (!goal) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      weight: body.weight ? Number(body.weight) : null,
      deadline: body.deadline || null,
      ownerId: body.ownerId || null,
      strategyId: body.strategyId || null,
    },
    include: { owner: true, indicators: true },
  });
  return NextResponse.json(goal);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
