import { prisma } from "./db";
import { badRequest, forbidden, notFound } from "./errors";
import { getSetting } from "./settings";
import { notify } from "./notifications";
import type { SessionUser } from "./auth/session";

export async function hasPurchased(userId: string, productId: string) {
  const count = await prisma.orderItem.count({ where: { productId, order: { userId, status: "DELIVERED" } } });
  return count > 0;
}

export async function recomputeRating(productId: string) {
  const agg = await prisma.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await prisma.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
}

export async function createReview(
  user: SessionUser,
  productId: string,
  input: { rating: number; title: string | null; body: string },
  photos: { storageKey: string; url: string; thumbUrl: string }[],
) {
  const settings = await getSetting("general");
  if (!settings.reviewsEnabled) throw forbidden("Les avis sont désactivés.");
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw notFound("Produit introuvable");
  // Only verified buyers (delivered orders) may review
  if (!(await hasPurchased(user.id, productId))) {
    throw forbidden("Seuls les clients ayant reçu ce produit peuvent laisser un avis.");
  }
  const existing = await prisma.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } });
  if (existing) throw badRequest("ALREADY_REVIEWED", "Vous avez déjà donné votre avis sur ce produit.");
  const review = await prisma.review.create({
    data: {
      productId,
      userId: user.id,
      rating: input.rating,
      title: input.title,
      body: input.body,
      isVerifiedPurchase: true,
      status: settings.reviewsRequireApproval ? "PENDING" : "APPROVED",
      photos: { create: photos.slice(0, 4) },
    },
  });
  if (review.status === "APPROVED") await recomputeRating(productId);
  return review;
}

export async function moderateReview(id: string, input: { status?: string; adminReply?: string | null }) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw notFound("Avis introuvable");
  const replying = input.adminReply !== undefined && input.adminReply !== review.adminReply;
  await prisma.review.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.adminReply !== undefined ? { adminReply: input.adminReply, repliedAt: input.adminReply ? new Date() : null } : {}),
    },
  });
  if (replying && input.adminReply) await notify(prisma, review.userId, "REVIEW_REPLY", {});
  await recomputeRating(review.productId);
}

export async function deleteReview(id: string, _actor: SessionUser) {
  const review = await prisma.review.delete({ where: { id } });
  await recomputeRating(review.productId);
}
