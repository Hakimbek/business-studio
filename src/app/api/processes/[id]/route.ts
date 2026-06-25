import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const process = await prisma.process.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      notation: body.notation,
      code: body.code,
      parentId: body.parentId || null,
      ownerRoleId: body.ownerRoleId || null,
    },
    include: { ownerRole: true, indicators: true },
  });
  return NextResponse.json(process);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.process.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
