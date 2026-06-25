import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; regionId: string }> }) {
  const { id: boardId, regionId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("label" in body) data.label = body.label;
  if ("color" in body) data.color = body.color;
  if ("x" in body) data.x = body.x;
  if ("y" in body) data.y = body.y;
  if ("width" in body) data.width = body.width;
  if ("height" in body) data.height = body.height;
  const region = await prisma.strategyMapRegion.update({ where: { id: regionId, boardId }, data });
  return NextResponse.json(region);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; regionId: string }> }) {
  const { id: boardId, regionId } = await params;
  await prisma.strategyMapRegion.delete({ where: { id: regionId, boardId } });
  return NextResponse.json({ ok: true });
}
