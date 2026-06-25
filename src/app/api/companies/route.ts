import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }
  const existing = await prisma.company.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Компания с таким названием уже существует" }, { status: 409 });
  }
  const company = await prisma.company.create({
    data: { name },
    select: { id: true, name: true },
  });
  return NextResponse.json(company, { status: 201 });
}
