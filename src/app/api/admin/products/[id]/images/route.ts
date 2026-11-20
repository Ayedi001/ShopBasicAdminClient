import { z } from "zod";
import { api, parseBody } from "@/server/http";
import { requireStaff, clientIp } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { saveUpload } from "@/server/media";
import { badRequest, notFound } from "@/server/errors";
import { reorderImages } from "@/server/products-admin";
import { IMAGE_VIEWS } from "@/lib/constants";
import { LIMITS, rateLimit } from "@/server/rate-limit";

/** Upload one or more images/videos: multipart fields files[], colorId?, view? */
export const POST = api<{ id: string }>(async (req, ctx) => {
  const user = await requireStaff("products.manage");
  rateLimit(`upload:${user.id}:${await clientIp()}`, LIMITS.upload.limit, LIMITS.upload.windowMs);
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, _count: { select: { images: true } } } });
  if (!product) throw notFound("Produit introuvable");
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) throw badRequest("NO_FILE", "Aucun fichier reçu");
  if (files.length > 20) throw badRequest("TOO_MANY", "20 fichiers maximum par envoi");
  const colorId = (form.get("colorId") as string) || null;
  if (colorId && !(await prisma.color.findUnique({ where: { id: colorId } }))) throw badRequest("VALIDATION", "Couleur invalide");
  const viewRaw = (form.get("view") as string) || "OTHER";
  const view = (IMAGE_VIEWS as readonly string[]).includes(viewRaw) ? viewRaw : "OTHER";

  const hasMain = await prisma.productImage.count({ where: { productId: id, isMain: true } });
  let sort = product._count.images;
  const created = [];
  for (const file of files) {
    const media = await saveUpload(file, "products", id, true);
    created.push(
      await prisma.productImage.create({
        data: {
          productId: id,
          colorId,
          kind: media.kind,
          view,
          storageKey: media.storageKey,
          url: media.url,
          thumbUrl: media.thumbUrl,
          width: media.width,
          height: media.height,
          alt: product.name,
          isMain: !hasMain && created.length === 0 && media.kind === "IMAGE",
          sortOrder: sort++,
        },
      }),
    );
  }
  return { ok: true, images: created };
});

const reorderSchema = z.object({ ids: z.array(z.string().max(40)).max(200) });

export const PATCH = api<{ id: string }>(async (req, ctx) => {
  await requireStaff("products.manage");
  const { id } = await ctx.params;
  const { ids } = await parseBody(req, reorderSchema);
  await reorderImages(id, ids);
  return { ok: true };
});
