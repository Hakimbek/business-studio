import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const indicator = await prisma.indicator.findUnique({
    where: { id },
    include: { goal: true, process: true, owner: true },
  });
  if (!indicator) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(indicator);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const indicator = await prisma.indicator.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      unit: body.unit,
      targetValue: body.targetValue ? Number(body.targetValue) : null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      ownerId: body.ownerId || null,
      goalId: body.goalId || null,
      processId: body.processId || null,
    },
    include: { goal: true, process: true, owner: true },
  });
  return NextResponse.json(indicator);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("goalId" in body) data.goalId = body.goalId || null;
  const indicator = await prisma.indicator.update({ where: { id }, data });
  return NextResponse.json(indicator);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.indicator.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
