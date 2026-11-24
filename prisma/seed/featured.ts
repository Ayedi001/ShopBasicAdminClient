/* eslint-disable no-console */
import type { PrismaClient } from "@prisma/client";
import { rebuildSearchText } from "../../src/server/products-admin";

const TND = (n: number) => Math.round(n * 1000);

type FeaturedItem = {
  slug: string;
  sku: string;
  name: string;
  nameEn: string;
  nameAr: string;
  short: string;
  desc: string;
  descEn: string;
  descAr: string;
  cat: string;
  sub: string;
  audience: "WOMEN" | "MEN" | "KIDS";
  price: number;
  sale?: number;
  brand: string;
  season: string;
  fit: string;
  origin: string;
  care: string;
  features: string[];
  materials: [string, number][];
  colors: { slug: string; imageKey: string; detailKey?: string }[];
  sizes: { type: string; labels: string[] };
  flags: { new?: boolean; featured?: boolean; best?: boolean; sale?: boolean };
  soldCount?: number;
};

const FEATURED_ITEMS: FeaturedItem[] = [
  {
    slug: "trench-coat-ceinture-gabardine-femme",
    sku: "MN-TRN-01",
    name: "Trench-coat ceinturé en gabardine",
    nameEn: "Belted Gabardine Trench Coat",
    nameAr: "معطف ترنش بحزام من الغاباردين",
    short: "Coupe droite intemporelle, double boutonnage et ceinture ton sur ton.",
    desc: "Confectionné en gabardine de coton déperlante, ce trench-coat ceinturé structure la silhouette avec élégance. Revers crantés, pattes de serrage aux poignets et doublure fluide pour un confort parfait à la mi-saison.",
    descEn: "Crafted from water-repellent cotton gabardine, this belted trench coat delivers a refined silhouette with notch lapels, cuff tabs and a smooth lining.",
    descAr: "معطف ترنش مصنوع من قطن الغاباردين المقاوم للماء بقصة أنيقة وحزام متناسق للخصر.",
    cat: "femme",
    sub: "vestes-manteaux",
    audience: "WOMEN",
    price: 289,
    brand: "Maison Nour",
    season: "AUTUMN",
    fit: "REGULAR",
    origin: "Tunisie",
    care: "Nettoyage à sec recommandé. Repassage doux sur l'envers.",
    features: ["Double boutonnage corne", "Ceinture amovible à boucle", "Poches passepoilées", "Doublure satinée"],
    materials: [["Coton", 68], ["Polyester", 32]],
    colors: [
      { slug: "beige", imageKey: "women-trench-beige", detailKey: "women-trench-detail" },
      { slug: "noir", imageKey: "women-trench-noir" },
    ],
    sizes: { type: "CLOTHING", labels: ["XS", "S", "M", "L", "XL"] },
    flags: { new: true, featured: true, best: true },
    soldCount: 28,
  },
  {
    slug: "robe-midi-plissee-satin-femme",
    sku: "MN-RBS-02",
    name: "Robe midi plissée en satin",
    nameEn: "Pleated Satin Midi Dress",
    nameAr: "فستان ميدي بليسيه من الساتان",
    short: "Satin fluide au tombé lumineux, taille marquée et plissé soleil.",
    desc: "Une robe midi en satin soyeux qui capte subtilement la lumière. Sa taille légèrement cintrée et sa jupe plissée offrent un mouvement aérien, idéale pour les réceptions, dîners et cérémonies.",
    descEn: "A luminous pleated satin midi dress with a softly defined waist and fluid drape, crafted for evenings and special occasions.",
    descAr: "فستان ميدي من الساتان الناعم بكسرات انسيابية وقصة أنيقة للمناسبات والسهرات.",
    cat: "femme",
    sub: "robes",
    audience: "WOMEN",
    price: 195,
    brand: "Maison Nour",
    season: "ALL",
    fit: "REGULAR",
    origin: "Tunisie",
    care: "Lavage délicat à 30°C ou nettoyage à sec.",
    features: ["Plissé soleil permanent", "Fermeture zippée invisible au dos", "Encolure fluide", "Tombé satiné"],
    materials: [["Viscose", 60], ["Polyester", 40]],
    colors: [
      { slug: "beige", imageKey: "women-satin-beige", detailKey: "women-satin-detail" },
      { slug: "bordeaux", imageKey: "women-satin-bordeaux" },
    ],
    sizes: { type: "CLOTHING", labels: ["XS", "S", "M", "L"] },
    flags: { new: true, featured: true, best: true },
    soldCount: 24,
  },
  {
    slug: "blouson-daim-tabac-homme",
    sku: "MN-BLS-03",
    name: "Blouson en daim tabac",
    nameEn: "Tobacco Suede Jacket",
    nameAr: "سترة جلد السويد بلون التبغ",
    short: "Velours souple, col chemise structuré et zip métallique brossé.",
    desc: "Pièce phare du vestiaire masculin, ce blouson en daim souple associe une coupe nette à des finitions soignées : zip métal brossé, poches latérales discrètes et doublure respirante.",
    descEn: "A signature menswear jacket in supple tobacco suede featuring a structured collar, brushed metal zip and breathable lining.",
    descAr: "سترة رجالية فاخرة من جلد السويد الناعم بقصة عصرية وسحاب معدني.",
    cat: "homme",
    sub: "vestes-manteaux",
    audience: "MEN",
    price: 349,
    brand: "Maison Nour",
    season: "AUTUMN",
    fit: "REGULAR",
    origin: "Tunisie",
    care: "Brossage doux à sec. Imperméabiliser avant le premier port.",
    features: ["Daim velours souple", "Zip métallique brossé", "Deux poches intérieures", "Poignets boutonnés"],
    materials: [["Cuir", 100]],
    colors: [
      { slug: "marron", imageKey: "men-suede-marron", detailKey: "men-suede-detail" },
      { slug: "noir", imageKey: "men-suede-noir" },
    ],
    sizes: { type: "CLOTHING", labels: ["S", "M", "L", "XL", "XXL"] },
    flags: { new: true, featured: true, best: true },
    soldCount: 31,
  },
  {
    slug: "pull-col-roule-merinos-fin-homme",
    sku: "MN-PMR-04",
    name: "Pull col roulé mérinos fin",
    nameEn: "Fine Merino Turtleneck Sweater",
    nameAr: "كنزة بياقة عالية من صوف الميرينو",
    short: "Maille fine 100 % laine mérinos, douce et thermorégulatrice.",
    desc: "Tricoté en fine laine mérinos extra-douce, ce pull col roulé se porte aussi bien seul qu'en superposition sous un manteau ou un blazer. Finitions bord-côtes impeccables.",
    descEn: "Knitted from extra-fine merino wool, this turtleneck layers effortlessly under tailoring or outerwear with crisp ribbed trims.",
    descAr: "كنزة محبوكة من صوف الميرينو الناعم بياقة عالية مثالية للأيام الباردة.",
    cat: "homme",
    sub: "pulls",
    audience: "MEN",
    price: 135,
    brand: "Maison Nour",
    season: "WINTER",
    fit: "SLIM",
    origin: "Tunisie",
    care: "Lavage programme laine à froid. Séchage à plat.",
    features: ["100 % laine mérinos fine", "Col roulé confortable", "Finitions bord-côtes", "Ne gratte pas"],
    materials: [["Laine", 100]],
    colors: [
      { slug: "bleu-marine", imageKey: "men-turtleneck-marine", detailKey: "men-turtleneck-detail" },
      { slug: "gris", imageKey: "men-turtleneck-gris" },
    ],
    sizes: { type: "CLOTHING", labels: ["S", "M", "L", "XL"] },
    flags: { new: true, featured: true, best: true },
    soldCount: 26,
  },
  {
    slug: "trench-court-intersaison-kaki-femme",
    sku: "MN-TRK-05",
    name: "Trench court d'intersaison",
    nameEn: "Cropped Transitional Trench",
    nameAr: "معطف ترنش قصير للموسم الانتقالي",
    short: "Version moderne et légère du trench classique, prix spécial lancement.",
    desc: "Une coupe légèrement raccourcie qui dynamise toutes vos tenues du quotidien. Toile de coton structurée, ceinture nouée et détails soignés.",
    descEn: "A modern cropped take on the classic trench in structured cotton twill with a tie belt.",
    descAr: "تصميم عصري قصير لمعطف الترنش الكلاسيكي بقماش قطني مريح.",
    cat: "femme",
    sub: "vestes-manteaux",
    audience: "WOMEN",
    price: 239,
    sale: 179,
    brand: "Maison Nour",
    season: "SPRING",
    fit: "REGULAR",
    origin: "Tunisie",
    care: "Lavage délicat à 30°C.",
    features: ["Coupe moderne", "Coton déperlant", "Ceinture à nouer", "Poches latérales"],
    materials: [["Coton", 75], ["Polyester", 25]],
    colors: [
      { slug: "kaki", imageKey: "women-trench-kaki", detailKey: "women-trench-detail" },
      { slug: "beige", imageKey: "women-trench-beige" },
    ],
    sizes: { type: "CLOTHING", labels: ["XS", "S", "M", "L"] },
    flags: { sale: true, featured: true },
    soldCount: 15,
  },
  {
    slug: "costume-croise-laine-vierge-homme",
    sku: "MN-CST-06",
    name: "Costume ajusté en laine vierge",
    nameEn: "Tailored Virgin Wool Suit",
    nameAr: "بدلة رسمية من الصوف الطبيعي",
    short: "Veste structurée deux boutons et pantalon à plis assortis.",
    desc: "Taillé dans une laine vierge respirante au tombé impeccable, ce costume bleu nuit offre une élégance moderne pour les événements professionnels comme les cérémonies.",
    descEn: "Tailored from breathable virgin wool, this midnight-navy two-piece suit brings sharp elegance to business and formal occasions.",
    descAr: "بدلة رسمية مفصلة من الصوف الفاخر بلون أزرق داكن تناسب المناسبات والعمل.",
    cat: "homme",
    sub: "costumes",
    audience: "MEN",
    price: 540,
    sale: 419,
    brand: "Maison Nour",
    season: "ALL",
    fit: "SLIM",
    origin: "Tunisie",
    care: "Nettoyage à sec uniquement.",
    features: ["Laine vierge respirante", "Veste semi-entoilée", "Pantalon coupe ajustée", "Doublure viscose"],
    materials: [["Laine", 96], ["Élasthanne", 4]],
    colors: [
      { slug: "bleu-marine", imageKey: "men-suit-marine", detailKey: "men-suit-detail" },
      { slug: "gris", imageKey: "men-suit-gris" },
    ],
    sizes: { type: "CLOTHING", labels: ["S", "M", "L", "XL", "XXL"] },
    flags: { sale: true, featured: true },
    soldCount: 19,
  },
  {
    slug: "doudoune-matelassee-urbaine-homme",
    sku: "MN-DDU-07",
    name: "Doudoune matelassée urbaine",
    nameEn: "Urban Quilted Puffer Jacket",
    nameAr: "سترة شتوية مبطنة عصرية",
    short: "Garnissage ultra-léger, fini mat et col montant coupe-vent.",
    desc: "Pensée pour affronter le froid avec style sans alourdir la silhouette. Tissu déperlant au fini mat, poches zippées doublées polaire et col montant protecteur.",
    descEn: "Engineered for lightweight warmth with a matte water-repellent shell, high stand collar and zip pockets.",
    descAr: "سترة شتوية خفيفة ودافئة بتصميم عصري مقاوم للرياح والماء.",
    cat: "homme",
    sub: "vestes-manteaux",
    audience: "MEN",
    price: 229,
    sale: 169,
    brand: "Maison Nour",
    season: "WINTER",
    fit: "REGULAR",
    origin: "Tunisie",
    care: "Lavage machine à 30°C cycle doux.",
    features: ["Ultra-légère et chaude", "Tissu déperlant mat", "Poches zippées", "Col montant"],
    materials: [["Polyester", 100]],
    colors: [
      { slug: "noir", imageKey: "men-puffer-noir", detailKey: "men-puffer-detail" },
      { slug: "bleu-marine", imageKey: "men-puffer-marine" },
    ],
    sizes: { type: "CLOTHING", labels: ["S", "M", "L", "XL"] },
    flags: { sale: true, best: true },
    soldCount: 22,
  },
  {
    slug: "robe-soiree-satinee-bordeaux-femme",
    sku: "MN-RSB-08",
    name: "Robe de soirée satinée",
    nameEn: "Evening Satin Gown",
    nameAr: "فستان سهرة من الساتان الفاخر",
    short: "Teinte profonde et tombé fluide pour vos grandes occasions.",
    desc: "Une silhouette élégante à la finition satinée lumineuse, pensée pour sublimer vos soirées. Doublure douce et coupe confortable toute la nuit.",
    descEn: "An elegant evening silhouette in rich luminous satin with a comfortable lined fit.",
    descAr: "فستان سهرة أنيق من الساتان اللامع بقصة مريحة وانسيابية.",
    cat: "femme",
    sub: "robes",
    audience: "WOMEN",
    price: 249,
    sale: 185,
    brand: "Maison Nour",
    season: "ALL",
    fit: "REGULAR",
    origin: "Tunisie",
    care: "Nettoyage à sec recommandé.",
    features: ["Satin lumineux", "Plissé délicat", "Doublure respirante", "Fermeture invisible"],
    materials: [["Polyester", 70], ["Viscose", 30]],
    colors: [
      { slug: "bordeaux", imageKey: "women-satin-bordeaux", detailKey: "women-satin-detail" },
      { slug: "beige", imageKey: "women-satin-beige" },
    ],
    sizes: { type: "CLOTHING", labels: ["XS", "S", "M", "L"] },
    flags: { sale: true, featured: true },
    soldCount: 17,
  },
];

