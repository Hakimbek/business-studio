import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const positions = await prisma.position.findMany({
    where: { companyId },
    include: { orgUnit: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const position = await prisma.position.create({
    data: {
      name: body.name,
      description: body.description,
      orgUnitId: body.orgUnitId || null,
      companyId,
    },
    include: { orgUnit: true },
  });
  return NextResponse.json(position, { status: 201 });
}
