import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const unit = await prisma.orgUnit.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      type: body.type,
      parentId: body.parentId || null,
    },
    include: { positions: true },
  });
  return NextResponse.json(unit);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.orgUnit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
