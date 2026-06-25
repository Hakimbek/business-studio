import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const items = await prisma.raciItem.findMany({
    where: { process: { companyId } },
    include: { process: true, position: { include: { orgUnit: true } } },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.raciItem.upsert({
    where: {
      processId_positionId_raciType: {
        processId: body.processId,
        positionId: body.positionId,
        raciType: body.raciType,
      },
    },
    create: { processId: body.processId, positionId: body.positionId, raciType: body.raciType },
    update: {},
    include: { process: true, position: true },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  await prisma.raciItem.deleteMany({
    where: { processId: body.processId, positionId: body.positionId, raciType: body.raciType },
  });
  return NextResponse.json({ ok: true });
}
