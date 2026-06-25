import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json(null);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  return NextResponse.json(company);
}

export async function PUT(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: body.name,
      mission: body.mission || null,
      vision: body.vision || null,
      values: body.values || null,
      strategicHorizon: body.strategicHorizon || null,
    },
  });
  return NextResponse.json(updated);
}
