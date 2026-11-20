import { z } from "zod";
import { api, parseBody } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { notFound } from "@/server/errors";

const schema = z.object({ productId: z.string().min(1).max(40) });

export const GET = api(async () => {
  const user = await requireUser();
  const items = await prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } });
  return { ids: items.map((i) => i.productId) };
});

/** Toggle a product in the wishlist */
export const POST = api(async (req) => {
  const user = await requireUser();
  const { productId } = await parseBody(req, schema);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw notFound("Produit introuvable");
  const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  return { inWishlist: !existing };
});
