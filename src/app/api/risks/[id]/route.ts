import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const risk = await prisma.risk.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      probability: body.probability ? Number(body.probability) : null,
      impact: body.impact ? Number(body.impact) : null,
      processId: body.processId || null,
    },
    include: { process: true },
  });
  return NextResponse.json(risk);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.risk.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
