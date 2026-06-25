import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { label, color } = await req.json();
  const region = await prisma.strategyMapRegion.create({
    data: { boardId, label, color: color ?? "#6366f1" },
  });
  return NextResponse.json(region, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: boardId } = await params;
  const { regionId } = await req.json();
  await prisma.strategyMapRegion.delete({ where: { id: regionId, boardId } });
  return NextResponse.json({ ok: true });
}
