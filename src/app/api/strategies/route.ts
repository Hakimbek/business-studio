import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const strategies = await prisma.strategy.findMany({
    where: { companyId },
    include: { goals: { include: { indicators: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(strategies);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const strategy = await prisma.strategy.create({
    data: {
      name: body.name,
      description: body.description || null,
      color: body.color || "#2563eb",
      companyId,
    },
    include: { goals: true },
  });
  return NextResponse.json(strategy, { status: 201 });
}
