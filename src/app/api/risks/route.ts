import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const risks = await prisma.risk.findMany({
    where: { companyId },
    include: { process: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(risks);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const risk = await prisma.risk.create({
    data: {
      name: body.name,
      description: body.description,
      probability: body.probability ? Number(body.probability) : null,
      impact: body.impact ? Number(body.impact) : null,
      processId: body.processId || null,
      companyId,
    },
    include: { process: true },
  });
  return NextResponse.json(risk, { status: 201 });
}
