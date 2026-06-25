import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const indicatorId = req.nextUrl.searchParams.get("indicatorId");
  const values = await prisma.indicatorValue.findMany({
    where: indicatorId ? { indicatorId } : undefined,
    orderBy: { period: "asc" },
  });
  return NextResponse.json(values);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const value = await prisma.indicatorValue.upsert({
    where: { indicatorId_period: { indicatorId: body.indicatorId, period: body.period } },
    create: {
      indicatorId: body.indicatorId,
      period: body.period,
      value: Number(body.value),
      note: body.note || null,
    },
    update: {
      value: Number(body.value),
      note: body.note || null,
    },
  });
  // Sync actualValue on indicator with latest period value
  const latest = await prisma.indicatorValue.findFirst({
    where: { indicatorId: body.indicatorId },
    orderBy: { period: "desc" },
  });
  if (latest) {
    await prisma.indicator.update({
      where: { id: body.indicatorId },
      data: { actualValue: latest.value },
    });
  }
  return NextResponse.json(value, { status: 201 });
}
