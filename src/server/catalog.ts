import type { Prisma } from "@/server/db";
import { prisma } from "./db";
import { computePrice, ensurePricingFresh, getActivePromotions, type ActivePromotion } from "./pricing";
import { localized } from "@/i18n";
import { searchTokens, normalizeSearch } from "@/lib/search-text";
import { mediaVariant } from "./media";
import { safeJson, slugify } from "@/lib/utils";

// ─────────────── DTOs ───────────────

export type ProductCardDTO = {
  id: string;
  slug: string;
  href: string;
  name: string;
  brand: string | null;
  image: string | null;
  hoverImage: string | null;
  price: number;
  basePrice: number;
  discountPct: number;
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  inStock: boolean;
  colors: { name: string; hex: string; slug: string }[];
  ratingAvg: number;
  ratingCount: number;
};

const cardSelect = (locale: string) =>
  ({
    id: true,
    slug: true,
    name: true,
    categoryId: true,
    subcategoryId: true,
    price: true,
    salePrice: true,
    isNewArrival: true,
    isBestSeller: true,
    isFeatured: true,
    ratingAvg: true,
    ratingCount: true,
    brand: { select: { name: true } },
    translations: { where: { locale }, select: { name: true } },
    images: {
      where: { kind: "IMAGE", OR: [{ isMain: true }, { view: { in: ["FRONT", "BACK"] } }] },
      orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
      take: 16,
      select: { url: true, view: true, color: { select: { slug: true } } },
    },
    variants: {
      where: { isActive: true },
      select: {
        price: true,
        salePrice: true,
        available: true,
        color: { select: { name: true, nameAr: true, nameEn: true, hex: true, slug: true, sortOrder: true } },
      },
    },
  }) satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: ReturnType<typeof cardSelect> }>;

function cardImages(p: CardRow, preferColors?: string[]) {
  const color = preferColors?.find((slug) => p.images.some((i) => i.color?.slug === slug));
  if (color) {
    const own = p.images.filter((i) => i.color?.slug === color);
    const front = own.find((i) => i.view === "FRONT") ?? own[0];
    const back = own.find((i) => i !== front);
    return { image: front.url, hover: back?.url ?? null, color };
  }
  const main = p.images[0];
  const hover = p.images.find((i) => i !== main && (!main?.color || i.color?.slug === main.color.slug)) ?? p.images[1];
  return { image: main?.url ?? null, hover: hover?.url ?? null, color: null };
}

function toCard(p: CardRow, locale: string, promos: ActivePromotion[], preferColors?: string[]): ProductCardDTO {
  const pics = cardImages(p, preferColors);
  const prices = p.variants.length ? p.variants.map((v) => computePrice(p, v, promos)) : [computePrice(p, null, promos)];
  const cheapest = prices.reduce((a, b) => (b.final < a.final ? b : a));
  const colorMap = new Map<string, { name: string; hex: string; slug: string; order: number }>();
  for (const v of p.variants) {
    if (v.color && !colorMap.has(v.color.slug)) {
      colorMap.set(v.color.slug, { name: localized(v.color, locale), hex: v.color.hex, slug: v.color.slug, order: v.color.sortOrder });
    }
  }
  return {
    id: p.id,
    slug: p.slug,
    href: `/p/${p.slug}${pics.color ? `?color=${pics.color}` : ""}`,
    name: p.translations[0]?.name || p.name,
    brand: p.brand?.name ?? null,
    image: mediaVariant(pics.image, "md"),
    hoverImage: mediaVariant(pics.hover, "md"),
    price: cheapest.final,
    basePrice: cheapest.base,
    discountPct: Math.max(...prices.map((x) => x.discountPct)),
    isNew: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    inStock: p.variants.some((v) => v.available > 0),
    colors: [...colorMap.values()].sort((a, b) => a.order - b.order).map(({ order: _o, ...c }) => c),
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
  };
}

