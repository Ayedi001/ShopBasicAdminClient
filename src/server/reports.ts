import { prisma } from "./db";
import { COMMITTED_ORDER_STATUSES, COMPLETED_ORDER_STATUSES } from "@/lib/constants";
import { getSetting } from "./settings";

export type Period = "day" | "week" | "month" | "year";

function startOf(period: Period, d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (period === "week") x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  if (period === "month") x.setDate(1);
  if (period === "year") {
    x.setMonth(0, 1);
  }
  return x;
}

export async function dashboardOverview() {
  const [byStatus, customers, products, recentOrders, revenueAgg, pipelineAgg, pendingReturns, pendingReviews, lowStock] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { _count: { select: { items: true } } } }),
    prisma.order.aggregate({ where: { status: { in: COMPLETED_ORDER_STATUSES } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { status: { in: ["CONFIRMED", "PREPARING", "SHIPPED"] } }, _sum: { total: true }, _count: true }),
    prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    lowStockVariants(10),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  return {
    totalOrders: byStatus.reduce((s, b) => s + b._count, 0),
    pending: count("PENDING"),
    confirmed: count("CONFIRMED"),
    preparing: count("PREPARING"),
    shipped: count("SHIPPED"),
    delivered: count("DELIVERED"),
    cancelled: count("CANCELLED"),
    customers,
    products,
    revenue: revenueAgg._sum.total ?? 0,
    pipeline: pipelineAgg._sum.total ?? 0,
    pipelineCount: pipelineAgg._count,
    averageOrderValue: revenueAgg._count ? Math.round((revenueAgg._sum.total ?? 0) / revenueAgg._count) : 0,
    recentOrders,
    pendingReturns,
    pendingReviews,
    lowStock,
  };
}

export async function lowStockVariants(take = 50) {
  const { lowStockThreshold } = await getSetting("general");
  return prisma.productVariant.findMany({
    where: { isActive: true, available: { lte: lowStockThreshold }, product: { status: { not: "ARCHIVED" } } },
    include: { product: { select: { id: true, name: true, slug: true } }, color: true, size: true },
    orderBy: [{ available: "asc" }],
    take,
  });
}

/** Time series of orders/revenue grouped by day (or month for the yearly view). */
export async function salesSeries(period: Period) {
  const now = new Date();
  const from =
    period === "day"
      ? new Date(now.getTime() - 13 * 86400_000)
      : period === "week"
        ? new Date(now.getTime() - 7 * 12 * 86400_000)
        : period === "month"
          ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
          : new Date(now.getFullYear() - 4, 0, 1);
  from.setHours(0, 0, 0, 0);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true, deliveredAt: true, status: true, total: true },
  });
  const keyOf = (d: Date) => {
    if (period === "day") return d.toISOString().slice(0, 10);
    if (period === "week") return startOf("week", d).toISOString().slice(0, 10);
    if (period === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return String(d.getFullYear());
  };
  const buckets = new Map<string, { label: string; orders: number; committed: number; revenue: number; cancelled: number }>();
  const cursor = new Date(from);
  while (cursor <= now) {
    const k = keyOf(cursor);
    if (!buckets.has(k)) buckets.set(k, { label: k, orders: 0, committed: 0, revenue: 0, cancelled: 0 });
    if (period === "day") cursor.setDate(cursor.getDate() + 1);
    else if (period === "week") cursor.setDate(cursor.getDate() + 7);
    else if (period === "month") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }
  for (const o of orders) {
    const b = buckets.get(keyOf(o.createdAt));
    if (!b) continue;
    b.orders += 1;
    if (o.status === "CANCELLED") b.cancelled += 1;
    if ((COMMITTED_ORDER_STATUSES as string[]).includes(o.status)) b.committed += 1;
    if (o.status === "DELIVERED") b.revenue += o.total;
  }
  return [...buckets.values()];
}

export async function analytics(from: Date, to: Date) {
  const range = { gte: from, lte: to };
  const completed = { status: { in: COMPLETED_ORDER_STATUSES }, createdAt: range };
  const committed = { status: { in: COMMITTED_ORDER_STATUSES }, createdAt: range };

  const [allOrders, cancelled, revenue, byCategory, topProducts, items, registrations] = await Promise.all([
    prisma.order.count({ where: { createdAt: range } }),
    prisma.order.count({ where: { createdAt: range, status: "CANCELLED" } }),
    prisma.order.aggregate({ where: completed, _sum: { total: true, shippingFee: true, discountTotal: true }, _count: true }),
    prisma.orderItem.groupBy({ by: ["categoryName"], where: { order: completed }, _sum: { lineTotal: true, quantity: true } }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: committed },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.orderItem.findMany({ where: { order: committed }, select: { sizeLabel: true, colorName: true, colorHex: true, quantity: true } }),
    prisma.user.findMany({ where: { role: "CUSTOMER", createdAt: range }, select: { createdAt: true } }),
  ]);

  const sizeMap = new Map<string, number>();
  const colorMap = new Map<string, { qty: number; hex: string | null }>();
  for (const i of items) {
    if (i.sizeLabel) sizeMap.set(i.sizeLabel, (sizeMap.get(i.sizeLabel) ?? 0) + i.quantity);
    if (i.colorName) {
      const c = colorMap.get(i.colorName) ?? { qty: 0, hex: i.colorHex };
      c.qty += i.quantity;
      colorMap.set(i.colorName, c);
    }
  }
  const regByDay = new Map<string, number>();
  for (const r of registrations) {
    const k = r.createdAt.toISOString().slice(0, 10);
    regByDay.set(k, (regByDay.get(k) ?? 0) + 1);
  }

  return {
    orders: allOrders,
    cancelled,
    cancellationRate: allOrders ? Math.round((cancelled / allOrders) * 1000) / 10 : 0,
    completedOrders: revenue._count,
    revenue: revenue._sum.total ?? 0,
    averageOrderValue: revenue._count ? Math.round((revenue._sum.total ?? 0) / revenue._count) : 0,
    salesByCategory: byCategory
      .map((c) => ({ name: c.categoryName ?? "—", revenue: c._sum.lineTotal ?? 0, quantity: c._sum.quantity ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue),
    topProducts: topProducts.map((p) => ({ productId: p.productId, name: p.productName, quantity: p._sum.quantity ?? 0, revenue: p._sum.lineTotal ?? 0 })),
    topSizes: [...sizeMap.entries()].map(([size, qty]) => ({ size, qty })).sort((a, b) => b.qty - a.qty).slice(0, 10),
    topColors: [...colorMap.entries()].map(([name, v]) => ({ name, qty: v.qty, hex: v.hex })).sort((a, b) => b.qty - a.qty).slice(0, 10),
    registrations: registrations.length,
    registrationsByDay: [...regByDay.entries()].sort().map(([day, count]) => ({ day, count })),
  };
}

export async function outOfStockProducts() {
  return prisma.product.findMany({
    where: { status: "PUBLISHED", totalAvailable: 0 },
    select: { id: true, name: true, slug: true, updatedAt: true },
    orderBy: { name: "asc" },
    take: 200,
  });
}