const UPGRADE_EXISTING: { slug: string; imageKey: string; detailKey?: string }[] = [
  { slug: "doudoune-legere-homme", imageKey: "men-puffer-noir", detailKey: "men-puffer-detail" },
  { slug: "costume-deux-pieces-homme", imageKey: "men-suit-marine", detailKey: "men-suit-detail" },
  { slug: "manteau-en-laine-homme", imageKey: "editorial-men-main" },
  { slug: "robe-midi-fleurie-femme", imageKey: "editorial-women-main" },
  { slug: "doudoune-enfant-enfant", imageKey: "editorial-kids-main" },
];

function staticImageData(key: string) {
  return {
    storageKey: `public/images/products/${key}`,
    url: `/images/products/${key}-lg.webp`,
    thumbUrl: `/images/products/${key}-sm.webp`,
    width: 960,
    height: 1280,
  };
}

/**
 * Idempotently seeds the 8 flagship products and attaches permanent static
 * studio WebP photos (/images/products/*) in Prisma so they work on both
 * local SQLite and Vercel PostgreSQL.
 */
export async function seedFeaturedCatalog(prisma: PrismaClient) {
  for (const [idx, item] of FEATURED_ITEMS.entries()) {
    const colors = await prisma.color.findMany({ where: { slug: { in: item.colors.map((c) => c.slug) } } });
    const colorBySlug = new Map(colors.map((c) => [c.slug, c]));

    let product = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (!product) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.cat } });
      const sub = await prisma.subcategory.findUniqueOrThrow({ where: { categoryId_slug: { categoryId: category.id, slug: item.sub } } });
      const brand = await prisma.brand.upsert({ where: { slug: "maison-nour" }, create: { name: item.brand, slug: "maison-nour" }, update: {} });
      const sizes = await prisma.size.findMany({ where: { type: item.sizes.type, label: { in: item.sizes.labels } } });
      const sizeByLabel = new Map(sizes.map((s) => [s.label, s]));

      const matRecords = [];
      for (const [mName, pct] of item.materials) {
        const m = await prisma.material.upsert({ where: { name: mName }, create: { name: mName, nameEn: mName, nameAr: mName }, update: {} });
        matRecords.push({ materialId: m.id, percentage: pct });
      }

      const publishedAt = new Date(Date.now() - idx * 3600_000);
      product = await prisma.product.create({
        data: {
          slug: item.slug,
          sku: item.sku,
          name: item.name,
          shortDescription: item.short,
          description: item.desc,
          audience: item.audience,
          categoryId: category.id,
          subcategoryId: sub.id,
          brandId: brand.id,
          season: item.season,
          fitType: item.fit,
          careInstructions: item.care,
          countryOfOrigin: item.origin,
          characteristics: item.features.join("\n"),
          price: TND(item.price),
          salePrice: item.sale ? TND(item.sale) : null,
          status: "PUBLISHED",
          isFeatured: !!item.flags.featured,
          isNewArrival: !!item.flags.new,
          isBestSeller: !!item.flags.best,
          isOnSale: !!item.flags.sale,
          soldCount: item.soldCount ?? 0,
          publishedAt,
          createdAt: publishedAt,
          metaDescription: item.short,
          translations: {
            create: [
              { locale: "en", name: item.nameEn, description: item.descEn },
              { locale: "ar", name: item.nameAr, description: item.descAr },
            ],
          },
          materials: { create: matRecords },
        },
      });

      let vOrder = 0;
      for (const c of item.colors) {
        const color = colorBySlug.get(c.slug);
        if (!color) continue;
        for (const sLabel of item.sizes.labels) {
          const size = sizeByLabel.get(sLabel);
          if (!size) continue;
          const stock = 8 + ((idx + vOrder) % 7);
          const variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              colorId: color.id,
              sizeId: size.id,
              variantKey: `${color.id}:${size.id}`,
              sku: `${item.sku}-${c.slug.slice(0, 2).toUpperCase()}-${sLabel}`,
              stock,
              available: stock,
              sortOrder: vOrder++,
            },
          });
          await prisma.stockMovement.create({
            data: { variantId: variant.id, delta: stock, type: "INITIAL", reason: "Stock initial", stockBefore: 0, stockAfter: stock, userName: "Système" },
          });
        }
      }
      await rebuildSearchText(product.id);
    }

    // Ensure product uses the permanent static WebP studio images
    const existingStatic = await prisma.productImage.count({
      where: { productId: product.id, url: { startsWith: "/images/products/" } },
    });
    if (existingStatic === 0) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      let imgSort = 0;
      for (let ci = 0; ci < item.colors.length; ci++) {
        const c = item.colors[ci];
        const color = colorBySlug.get(c.slug);
        if (!color) continue;
        await prisma.productImage.create({
          data: {
            productId: product.id,
            colorId: color.id,
            kind: "IMAGE",
            view: "FRONT",
            ...staticImageData(c.imageKey),
            alt: `${item.name} — ${color.name}`,
            isMain: ci === 0,
            sortOrder: imgSort++,
          },
        });
        if (c.detailKey) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              colorId: color.id,
              kind: "IMAGE",
              view: "DETAIL",
              ...staticImageData(c.detailKey),
              alt: `${item.name} — détail matière`,
              isMain: false,
              sortOrder: imgSort++,
            },
          });
        }
      }
    }
  }

  // Upgrade existing flagship products with permanent static studio images
  for (const up of UPGRADE_EXISTING) {
    const product = await prisma.product.findUnique({ where: { slug: up.slug }, include: { images: { orderBy: { sortOrder: "asc" } } } });
    if (!product) continue;
    const already = product.images.some((i) => i.url.startsWith("/images/products/"));
    if (already) continue;
    await prisma.productImage.updateMany({ where: { productId: product.id }, data: { isMain: false } });
    const firstColorId = product.images[0]?.colorId ?? null;
    await prisma.productImage.create({
      data: {
        productId: product.id,
        colorId: firstColorId,
        kind: "IMAGE",
        view: "FRONT",
        ...staticImageData(up.imageKey),
        alt: `${product.name} — studio`,
        isMain: true,
        sortOrder: -2,
      },
    });
    if (up.detailKey) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          colorId: firstColorId,
          kind: "IMAGE",
          view: "DETAIL",
          ...staticImageData(up.detailKey),
          alt: `${product.name} — détail`,
          isMain: false,
          sortOrder: -1,
        },
      });
    }
  }
}
