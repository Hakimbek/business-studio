import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; indicatorId: string }> }) {
  const { id: boardId, indicatorId } = await params;
  const { x, y } = await req.json();
  await prisma.strategyMapIndicatorEntry.update({
    where: { boardId_indicatorId: { boardId, indicatorId } },
    data: { x, y },
  });
  return NextResponse.json({ ok: true });
}
