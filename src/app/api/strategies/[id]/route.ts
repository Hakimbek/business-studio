import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const strategy = await prisma.strategy.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      color: body.color || "#2563eb",
    },
    include: { goals: { include: { indicators: true } } },
  });
  return NextResponse.json(strategy);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.strategy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
