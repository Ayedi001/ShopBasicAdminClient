import { prisma } from "./db";

/** Loads an order ONLY if it belongs to the given customer (ownership enforced in the query). */
export async function getOwnOrder(userId: string, number: string) {
  return prisma.order.findFirst({
    where: { number, userId },
    include: {
      items: { include: { returnItems: { include: { returnRequest: { select: { status: true } } } } } },
      history: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true, note: true, fromStatus: true } },
      returnRequests: { include: { items: true }, orderBy: { createdAt: "desc" } },
    },
  });
}
