import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const units = await prisma.orgUnit.findMany({
    where: { companyId },
    include: { positions: true, children: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const unit = await prisma.orgUnit.create({
    data: {
      name: body.name,
      description: body.description,
      type: body.type ?? "DEPARTMENT",
      parentId: body.parentId || null,
      companyId,
    },
    include: { positions: true },
  });
  return NextResponse.json(unit, { status: 201 });
}
