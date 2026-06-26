import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const boards = await prisma.strategyMapBoard.findMany({
    where: { companyId },
    include: {
      entries: {
        include: { goal: { include: { indicators: true } } },
        orderBy: { createdAt: "asc" },
      },
      links: { orderBy: { createdAt: "asc" } },
      regions: { orderBy: { createdAt: "asc" } },
      indicatorEntries: {
        include: {
          indicator: {
            include: { values: { orderBy: { period: "desc" } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      indicatorLinks: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(boards);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  const board = await prisma.strategyMapBoard.create({
    data: { name, companyId },
    include: { entries: true, links: true, regions: true, indicatorEntries: true, indicatorLinks: true },
  });
  return NextResponse.json(board, { status: 201 });
}
