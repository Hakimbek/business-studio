import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const processes = await prisma.process.findMany({
    where: { companyId },
    include: { ownerRole: true, indicators: true, children: true, risks: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(processes);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const process = await prisma.process.create({
    data: {
      name: body.name,
      description: body.description,
      notation: body.notation ?? "PROCEDURE",
      code: body.code,
      parentId: body.parentId || null,
      ownerRoleId: body.ownerRoleId || null,
      companyId,
    },
    include: { ownerRole: true, indicators: true },
  });
  return NextResponse.json(process, { status: 201 });
}
