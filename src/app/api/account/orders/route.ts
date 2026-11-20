import { api, intParam } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

export const GET = api(async (req) => {
  const user = await requireUser();
  const page = intParam(req.nextUrl.searchParams.get("page"), 1);
  const pageSize = 10;
  const where = { userId: user.id };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { number: true, status: true, total: true, createdAt: true, _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
});
