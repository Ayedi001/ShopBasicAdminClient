import { prisma } from "./db";
import { getSetting } from "./settings";
import type { SessionUser } from "./auth/session";

export type AdminAlerts = {
  pendingOrders: number;
  pendingReturns: number;
  pendingReviews: number;
  unreadMessages: number;
  lowStock: number;
  latestOrderAt: string | null;
};

/** Counters shown in the admin sidebar and notification bell, limited to what the user may see. */
export async function adminAlerts(user: SessionUser): Promise<AdminAlerts> {
  const can = (p: string) => user.permissions.includes(p as never);
  const { lowStockThreshold } = await getSetting("general");
  const [pendingOrders, latest, pendingReturns, pendingReviews, unreadMessages, lowStock] = await Promise.all([
    can("orders.view") ? prisma.order.count({ where: { status: "PENDING" } }) : 0,
    can("orders.view") ? prisma.order.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }) : null,
    can("returns.manage") ? prisma.returnRequest.count({ where: { status: "REQUESTED" } }) : 0,
    can("reviews.manage") ? prisma.review.count({ where: { status: "PENDING" } }) : 0,
    can("customers.view") ? prisma.contactMessage.count({ where: { isRead: false } }) : 0,
    can("inventory.manage")
      ? prisma.productVariant.count({ where: { isActive: true, available: { lte: lowStockThreshold }, product: { status: "PUBLISHED" } } })
      : 0,
  ]);
  return { pendingOrders, pendingReturns, pendingReviews, unreadMessages, lowStock, latestOrderAt: latest?.createdAt.toISOString() ?? null };
}
