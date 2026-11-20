import type { Prisma } from "@prisma/client";
import { prisma, icontains } from "./db";

export type OrderListQuery = {
  q?: string | null;
  status?: string | null;
  from?: string | null;
  to?: string | null;
  userId?: string | null;
  page?: number;
  pageSize?: number;
};

export function orderWhere(q: OrderListQuery): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (q.status) and.push({ status: q.status });
  if (q.userId) and.push({ userId: q.userId });
  if (q.from) {
    const d = new Date(q.from);
    if (!isNaN(d.getTime())) and.push({ createdAt: { gte: d } });
  }
  if (q.to) {
    const d = new Date(q.to);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      and.push({ createdAt: { lte: d } });
    }
  }
  if (q.q) {
    const text = q.q.trim();
    const digits = text.replace(/\D/g, "");
    const or: Prisma.OrderWhereInput[] = [
      { number: icontains(text.toUpperCase()) },
      { customerName: icontains(text) },
      { customerEmail: icontains(text.toLowerCase()) },
    ];
    if (digits.length >= 3) or.push({ customerPhone: { contains: digits } });
    and.push({ OR: or });
  }
  return { AND: and };
}

export async function listOrders(q: OrderListQuery) {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const where = orderWhere(q);
  const [items, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: { select: { productName: true, colorName: true, sizeLabel: true, quantity: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  return {
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number>,
  };
}

export async function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { select: { id: true, stock: true, available: true, reserved: true } } } },
      history: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      returnRequests: { select: { id: true, number: true, type: true, status: true, createdAt: true } },
      user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } } },
    },
  });
}