export async function getProductCards(
  where: Prisma.ProductWhereInput,
  locale: string,
  opts: { orderBy?: Prisma.ProductOrderByWithRelationInput[]; take?: number; skip?: number; preferColors?: string[] } = {},
): Promise<ProductCardDTO[]> {
  const [rows, promos] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED", ...where },
      select: cardSelect(locale),
      orderBy: opts.orderBy ?? [{ publishedAt: "desc" }],
      take: opts.take ?? 12,
      skip: opts.skip,
    }),
    getActivePromotions(),
  ]);
  return rows.map((r) => toCard(r, locale, promos, opts.preferColors));
}

export async function getCardsByIds(ids: string[], locale: string, preferColors?: string[]): Promise<ProductCardDTO[]> {
  if (!ids.length) return [];
  const cards = await getProductCards({ id: { in: ids.slice(0, 50) } }, locale, { take: 50, preferColors });
  const order = new Map(ids.map((id, i) => [id, i]));
  return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

// ─────────────── Listing, filters & search ───────────────

export const SORTS = ["relevance", "newest", "price_asc", "price_desc", "bestsellers"] as const;
export type Sort = (typeof SORTS)[number];

export type CatalogQuery = {
  q?: string;
  audience?: string[];
  category?: string;
  sub?: string[];
  min?: number; // TND
  max?: number; // TND
  size?: string[];
  shoe?: string[];
  age?: string[];
  color?: string[];
  material?: string[];
  brand?: string[];
  season?: string;
  collection?: string;
  stock?: boolean;
  sale?: boolean;
  isNew?: boolean;
  sort?: Sort;
  page?: number;
};

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean).slice(0, 30);

export function parseCatalogQuery(sp: Record<string, string | string[] | undefined>): CatalogQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  const num = (k: string) => {
    const v = Number(one(k));
    return Number.isFinite(v) && v >= 0 && one(k) !== "" && one(k) != null ? v : undefined;
  };
  const sort = one("sort") as Sort | undefined;
  return {
    q: one("q")?.slice(0, 100) || undefined,
    audience: list(sp.audience).map((a) => a.toUpperCase()),
    category: one("category") || undefined,
    sub: list(sp.sub),
    min: num("min"),
    max: num("max"),
    size: list(sp.size),
    shoe: list(sp.shoe),
    age: list(sp.age),
    color: list(sp.color),
    material: list(sp.material),
    brand: list(sp.brand),
    season: one("season") || undefined,
    collection: one("collection") || undefined,
    stock: one("stock") === "1",
    sale: one("sale") === "1",
    isNew: one("new") === "1",
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: Math.max(1, Math.min(500, Number(one("page")) || 1)),
  };
}

/** Where clause for the "context" (department / category / search) — used for facets. */
async function contextWhere(q: CatalogQuery): Promise<Prisma.ProductWhereInput[]> {
  const and: Prisma.ProductWhereInput[] = [{ status: "PUBLISHED" }, { category: { isActive: true } }];
  if (q.audience?.length) and.push({ audience: { in: q.audience } });
  if (q.category) and.push({ category: { slug: q.category } });
  if (q.sub?.length) and.push({ subcategory: { slug: { in: q.sub } } });
  if (q.collection) and.push({ collection: { slug: q.collection } });
  if (q.q) {
    for (const token of searchTokens(q.q)) and.push({ searchText: { contains: token } });
  }
  return and;
}

async function fullWhere(q: CatalogQuery): Promise<Prisma.ProductWhereInput> {
  const and = await contextWhere(q);
  if (q.min != null) and.push({ minPrice: { gte: Math.round(q.min * 1000) } });
  if (q.max != null) and.push({ minPrice: { lte: Math.round(q.max * 1000) } });
  if (q.brand?.length) and.push({ brand: { slug: { in: q.brand } } });
  if (q.season) and.push({ season: { in: [q.season.toUpperCase(), "ALL"] } });
  if (q.sale) and.push({ isDiscounted: true });
  if (q.isNew) and.push({ isNewArrival: true });
  if (q.material?.length) {
    const mats = await prisma.material.findMany({ select: { id: true, name: true } });
    const ids = mats.filter((m) => q.material!.includes(slugify(m.name)) || q.material!.includes(m.id)).map((m) => m.id);
    and.push({ materials: { some: { materialId: { in: ids.length ? ids : ["__none__"] } } } });
  }

  // Size, colour and availability must all match the SAME variant
  // (e.g. "black jacket in M that is in stock").
  const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true };
  let needsVariant = false;
  const sizeFilters = [
    ...(q.size ?? []).map((label) => ({ type: "CLOTHING", label })),
    ...(q.shoe ?? []).map((label) => ({ type: "SHOES", label })),
    ...(q.age ?? []).map((label) => ({ type: "AGE", label })),
  ];
  if (sizeFilters.length) {
    needsVariant = true;
    variantWhere.size = { OR: sizeFilters.map((s) => ({ type: s.type, label: s.label })) };
  }
  if (q.color?.length) {
    needsVariant = true;
    variantWhere.color = { slug: { in: q.color } };
  }
  if (q.stock) {
    needsVariant = true;
    variantWhere.available = { gt: 0 };
  }
  if (needsVariant) and.push({ variants: { some: variantWhere } });
  return { AND: and };
}

