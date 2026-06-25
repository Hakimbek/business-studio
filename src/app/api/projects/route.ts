import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json([]);
  const projects = await prisma.project.findMany({
    where: { companyId },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const companyId = req.cookies.get("company-id")?.value;
  if (!companyId) return NextResponse.json({ error: "Компания не выбрана" }, { status: 400 });
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  const project = await prisma.project.create({
    data: {
      name,
      description: body.description || null,
      status: body.status || "ACTIVE",
      deadline: body.deadline ? new Date(body.deadline) : null,
      ownerId: body.ownerId || null,
      companyId,
    },
    include: { owner: true },
  });
  return NextResponse.json(project, { status: 201 });
}
