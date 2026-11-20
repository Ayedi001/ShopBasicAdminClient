import { z } from "zod";
import { api, parseBody } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { deleteImage, setMainImage } from "@/server/products-admin";
import { removeMedia, saveUpload } from "@/server/media";
import { badRequest, notFound } from "@/server/errors";
import { IMAGE_VIEWS } from "@/lib/constants";

const schema = z.object({
  colorId: z.string().max(40).nullable().optional(),
  view: z.enum(IMAGE_VIEWS).optional(),
  alt: z.string().trim().max(200).nullable().optional(),
  isMain: z.literal(true).optional(),
});

export const PATCH = api<{ id: string; imageId: string }>(async (req, ctx) => {
  await requireStaff("products.manage");
  const { id, imageId } = await ctx.params;
  const input = await parseBody(req, schema);
  const img = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
  if (!img) throw notFound("Image introuvable");
  if (input.colorId && !(await prisma.color.findUnique({ where: { id: input.colorId } }))) throw badRequest("VALIDATION", "Couleur invalide");
  await prisma.productImage.update({
    where: { id: imageId },
    data: {
      ...(input.colorId !== undefined ? { colorId: input.colorId } : {}),
      ...(input.view ? { view: input.view } : {}),
      ...(input.alt !== undefined ? { alt: input.alt } : {}),
    },
  });
  if (input.isMain) await setMainImage(id, imageId);
  return { ok: true };
});

/** Replace the file of an existing image, keeping its position, colour and view. */
export const PUT = api<{ id: string; imageId: string }>(async (req, ctx) => {
  await requireStaff("products.manage");
  const { id, imageId } = await ctx.params;
  const img = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
  if (!img) throw notFound("Image introuvable");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw badRequest("NO_FILE", "Aucun fichier reçu");
  const media = await saveUpload(file, "products", id, true);
  await prisma.productImage.update({
    where: { id: imageId },
    data: { kind: media.kind, storageKey: media.storageKey, url: media.url, thumbUrl: media.thumbUrl, width: media.width, height: media.height },
  });
  const usedByOrders = await prisma.orderItem.count({ where: { imageUrl: img.thumbUrl } });
  if (!usedByOrders) await removeMedia(img.storageKey);
  return { ok: true };
});

export const DELETE = api<{ id: string; imageId: string }>(async (_req, ctx) => {
  await requireStaff("products.manage");
  const { id, imageId } = await ctx.params;
  await deleteImage(id, imageId);
  return { ok: true };
});