function orderFor(sort: Sort | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ minPrice: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ minPrice: "desc" }, { id: "asc" }];
    case "bestsellers":
      return [{ soldCount: "desc" }, { isBestSeller: "desc" }, { publishedAt: "desc" }];
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { totalAvailable: "desc" }, { soldCount: "desc" }, { publishedAt: "desc" }];
  }
}

export async function searchCatalog(q: CatalogQuery, locale: string, pageSize = 24) {
  await ensurePricingFresh();
  const where = await fullWhere(q);
  const page = q.page ?? 1;
  const sort = q.sort ?? (q.q ? "relevance" : undefined);

  let items: ProductCardDTO[];
  let total: number;

  if (q.q && sort === "relevance") {
    // Relevance ranking: score matching candidates, then paginate.
    const candidates = await prisma.product.findMany({
      where,
      select: { id: true, name: true, searchText: true, soldCount: true, totalAvailable: true, translations: { select: { name: true } } },
      take: 1000,
    });
    total = candidates.length;
    const tokens = searchTokens(q.q);
    const phrase = normalizeSearch(q.q);
    const scored = candidates
      .map((c) => {
        const names = [c.name, ...c.translations.map((t) => t.name)].map(normalizeSearch).join(" ");
        let score = 0;
        if (names.includes(phrase)) score += 50;
        for (const t of tokens) {
          if (names.includes(t)) score += 10;
          if (names.split(" ").some((w) => w.startsWith(t))) score += 5;
          if (c.searchText.includes(` ${t}`)) score += 2;
        }
        if (c.totalAvailable > 0) score += 3;
        score += Math.min(5, c.soldCount / 20);
        return { id: c.id, score };
      })
      .sort((a, b) => b.score - a.score);
    const pageIds = scored.slice((page - 1) * pageSize, page * pageSize).map((s) => s.id);
    items = await getCardsByIds(pageIds, locale, q.color);
  } else {
    [items, total] = await Promise.all([
      getProductCards(where, locale, { orderBy: orderFor(sort), take: pageSize, skip: (page - 1) * pageSize, preferColors: q.color }),
      prisma.product.count({ where }),
    ]);
  }
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), sort: sort ?? "relevance" };
}

export type Facets = Awaited<ReturnType<typeof getFacets>>;

