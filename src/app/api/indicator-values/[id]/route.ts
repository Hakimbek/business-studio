import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const val = await prisma.indicatorValue.delete({ where: { id } });
  // Recompute actualValue after deletion
  const latest = await prisma.indicatorValue.findFirst({
    where: { indicatorId: val.indicatorId },
    orderBy: { period: "desc" },
  });
  await prisma.indicator.update({
    where: { id: val.indicatorId },
    data: { actualValue: latest?.value ?? null },
  });
  return NextResponse.json({ ok: true });
}
