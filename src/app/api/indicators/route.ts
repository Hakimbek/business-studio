import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const indicators = await prisma.indicator.findMany({
    where: { companyId },
    include: { goal: true, process: true, owner: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(indicators);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const indicator = await prisma.indicator.create({
    data: {
      name: body.name,
      description: body.description,
      type: body.type === "BOOLEAN" ? "BOOLEAN" : "NUMERIC",
      unit: body.type === "BOOLEAN" ? null : body.unit,
      targetValue: body.type === "BOOLEAN" ? null : (body.targetValue ? Number(body.targetValue) : null),
      weight: body.weight ? Number(body.weight) : null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      ownerId: body.ownerId || null,
      goalId: body.goalId || null,
      processId: body.processId || null,
      companyId,
    },
    include: { goal: true, process: true, owner: true },
  });
  return NextResponse.json(indicator, { status: 201 });
}