export async function getFacets(q: CatalogQuery, locale: string) {
  const and = await contextWhere(q);
  const productWhere: Prisma.ProductWhereInput = { AND: and };
  const [sizes, colors, materials, brands, price, categories] = await Promise.all([
    prisma.size.findMany({
      where: { variants: { some: { isActive: true, product: productWhere } } },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      select: { label: true, type: true },
    }),
    prisma.color.findMany({
      where: { variants: { some: { isActive: true, product: productWhere } } },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, nameAr: true, nameEn: true, hex: true },
    }),
    prisma.material.findMany({
      where: { products: { some: { product: productWhere } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameAr: true, nameEn: true },
    }),
    prisma.brand.findMany({ where: { products: { some: productWhere } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    prisma.product.aggregate({ where: productWhere, _min: { minPrice: true }, _max: { minPrice: true } }),
    prisma.category.findMany({
      where: { isActive: true, ...(q.audience?.length ? { audience: { in: q.audience } } : {}) },
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        nameAr: true,
        nameEn: true,
        subcategories: {
          where: { isActive: true, products: { some: { status: "PUBLISHED" } } },
          orderBy: { sortOrder: "asc" },
          select: { slug: true, name: true, nameAr: true, nameEn: true },
        },
      },
    }),
  ]);
  return {
    clothingSizes: sizes.filter((s) => s.type === "CLOTHING" || s.type === "ONE_SIZE" || s.type === "OTHER").map((s) => s.label),
    shoeSizes: sizes.filter((s) => s.type === "SHOES").map((s) => s.label),
    ageSizes: sizes.filter((s) => s.type === "AGE").map((s) => s.label),
    colors: colors.map((c) => ({ slug: c.slug, name: localized(c, locale), hex: c.hex })),
    materials: materials.map((m) => ({ value: slugify(m.name), name: localized(m, locale) })),
    brands: brands.map((b) => ({ value: b.slug, name: b.name })),
    priceMin: Math.floor((price._min.minPrice ?? 0) / 1000),
    priceMax: Math.ceil((price._max.minPrice ?? 0) / 1000),
    categories: categories.map((c) => ({
      slug: c.slug,
      name: localized(c, locale),
      subcategories: c.subcategories.map((s) => ({ slug: s.slug, name: localized(s, locale) })),
    })),
  };
}

/** Instant search suggestions (as-you-type). */
export async function suggest(qText: string, locale: string) {
  const tokens = searchTokens(qText);
  if (!tokens.length) return { products: [], categories: [] };
  const [products, subs] = await Promise.all([
    searchCatalog({ q: qText, sort: "relevance", page: 1 }, locale, 6),
    prisma.subcategory.findMany({
      where: {
        isActive: true,
        OR: tokens.flatMap((t) => [{ name: { contains: t } }, { nameEn: { contains: t } }, { nameAr: { contains: t } }, { productType: { contains: t } }]),
      },
      include: { category: true },
      take: 5,
    }),
  ]);
  return {
    products: products.items.map((p) => ({ slug: p.slug, name: p.name, image: p.image, price: p.price, basePrice: p.basePrice })),
    total: products.total,
    categories: subs.map((s) => ({
      label: `${localized(s.category, locale)} › ${localized(s, locale)}`,
      href: `/c/${s.category.slug}/${s.slug}`,
    })),
  };
}

// ─────────────── Product detail ───────────────

export async function getProductDetail(slug: string, locale: string) {
  const p = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED", category: { isActive: true } },
    include: {
      translations: true,
      brand: true,
      category: { include: { sizeChart: true } },
      subcategory: { include: { sizeChart: true } },
      collection: true,
      sizeChart: true,
      materials: { include: { material: true }, orderBy: { percentage: "desc" } },
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      variants: {
        where: { isActive: true },
        include: { color: true, size: true },
        orderBy: [{ sortOrder: "asc" }],
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { fullName: true } }, photos: true },
      },
    },
  });
  if (!p) return null;
  const promos = await getActivePromotions();
  const tr = p.translations.find((t) => t.locale === locale);

  const colors = new Map<string, { id: string; slug: string; name: string; hex: string; order: number }>();
  const sizes = new Map<string, { id: string; label: string; type: string; order: number }>();
  for (const v of p.variants) {
    if (v.color) colors.set(v.color.id, { id: v.color.id, slug: v.color.slug, name: localized(v.color, locale), hex: v.color.hex, order: v.color.sortOrder });
    if (v.size) sizes.set(v.size.id, { id: v.size.id, label: v.size.label, type: v.size.type, order: v.size.sortOrder });
  }

  const chart = p.sizeChart ?? p.subcategory?.sizeChart ?? p.category.sizeChart ?? null;

  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: tr?.name || p.name,
    shortDescription: tr?.shortDescription || p.shortDescription,
    description: tr?.description || p.description,
    careInstructions: tr?.careInstructions || p.careInstructions,
    characteristics: String(p.characteristics ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean),
    audience: p.audience,
    season: p.season,
    fitType: p.fitType,
    weightGrams: p.weightGrams,
    countryOfOrigin: p.countryOfOrigin,
    brand: p.brand ? { name: p.brand.name, slug: p.brand.slug } : null,
    category: { id: p.category.id, slug: p.category.slug, name: localized(p.category, locale) },
    subcategory: p.subcategory ? { id: p.subcategory.id, slug: p.subcategory.slug, name: localized(p.subcategory, locale) } : null,
    collection: p.collection ? { id: p.collection.id, slug: p.collection.slug, name: localized(p.collection, locale) } : null,
    materials: p.materials.map((m) => ({ name: localized(m.material, locale), percentage: m.percentage })),
    labels: { isNew: p.isNewArrival, isBestSeller: p.isBestSeller, isFeatured: p.isFeatured, isOnSale: p.isOnSale },
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    images: p.images.map((i) => ({
      id: i.id,
      kind: i.kind as "IMAGE" | "VIDEO",
      url: i.url,
      thumbUrl: i.thumbUrl,
      mdUrl: i.kind === "IMAGE" ? mediaVariant(i.url, "md")! : i.url,
      colorId: i.colorId,
      alt: i.alt || `${tr?.name || p.name}`,
      view: i.view,
      width: i.width,
      height: i.height,
    })),
    colors: [...colors.values()].sort((a, b) => a.order - b.order),
    sizes: [...sizes.values()].sort((a, b) => a.order - b.order),
    variants: p.variants.map((v) => {
      const price = computePrice(p, v, promos);
      return {
        id: v.id,
        colorId: v.colorId,
        sizeId: v.sizeId,
        sku: v.sku,
        available: Math.max(0, v.available),
        price: price.final,
        basePrice: price.base,
        discountPct: price.discountPct,
        promotion: price.promotion,
      };
    }),
    basePrice: computePrice(p, null, promos),
    sizeChart: chart
      ? {
          name: localized(chart, locale),
          description: chart.description,
          unit: chart.unit,
          columns: safeJson<string[]>(chart.columns, []),
          rows: safeJson<{ size: string; values: string[] }[]>(chart.rows, []),
        }
      : null,
    reviews: p.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.user.fullName.split(" ")[0] + (r.user.fullName.split(" ")[1] ? ` ${r.user.fullName.split(" ")[1][0]}.` : ""),
      verified: r.isVerifiedPurchase,
      adminReply: r.adminReply,
      createdAt: r.createdAt.toISOString(),
      photos: r.photos.map((ph) => ({ url: ph.url, thumbUrl: ph.thumbUrl })),
    })),
    categoryId: p.categoryId,
    subcategoryId: p.subcategoryId,
    collectionId: p.collectionId,
  };
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;

