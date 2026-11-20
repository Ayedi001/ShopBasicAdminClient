import { prisma, type Tx } from "./db";
import { badRequest, notFound } from "./errors";
import { slugify } from "@/lib/utils";
import { buildSearchText } from "@/lib/search-text";
import { refreshProductAggregates } from "./pricing";
import { removeMedia } from "./media";
import { audit } from "./audit";
import { dictionaries } from "@/i18n";
import type { ProductInput } from "@/lib/validation";
import type { SessionUser } from "./auth/session";

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "produit";
  let slug = root;
  for (let i = 2; i < 200; i++) {
    const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === excludeId) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function brandIdFor(name: string | null, tx: Tx) {
  if (!name) return null;
  const slug = slugify(name);
  const brand = await tx.brand.upsert({ where: { slug }, create: { name, slug }, update: {} });
  return brand.id;
}

async function materialRows(materials: ProductInput["materials"], tx: Tx) {
  const rows: { materialId: string; percentage: number }[] = [];
  for (const m of materials) {
    const existing = await tx.material.findFirst({ where: { name: m.materialName } });
    const mat = existing ?? (await tx.material.create({ data: { name: m.materialName } }));
    if (!rows.some((r) => r.materialId === mat.id)) rows.push({ materialId: mat.id, percentage: m.percentage });
  }
  return rows;
}

async function assertCategory(input: ProductInput, tx: Tx) {
  const cat = await tx.category.findUnique({ where: { id: input.categoryId } });
  if (!cat) throw badRequest("VALIDATION", "Catégorie invalide", { categoryId: "Catégorie invalide" });
  if (input.subcategoryId) {
    const sub = await tx.subcategory.findUnique({ where: { id: input.subcategoryId } });
    if (!sub || sub.categoryId !== cat.id) {
      throw badRequest("VALIDATION", "La sous-catégorie n'appartient pas à la catégorie", { subcategoryId: "Sous-catégorie invalide" });
    }
  }
}

function productData(input: ProductInput) {
  return {
    name: input.name,
    sku: input.sku,
    shortDescription: input.shortDescription,
    description: input.description,
    audience: input.audience,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    collectionId: input.collectionId,
    season: input.season,
    fitType: input.fitType ?? null,
    weightGrams: input.weightGrams ?? null,
    careInstructions: input.careInstructions,
    countryOfOrigin: input.countryOfOrigin,
    characteristics: input.characteristics,
    price: input.price,
    salePrice: input.salePrice ?? null,
    status: input.status,
    isFeatured: input.isFeatured,
    isNewArrival: input.isNewArrival,
    isBestSeller: input.isBestSeller,
    isOnSale: input.isOnSale,
    sizeChartId: input.sizeChartId,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
  };
}

export async function createProduct(input: ProductInput, actor: SessionUser) {
  const slug = await uniqueSlug(input.slug || input.name);
  const product = await prisma.$transaction(async (tx) => {
    await assertCategory(input, tx);
    const p = await tx.product.create({
      data: {
        ...productData(input),
        slug,
        brandId: await brandIdFor(input.brandName, tx),
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
        materials: { create: await materialRows(input.materials, tx) },
        translations: { create: input.translations.filter((t) => t.name).map((t) => ({ ...t })) },
      },
    });
    await audit(actor, "product.create", "Product", p.id, { name: p.name }, tx);
    return p;
  });
  await rebuildSearchText(product.id);
  await refreshProductAggregates([product.id]);
  return product;
}

export async function updateProduct(id: string, input: ProductInput, actor: SessionUser) {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw notFound("Produit introuvable");
  const slug = input.slug && input.slug !== current.slug ? await uniqueSlug(input.slug, id) : current.slug;
  await prisma.$transaction(async (tx) => {
    await assertCategory(input, tx);
    await tx.productMaterial.deleteMany({ where: { productId: id } });
    await tx.productTranslation.deleteMany({ where: { productId: id } });
    await tx.product.update({
      where: { id },
      data: {
        ...productData(input),
        slug,
        brandId: await brandIdFor(input.brandName, tx),
        publishedAt: input.status === "PUBLISHED" ? current.publishedAt ?? new Date() : current.publishedAt,
        materials: { create: await materialRows(input.materials, tx) },
        translations: { create: input.translations.filter((t) => t.name).map((t) => ({ ...t })) },
      },
    });
    await audit(actor, "product.update", "Product", id, { name: input.name, status: input.status, price: input.price }, tx);
  });
  await rebuildSearchText(id);
  await refreshProductAggregates([id]);
}

