import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const goals = await prisma.goal.findMany({
    where: { companyId },
    include: {
      owner: true,
      indicators: {
        include: { values: { orderBy: { period: "desc" }, take: 1 } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const goal = await prisma.goal.create({
    data: {
      name: body.name,
      description: body.description,
      weight: body.weight ? Number(body.weight) : null,
      deadline: body.deadline || null,
      ownerId: body.ownerId || null,
      strategyId: body.strategyId || null,
      companyId,
    },
    include: {
      owner: true,
      indicators: {
        include: { values: { orderBy: { period: "desc" }, take: 1 } },
      },
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