export async function getRelated(p: Pick<ProductDetail, "id" | "audience" | "categoryId" | "subcategoryId" | "collectionId">, locale: string) {
  const exclude = { id: { not: p.id } };
  const [similar, sameCollection, complementary] = await Promise.all([
    getProductCards(
      { ...exclude, audience: p.audience, ...(p.subcategoryId ? { subcategoryId: p.subcategoryId } : { categoryId: p.categoryId }) },
      locale,
      { orderBy: [{ soldCount: "desc" }], take: 8 },
    ),
    p.collectionId
      ? getProductCards({ ...exclude, collectionId: p.collectionId }, locale, { orderBy: [{ soldCount: "desc" }], take: 8 })
      : Promise.resolve([]),
    getProductCards(
      { ...exclude, audience: p.audience, categoryId: p.categoryId, NOT: p.subcategoryId ? { subcategoryId: p.subcategoryId } : undefined },
      locale,
      { orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }], take: 8 },
    ),
  ]);
  return { similar, sameCollection, complementary };
}

// ─────────────── Navigation ───────────────

export async function getNavigation(locale: string) {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { subcategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  return cats.map((c) => ({
    slug: c.slug,
    name: localized(c, locale),
    audience: c.audience,
    imageUrl: c.imageUrl,
    subcategories: c.subcategories.map((s) => ({ slug: s.slug, name: localized(s, locale) })),
  }));
}
export type NavCategory = Awaited<ReturnType<typeof getNavigation>>[number];