export async function deleteProduct(id: string, actor: SessionUser) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: { images: true, _count: { select: { orderItems: true } }, variants: { select: { reserved: true } } },
  });
  if (!p) throw notFound("Produit introuvable");
  if (p.variants.some((v) => v.reserved > 0)) {
    throw badRequest("HAS_PENDING_ORDERS", "Des commandes en attente réservent ce produit. Traitez-les avant de le supprimer.");
  }
  if (p._count.orderItems > 0) {
    // Historical orders keep their snapshot; archive instead of deleting to keep reports coherent
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit(actor, "product.archive", "Product", id, { name: p.name, reason: "has orders" });
    return { archived: true };
  }
  await prisma.product.delete({ where: { id } });
  for (const img of p.images) await removeMedia(img.storageKey);
  await audit(actor, "product.delete", "Product", id, { name: p.name });
  return { archived: false };
}

export async function duplicateProduct(id: string, actor: SessionUser) {
  const p = await prisma.product.findUnique({ where: { id }, include: { materials: true, translations: true, variants: true } });
  if (!p) throw notFound("Produit introuvable");
  const slug = await uniqueSlug(p.slug + "-copie");
  const {
    id: _id,
    slug: _slug,
    sku: _sku,
    createdAt: _c,
    updatedAt: _u,
    publishedAt: _p,
    materials: _m,
    translations: _t,
    variants: _v,
    soldCount: _s,
    ratingAvg: _ra,
    ratingCount: _rc,
    ...fields
  } = p;
  const copy = await prisma.product.create({
    data: {
      ...fields,
      name: p.name + " (copie)",
      slug,
      status: "DRAFT",
      materials: { create: p.materials.map((m) => ({ materialId: m.materialId, percentage: m.percentage })) },
      translations: { create: p.translations.map((t) => ({ locale: t.locale, name: t.name, shortDescription: t.shortDescription, description: t.description, careInstructions: t.careInstructions })) },
      variants: {
        create: p.variants.map((v) => ({ colorId: v.colorId, sizeId: v.sizeId, variantKey: v.variantKey, price: v.price, salePrice: v.salePrice, stock: 0, available: 0, isActive: v.isActive, sortOrder: v.sortOrder })),
      },
    },
  });
  await audit(actor, "product.duplicate", "Product", copy.id, { from: p.id });
  await rebuildSearchText(copy.id);
  await refreshProductAggregates([copy.id]);
  return copy;
}

// ─────────────── Variants ───────────────

export const variantKey = (colorId?: string | null, sizeId?: string | null) => `${colorId || "-"}:${sizeId || "-"}`;

type VariantRow = {
  id?: string | null;
  colorId?: string | null;
  sizeId?: string | null;
  sku?: string | null;
  price?: number | null;
  salePrice?: number | null;
  stock?: number;
  isActive: boolean;
};

/**
 * Replaces the variant matrix of a product. Existing variants keep their
 * stock (changes go through inventory adjustments); new variants receive
 * their initial stock with an INITIAL movement. Removed variants are deleted
 * when unused, otherwise deactivated to preserve order history.
 */
export async function saveVariants(productId: string, rows: VariantRow[], actor: SessionUser) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: { include: { _count: { select: { orderItems: true } } } } } });
  if (!product) throw notFound("Produit introuvable");

  const keys = new Set<string>();
  for (const r of rows) {
    const k = variantKey(r.colorId, r.sizeId);
    if (keys.has(k)) throw badRequest("DUPLICATE_VARIANT", "Combinaison couleur/taille en double. Chaque combinaison doit être unique.");
    keys.add(k);
    if (r.salePrice != null && r.price != null && r.salePrice >= r.price) {
      throw badRequest("VALIDATION", "Le prix promo d'une variante doit être inférieur à son prix.");
    }
  }
  const skus = rows.map((r) => r.sku).filter(Boolean) as string[];
  if (new Set(skus).size !== skus.length) throw badRequest("DUPLICATE_SKU", "Deux variantes ont le même SKU.");
  if (skus.length) {
    const clash = await prisma.productVariant.findFirst({ where: { sku: { in: skus }, productId: { not: productId } }, select: { sku: true } });
    if (clash) throw badRequest("DUPLICATE_SKU", `Le SKU ${clash.sku} est déjà utilisé par un autre produit.`);
  }
  const [colorIds, sizeIds] = [rows.map((r) => r.colorId).filter(Boolean) as string[], rows.map((r) => r.sizeId).filter(Boolean) as string[]];
  const [colorCount, sizeCount] = await Promise.all([
    prisma.color.count({ where: { id: { in: [...new Set(colorIds)] } } }),
    prisma.size.count({ where: { id: { in: [...new Set(sizeIds)] } } }),
  ]);
  if (colorCount !== new Set(colorIds).size || sizeCount !== new Set(sizeIds).size) throw badRequest("VALIDATION", "Couleur ou taille inconnue.");

  const sizes = await prisma.size.findMany({ where: { id: { in: sizeIds } }, select: { id: true, sortOrder: true } });
  const sizeOrder = new Map(sizes.map((s) => [s.id, s.sortOrder]));

  await prisma.$transaction(async (tx) => {
    const byKey = new Map(product.variants.map((v) => [v.variantKey, v]));
    const keep = new Set<string>();
    for (const [index, r] of rows.entries()) {
      const k = variantKey(r.colorId, r.sizeId);
      const existing = (r.id && product.variants.find((v) => v.id === r.id)) || byKey.get(k);
      const sortOrder = index * 10 + (sizeOrder.get(r.sizeId ?? "") ?? 0) * 0;
      if (existing) {
        if (existing.variantKey !== k) throw badRequest("VALIDATION", "La couleur/taille d'une variante existante ne peut pas être modifiée. Ajoutez une nouvelle variante.");
        keep.add(existing.id);
        await tx.productVariant.update({
          where: { id: existing.id },
          data: { sku: r.sku || null, price: r.price ?? null, salePrice: r.salePrice ?? null, isActive: r.isActive, sortOrder },
        });
      } else {
        const stock = r.stock ?? 0;
        const created = await tx.productVariant.create({
          data: {
            productId,
            colorId: r.colorId || null,
            sizeId: r.sizeId || null,
            variantKey: k,
            sku: r.sku || null,
            price: r.price ?? null,
            salePrice: r.salePrice ?? null,
            stock,
            available: stock,
            isActive: r.isActive,
            sortOrder,
          },
        });
        keep.add(created.id);
        if (stock > 0) {
          await tx.stockMovement.create({
            data: { variantId: created.id, delta: stock, type: "INITIAL", reason: "Stock initial", stockBefore: 0, stockAfter: stock, userId: actor.id, userName: actor.fullName },
          });
        }
      }
    }
    for (const v of product.variants) {
      if (keep.has(v.id)) continue;
      if (v.reserved > 0 || v._count.orderItems > 0) {
        await tx.productVariant.update({ where: { id: v.id }, data: { isActive: false } });
      } else {
        await tx.cartItem.deleteMany({ where: { variantId: v.id } });
        await tx.productVariant.delete({ where: { id: v.id } });
      }
    }
    await audit(actor, "product.variants", "Product", productId, { count: rows.length }, tx);
  });
  await rebuildSearchText(productId);
  await refreshProductAggregates([productId]);
}

// ─────────────── Images ───────────────

export async function reorderImages(productId: string, orderedIds: string[]) {
  const images = await prisma.productImage.findMany({ where: { productId }, select: { id: true } });
  const valid = new Set(images.map((i) => i.id));
  await prisma.$transaction(
    orderedIds.filter((id) => valid.has(id)).map((id, index) => prisma.productImage.update({ where: { id }, data: { sortOrder: index } })),
  );
}

export async function setMainImage(productId: string, imageId: string) {
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isMain: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isMain: true } }),
  ]);
}

export async function deleteImage(productId: string, imageId: string) {
  const img = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!img) throw notFound("Image introuvable");
  await prisma.productImage.delete({ where: { id: img.id } });
  // Keep files referenced by historical orders so they never show broken images
  const usedByOrders = await prisma.orderItem.count({ where: { imageUrl: img.thumbUrl } });
  if (!usedByOrders) await removeMedia(img.storageKey);
  if (img.isMain) {
    const next = await prisma.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "asc" } });
    if (next) await prisma.productImage.update({ where: { id: next.id }, data: { isMain: true } });
  }
}

// ─────────────── Search index ───────────────

export async function rebuildSearchText(productId: string) {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      translations: true,
      brand: true,
      category: true,
      subcategory: true,
      collection: true,
      materials: { include: { material: true } },
      variants: { include: { color: true } },
    },
  });
  if (!p) return;
  const audienceWords = Object.values(dictionaries).map((d) => d.audience[p.audience as keyof typeof d.audience]);
  const colorWords = [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!.id, v.color!])).values()].flatMap((c) => [c.name, c.nameAr, c.nameEn]);
  const text = buildSearchText([
    p.name,
    p.sku,
    p.shortDescription,
    p.description.slice(0, 600),
    ...p.translations.flatMap((t) => [t.name, t.shortDescription, (t.description ?? "").slice(0, 400)]),
    p.brand?.name,
    p.category.name,
    p.category.nameAr,
    p.category.nameEn,
    p.subcategory?.name,
    p.subcategory?.nameAr,
    p.subcategory?.nameEn,
    p.subcategory?.productType,
    p.collection?.name,
    p.collection?.nameEn,
    ...p.materials.flatMap((m) => [m.material.name, m.material.nameAr, m.material.nameEn]),
    ...colorWords,
    ...audienceWords,
  ]);
  await prisma.product.update({ where: { id: productId }, data: { searchText: text } });
}

export async function rebuildSearchTextWhere(where: { categoryId?: string; subcategoryId?: string; brandId?: string; collectionId?: string }) {
  const products = await prisma.product.findMany({ where, select: { id: true } });
  for (const p of products) await rebuildSearchText(p.id);
}
