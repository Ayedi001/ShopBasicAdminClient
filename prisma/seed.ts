/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COLLECTIONS, COLORS, CATEGORIES, MATERIALS, PRODUCTS, REGIONS, SIZES, SIZE_CHARTS, type SeedProduct } from "./seed/data";
import { PAGES } from "./seed/content";
import { renderGarment } from "./seed/garments";
import { saveImage } from "../src/server/media";
import { slugify } from "../src/lib/utils";
import { recomputeAllPricing } from "../src/server/pricing";
import { rebuildSearchText } from "../src/server/products-admin";

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";
const DEMO = (process.env.SEED_DEMO_DATA ?? "true") === "true";
const ASSETS = path.join(__dirname, "seed-assets");
const TND = (n: number) => Math.round(n * 1000);

// deterministic pseudo-random generator so the demo data is reproducible
let rngState = 42;
const rnd = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

async function uploadAsset(file: string, folder: "banners" | "categories" | "collections") {
  const buf = await fs.readFile(path.join(ASSETS, file));
  return saveImage(buf, folder);
}

async function seedSettings() {
  const defaults: Record<string, unknown> = {
    store: {
      name: "Maison Nour",
      tagline: "Prêt-à-porter femme, homme et enfant",
      primaryColor: "#141414",
      accentColor: "#9a6b4b",
      phone: "+21671000000",
      whatsapp: "+21698000000",
      email: "contact@maisonnour.tn",
      address: "12 avenue Habib Bourguiba, 1001 Tunis",
      mapUrl: "",
      openingHours: "Lundi – Samedi : 9h00 – 19h00",
      social: { facebook: "https://facebook.com/", instagram: "https://instagram.com/", tiktok: "https://tiktok.com/", youtube: "" },
    },
    general: {
      defaultLocale: "fr",
      enabledLocales: ["fr", "ar", "en"],
      defaultCurrency: "TND",
      returnPolicySummary: "Retour sous 14 jours, échange de taille sous 30 jours.",
      exchangePolicySummary: "Échange de taille gratuit sous 30 jours, selon disponibilité.",
      lowStockThreshold: 3,
    },
    delivery: {
      freeShippingThreshold: TND(150),
      pickupEnabled: true,
      pickupAddress: "12 avenue Habib Bourguiba, 1001 Tunis",
      pickupHours: "Lundi – Samedi, 10h – 19h",
      estimatedDelivery: "24 à 72 heures",
      deliveryInstructions: "Les commandes sont confirmées par téléphone puis remises à notre partenaire de livraison.",
      paymentNote: "Paiement à la livraison (espèces).",
    },
  };
  for (const [key, value] of Object.entries(defaults)) {
    const exists = await prisma.setting.findUnique({ where: { key } });
    if (!exists) await prisma.setting.create({ data: { key, value: JSON.stringify(value) } });
  }
}

async function seedReference() {
  for (const [i, [name, nameAr, fee]] of REGIONS.entries()) {
    await prisma.deliveryRegion.upsert({
      where: { name },
      create: { name, nameAr, fee: TND(fee), estimatedDays: fee <= 7 ? "24 h" : fee <= 8 ? "24 à 48 h" : "48 à 72 h", sortOrder: i },
      update: {},
    });
  }
  for (const [i, c] of COLORS.entries()) {
    await prisma.color.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: {} });
  }
  for (const group of SIZES) {
    for (const [i, label] of group.labels.entries()) {
      await prisma.size.upsert({ where: { type_label: { type: group.type, label } }, create: { type: group.type, label, sortOrder: i }, update: {} });
    }
  }
  for (const [name, nameAr, nameEn] of MATERIALS) {
    await prisma.material.upsert({ where: { name }, create: { name, nameAr, nameEn }, update: {} });
  }
  const charts: Record<string, string> = {};
  for (const sc of SIZE_CHARTS) {
    const existing = await prisma.sizeChart.findFirst({ where: { name: sc.name } });
    const chart =
      existing ??
      (await prisma.sizeChart.create({
        data: { name: sc.name, nameEn: sc.nameEn, nameAr: sc.nameAr, unit: "cm", columns: JSON.stringify(sc.columns), rows: JSON.stringify(sc.rows) },
      }));
    charts[sc.key] = chart.id;
  }
  for (const [ci, c] of CATEGORIES.entries()) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    const image = existing?.imageUrl ? null : await uploadAsset(c.image, "categories");
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, nameAr: c.nameAr, nameEn: c.nameEn, audience: c.audience, sortOrder: ci, imageUrl: image?.url },
      update: {},
    });
    for (const [si, s] of c.subs.entries()) {
      const chartKey =
        s.sizeType === "SHOES" ? "shoes" : c.slug === "enfant" ? "kids" : c.slug === "homme" ? (s.slug.includes("pantalon") || s.slug === "shorts" ? "men-bottoms" : "men-tops") : s.slug === "robes" || s.slug === "jupes" ? "women-dresses" : s.slug.includes("pantalon") || s.slug === "shorts" ? "women-bottoms" : "women-tops";
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: cat.id, slug: s.slug } },
        create: {
          categoryId: cat.id,
          slug: s.slug,
          name: s.name,
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          productType: s.productType,
          sizeType: s.sizeType ?? "CLOTHING",
          sortOrder: si,
          sizeChartId: s.sizeType === "ONE_SIZE" ? null : charts[chartKey],
        },
        update: {},
      });
    }
  }
  for (const [slug, locales] of Object.entries(PAGES)) {
    for (const [locale, page] of Object.entries(locales)) {
      await prisma.contentPage.upsert({ where: { slug_locale: { slug, locale } }, create: { slug, locale, ...page }, update: {} });
    }
  }
  if ((await prisma.homeSection.count()) === 0) {
    const sections = [
      { type: "HERO" },
      { type: "CATEGORY_TILES", title: "Univers", titleEn: "Shop by department", titleAr: "الأقسام" },
      { type: "NEW_ARRIVALS", title: "Nouveautés", titleEn: "New in", titleAr: "وصل حديثًا", subtitle: "Les dernières pièces arrivées en boutique", subtitleEn: "The latest arrivals", subtitleAr: "أحدث القطع", config: { limit: 8 } },
      { type: "COLLECTIONS", title: "Collections de saison", titleEn: "Seasonal collections", titleAr: "مجموعات الموسم" },
      { type: "BEST_SELLERS", title: "Meilleures ventes", titleEn: "Best sellers", titleAr: "الأكثر مبيعًا", subtitle: "Les pièces préférées de nos clients", subtitleEn: "Our customers' favourites", subtitleAr: "القطع المفضلة لدى عملائنا", config: { limit: 8 } },
      { type: "PROMO_TEXT", title: "Livraison offerte dès 150 DT", titleEn: "Free delivery from 150 DT", titleAr: "توصيل مجاني ابتداءً من 150 د.ت", subtitle: "Paiement à la livraison partout en Tunisie — échange de taille sous 30 jours.", subtitleEn: "Cash on delivery across Tunisia — size exchange within 30 days.", subtitleAr: "الدفع عند الاستلام في كامل تونس — استبدال المقاس خلال 30 يومًا.", config: { link: "/pages/shipping", cta: "En savoir plus" } },
      { type: "ON_SALE", title: "Offres spéciales", titleEn: "Special offers", titleAr: "عروض خاصة", subtitle: "Prix réduits pour une durée limitée", subtitleEn: "Reduced prices for a limited time", subtitleAr: "أسعار مخفضة لفترة محدودة", config: { limit: 8 } },
      { type: "FEATURED", title: "Notre sélection", titleEn: "Editor's picks", titleAr: "اختياراتنا", config: { limit: 8 } },
      { type: "RECENTLY_VIEWED", title: "Vus récemment", titleEn: "Recently viewed", titleAr: "شوهدت مؤخرًا" },
    ];
    for (const [i, s] of sections.entries()) {
      const { config, ...rest } = s as typeof s & { config?: object };
      await prisma.homeSection.create({ data: { ...rest, sortOrder: i * 10, config: JSON.stringify(config ?? {}) } });
    }
  }
  return charts;
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if ((await prisma.user.count({ where: { role: "OWNER" } })) > 0) return;
  if (!email || !password) {
    console.log("ℹ No owner account created (set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD or run `npm run admin:create`).");
    return;
  }
  if (isProd && (password === "ChangeMe-Dev-2026!" || password.length < 12)) {
    throw new Error("Refusing to create a production owner with the example/weak password. Use `npm run admin:create`.");
  }
  await prisma.user.create({
    data: { email, phone: "+21670000001", fullName: "Propriétaire", role: "OWNER", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✔ Owner account created: ${email}`);
}

function sizeCode(label: string) {
  return label.replace(" ans", "A").replace(" mois", "M").replace(" cm", "").replace(/\s+/g, "");
}
function colorCode(slug: string) {
  if (slug === "noir") return "B";
  if (slug === "beige") return "BG";
  return slug
    .split("-")
    .map((p) => p.slice(0, 2))
    .join("")
    .toUpperCase();
}

async function seedProduct(p: SeedProduct, index: number, charts: Record<string, string>, collections: Record<string, string>) {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.cat } });
  const sub = await prisma.subcategory.findUniqueOrThrow({ where: { categoryId_slug: { categoryId: category.id, slug: p.sub } } });
  const brand = p.brand ? await prisma.brand.upsert({ where: { slug: slugify(p.brand) }, create: { name: p.brand, slug: slugify(p.brand) }, update: {} }) : null;
  const colors = await prisma.color.findMany({ where: { slug: { in: p.colors } } });
  const colorBySlug = new Map(colors.map((c) => [c.slug, c]));
  const sizes = p.sizes ? await prisma.size.findMany({ where: { type: p.sizes.type, label: { in: p.sizes.labels } } }) : [];
  const sizeByLabel = new Map(sizes.map((s) => [s.label, s]));
  const materials = await prisma.material.findMany({ where: { name: { in: p.materials.map((m) => m[0]) } } });
  const daysAgo = Math.floor(index * 1.7) % 75;

  const product = await prisma.product.create({
    data: {
      slug: slugify(`${p.name}-${p.audience === "BABY" ? "bebe" : p.cat}`),
      sku: p.sku,
      name: p.name,
      shortDescription: p.short,
      description: p.desc,
      audience: p.audience ?? category.audience,
      categoryId: category.id,
      subcategoryId: sub.id,
      brandId: brand?.id,
      collectionId: p.collection ? collections[p.collection] : null,
      season: p.season ?? "ALL",
      fitType: p.fit ?? null,
      weightGrams: p.weight ?? null,
      careInstructions: p.care,
      countryOfOrigin: p.origin,
      characteristics: (p.features ?? []).join("\n") || null,
      price: TND(p.price),
      salePrice: p.sale ? TND(p.sale) : null,
      status: "PUBLISHED",
      isFeatured: !!p.flags?.featured,
      isNewArrival: !!p.flags?.new,
      isBestSeller: !!p.flags?.best,
      isOnSale: !!p.flags?.sale,
      sizeChartId: p.sizeChart ? charts[p.sizeChart] : null,
      publishedAt: new Date(Date.now() - daysAgo * 86400_000),
      createdAt: new Date(Date.now() - daysAgo * 86400_000),
      metaDescription: p.short,
      translations: {
        create: [
          { locale: "en", name: p.nameEn, shortDescription: null, description: p.descEn },
          { locale: "ar", name: p.nameAr, shortDescription: null, description: p.descAr },
        ],
      },
      materials: { create: p.materials.map(([name, percentage]) => ({ materialId: materials.find((m) => m.name === name)!.id, percentage })) },
    },
  });

  // Variants (each colour × size has its own stock; explicit map when provided)
  const combos: { color: string | null; size: string | null; stock: number }[] = [];
  const colorList = p.colors.length ? p.colors : [null];
  const sizeList = p.sizes ? p.sizes.labels : [null];
  for (const c of colorList) {
    for (const s of sizeList) {
      const key = `${c}:${s}`;
      if (p.stock) {
        if (key in p.stock) combos.push({ color: c, size: s, stock: p.stock[key] });
        continue;
      }
      const r = rnd();
      combos.push({ color: c, size: s, stock: r < 0.12 ? 0 : r < 0.25 ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 14) });
    }
  }
  for (const [i, combo] of combos.entries()) {
    const color = combo.color ? colorBySlug.get(combo.color)! : null;
    const size = combo.size ? sizeByLabel.get(combo.size)! : null;
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        colorId: color?.id ?? null,
        sizeId: size?.id ?? null,
        variantKey: `${color?.id ?? "-"}:${size?.id ?? "-"}`,
        sku: p.sku ? [p.sku, combo.color ? colorCode(combo.color) : null, combo.size ? sizeCode(combo.size) : null].filter(Boolean).join("-") : null,
        price: combo.color && p.colorPrices?.[combo.color] ? TND(p.colorPrices[combo.color]) : null,
        stock: combo.stock,
        available: combo.stock,
        sortOrder: i,
      },
    });
    if (combo.stock > 0) {
      await prisma.stockMovement.create({
        data: { variantId: variant.id, delta: combo.stock, type: "INITIAL", reason: "Stock initial (import)", stockBefore: 0, stockAfter: combo.stock, userName: "Système" },
      });
    }
  }

  // Images: front + back per colour, plus a detail shot for the first colour
  let sort = 0;
  for (const [ci, slug] of p.colors.entries()) {
    const color = colorBySlug.get(slug)!;
    const views: ("FRONT" | "BACK" | "DETAIL")[] = ci === 0 ? ["FRONT", "BACK", "DETAIL"] : ["FRONT", "BACK"];
    for (const view of views) {
      const png = await sharp(Buffer.from(renderGarment(p.shape, color.hex, view, index))).png().toBuffer();
      const media = await saveImage(png, "products", product.id);
      await prisma.productImage.create({
        data: {
          productId: product.id,
          colorId: color.id,
          kind: "IMAGE",
          view,
          storageKey: media.storageKey,
          url: media.url,
          thumbUrl: media.thumbUrl,
          width: media.width,
          height: media.height,
          alt: `${p.name} — ${color.name} (${view === "FRONT" ? "face" : view === "BACK" ? "dos" : "détail"})`,
          isMain: ci === 0 && view === "FRONT",
          sortOrder: sort++,
        },
      });
    }
  }
  await rebuildSearchText(product.id);
  return product;
}

type DemoCustomer = { id: string; fullName: string; phone: string; email: string; city: string; region: string; address: string };

async function seedDemo(charts: Record<string, string>) {
  // Collections
  const collections: Record<string, string> = {};
  for (const [i, c] of COLLECTIONS.entries()) {
    const img = await uploadAsset(c.image, "collections");
    const col = await prisma.collection.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, nameAr: c.nameAr, nameEn: c.nameEn, season: c.season, isFeatured: c.isFeatured, description: c.description, imageUrl: img.url, sortOrder: i },
      update: {},
    });
    collections[c.slug] = col.id;
  }

  // Banners
  const heroW = await uploadAsset("hero-women.jpg", "banners");
  const heroM = await uploadAsset("hero-men.jpg", "banners");
  const heroK = await uploadAsset("hero-kids.jpg", "banners");
  const evening = await uploadAsset("collection-evening.jpg", "banners");
  await prisma.banner.createMany({
    data: [
      { placement: "HERO", title: "La saison des belles matières", titleEn: "The season of beautiful fabrics", titleAr: "موسم الخامات الجميلة", subtitle: "Laine, cachemire et tons chauds — la nouvelle collection Hiver 2026 est arrivée.", subtitleEn: "Wool, soft knits and warm tones — the new Winter 2026 collection is here.", subtitleAr: "صوف وألوان دافئة — وصلت مجموعة شتاء 2026.", ctaLabel: "Découvrir la collection", ctaLabelEn: "Discover the collection", ctaLabelAr: "اكتشف المجموعة", linkUrl: "/collections/hiver-2026", imageUrl: heroW.url, sortOrder: 0 },
      { placement: "HERO", title: "L'élégance au masculin", titleEn: "Menswear, refined", titleAr: "أناقة رجالية", subtitle: "Manteaux, mailles mérinos et chinos : les essentiels de l'homme moderne.", subtitleEn: "Coats, merino knits and chinos: the modern man's essentials.", subtitleAr: "معاطف وكنزات ميرينو: أساسيات الرجل العصري.", ctaLabel: "Shopper Homme", ctaLabelEn: "Shop men", ctaLabelAr: "تسوّق للرجال", linkUrl: "/c/homme", imageUrl: heroM.url, sortOrder: 1 },
      { placement: "HERO", title: "Prêts pour l'hiver", titleEn: "Ready for winter", titleAr: "جاهزون للشتاء", subtitle: "Doudounes, bonnets et baskets colorés pour les enfants qui bougent.", subtitleEn: "Puffers, beanies and colourful sneakers for active kids.", subtitleAr: "سترات منفوخة وقبعات وأحذية ملونة للأطفال.", ctaLabel: "Shopper Enfant", ctaLabelEn: "Shop kids", ctaLabelAr: "تسوّق للأطفال", linkUrl: "/c/enfant", imageUrl: heroK.url, sortOrder: 2 },
      { placement: "PROMO", title: "Fêtes & Soirées", titleEn: "Party season", titleAr: "حفلات وسهرات", subtitle: "Satin, tailleurs et escarpins pour briller en fin d'année.", subtitleEn: "Satin, tailoring and heels to shine this season.", subtitleAr: "ساتان وأحذية أنيقة لنهاية السنة.", ctaLabel: "Voir la sélection", ctaLabelEn: "Shop the edit", ctaLabelAr: "شاهد التشكيلة", linkUrl: "/collections/fetes-soirees", imageUrl: evening.url, sortOrder: 0 },
    ],
  });

  // Products
  console.log(`… generating ${PRODUCTS.length} products with images (this takes a minute)`);
  for (const [i, p] of PRODUCTS.entries()) {
    await seedProduct(p, i, charts, collections);
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${PRODUCTS.length}`);
  }

  // Promotions & coupons
  const now = Date.now();
  const hoodieSubs = await prisma.subcategory.findMany({ where: { slug: { in: ["sweats-hoodies", "hoodies-pulls"] } } });
  await prisma.promotion.create({
    data: {
      name: "Mi-saison : -15 % sur les sweats et pulls",
      type: "PERCENT",
      value: 15,
      scope: "SUBCATEGORIES",
      startsAt: new Date(now - 10 * 86400_000),
      endsAt: new Date(now + 25 * 86400_000),
      subcategories: { create: hoodieSubs.map((s) => ({ subcategoryId: s.id })) },
    },
  });
  const nextFriday = new Date(now + 7 * 86400_000);
  await prisma.promotion.create({
    data: {
      name: "Black Friday : -25 % sur tout le site",
      description: "Campagne planifiée — démarre automatiquement à la date prévue.",
      type: "PERCENT",
      value: 25,
      scope: "ALL",
      startsAt: nextFriday,
      endsAt: new Date(nextFriday.getTime() + 3 * 86400_000),
    },
  });
  const summerProducts = await prisma.product.findMany({ where: { collection: { slug: "ete-2026" } }, select: { id: true } });
  await prisma.coupon.create({ data: { code: "WELCOME10", description: "10 % de bienvenue sur votre première commande", type: "PERCENT", value: 10, maxUsesPerUser: 1 } });
  await prisma.coupon.create({
    data: {
      code: "SUMMER20",
      description: "20 % sur la collection Été",
      type: "PERCENT",
      value: 20,
      scope: "PRODUCTS",
      maxUses: 200,
      maxUsesPerUser: 1,
      expiresAt: new Date(now + 300 * 86400_000),
      products: { create: summerProducts.map((p) => ({ productId: p.id })) },
    },
  });
  await prisma.coupon.create({ data: { code: "AUTOMNE15", description: "Exemple de coupon expiré", type: "PERCENT", value: 15, expiresAt: new Date(now - 5 * 86400_000) } });
  await prisma.coupon.create({ data: { code: "FIDELE20", description: "20 DT dès 200 DT d'achat", type: "FIXED", value: TND(20), minOrderAmount: TND(200), maxUses: 100 } });

  // Demo staff & customers (development only)
  if (!isProd) {
    const staff = [
      { email: "manager@example.com", phone: "+21670000002", fullName: "Sami Manager", role: "MANAGER", password: "Manager-Dev-2026!" },
      { email: "employe@example.com", phone: "+21670000003", fullName: "Amira Employée", role: "EMPLOYEE", password: "Employe-Dev-2026!" },
    ];
    for (const s of staff) {
      await prisma.user.upsert({
        where: { email: s.email },
        create: { email: s.email, phone: s.phone, fullName: s.fullName, role: s.role, passwordHash: await bcrypt.hash(s.password, 12) },
        update: {},
      });
    }
  }
  const regions = await prisma.deliveryRegion.findMany();
  const customerSeeds = [
    { fullName: "Yasmine Ben Ali", email: "client@example.com", phone: "+21698123456", city: "La Marsa", region: "Tunis", address: "15 rue de Carthage" },
    { fullName: "Mehdi Trabelsi", email: "mehdi.t@example.com", phone: "+21622345678", city: "Sfax", region: "Sfax", address: "Route de Tunis km 4" },
    { fullName: "Ines Gharbi", email: "ines.g@example.com", phone: "+21655876543", city: "Sousse", region: "Sousse", address: "Avenue Léopold Senghor" },
    { fullName: "Karim Jaziri", email: "karim.j@example.com", phone: "+21697112233", city: "Nabeul", region: "Nabeul", address: "Rue Farhat Hached" },
    { fullName: "Salma Haddad", email: "salma.h@example.com", phone: "+21650998877", city: "Ariana", region: "Ariana", address: "Cité Ennasr 2" },
    { fullName: "Omar Chaabane", email: "omar.c@example.com", phone: "+21624556677", city: "Bizerte", region: "Bizerte", address: "Corniche de Bizerte" },
  ];
  const customers: DemoCustomer[] = [];
  const customerHash = await bcrypt.hash("Client-Dev-2026!", 12);
  for (const [i, c] of customerSeeds.entries()) {
    const region = regions.find((r) => r.name === c.region)!;
    const u = await prisma.user.create({
      data: {
        email: c.email,
        phone: c.phone,
        fullName: c.fullName,
        role: "CUSTOMER",
        passwordHash: customerHash,
        createdAt: new Date(now - (60 - i * 8) * 86400_000),
        profile: { create: { address: c.address, city: c.city, regionId: region.id } },
      },
    });
    customers.push({ id: u.id, ...c });
  }

  // Historical orders, consistent with stock (deductions/holds + movements)
  const variants = await prisma.productVariant.findMany({
    where: { available: { gte: 3 } },
    include: { product: { include: { category: true, images: { orderBy: { sortOrder: "asc" } } } }, color: true, size: true },
  });
  const plan: { status: string; daysAgo: number }[] = [
    ...Array.from({ length: 14 }, (_, i) => ({ status: "DELIVERED", daysAgo: 8 + i * 4 })),
    ...Array.from({ length: 3 }, (_, i) => ({ status: "SHIPPED", daysAgo: 2 + i })),
    ...Array.from({ length: 2 }, (_, i) => ({ status: "PREPARING", daysAgo: 1 + i })),
    ...Array.from({ length: 2 }, () => ({ status: "CONFIRMED", daysAgo: 1 })),
    ...Array.from({ length: 4 }, (_, i) => ({ status: "CANCELLED", daysAgo: 5 + i * 9 })),
    ...Array.from({ length: 3 }, (_, i) => ({ status: "PENDING", daysAgo: i === 0 ? 0 : 0 })),
  ];
  const flow = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];
  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  let seq = 0;
  for (const step of plan) {
    seq++;
    const customer = step.status === "DELIVERED" && seq <= 3 ? customers[0] : pick(customers);
    const region = regions.find((r) => r.name === customer.region)!;
    const lineCount = 1 + Math.floor(rnd() * 3);
    const chosen = new Map<string, (typeof variants)[number]>();
    while (chosen.size < lineCount) {
      const v = pick(variants);
      chosen.set(v.id, v);
    }
    const lines = [...chosen.values()].map((v) => {
      const base = v.price ?? v.product.price;
      const unit = v.price != null ? v.salePrice ?? base : v.product.salePrice ?? base;
      const qty = 1 + (rnd() < 0.2 ? 1 : 0);
      const img = v.product.images.find((i) => i.colorId === v.colorId) ?? v.product.images[0];
      return { v, base, unit, qty, img };
    });
    // skip lines whose stock got exhausted by previous demo orders
    const fresh = await prisma.productVariant.findMany({ where: { id: { in: lines.map((l) => l.v.id) } } });
    if (lines.some((l) => (fresh.find((f) => f.id === l.v.id)?.available ?? 0) < l.qty)) continue;

    const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
    const shippingFee = subtotal >= TND(150) ? 0 : region.fee;
    const createdAt = new Date(now - step.daysAgo * 86400_000 - Math.floor(rnd() * 8) * 3600_000);
    const statusIdx = flow.indexOf(step.status);
    const deducted = step.status !== "PENDING" && step.status !== "CANCELLED";
    const at = (i: number) => new Date(createdAt.getTime() + i * 20 * 3600_000);
    const number = `CMD-${createdAt.toISOString().slice(2, 10).replace(/-/g, "")}-${(10000 + seq).toString(36).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        number,
        userId: customer.id,
        status: step.status,
        stockState: deducted ? "DEDUCTED" : step.status === "PENDING" ? "HELD" : "RELEASED",
        customerName: customer.fullName,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        address: customer.address,
        city: customer.city,
        regionName: region.name,
        regionId: region.id,
        subtotal,
        discountTotal: lines.reduce((s, l) => s + (l.base - l.unit) * l.qty, 0),
        shippingFee,
        total: subtotal + shippingFee,
        locale: "fr",
        createdAt,
        confirmedAt: statusIdx >= 1 ? at(1) : null,
        shippedAt: statusIdx >= 3 ? at(3) : null,
        deliveredAt: statusIdx >= 4 ? at(4) : null,
        cancelledAt: step.status === "CANCELLED" ? at(1) : null,
        cancellationReason: step.status === "CANCELLED" ? pick(["Client injoignable après 3 appels", "Le client a changé d'avis", "Adresse incomplète"]) : null,
        deliveryCompany: statusIdx >= 3 ? pick(["Aramex Tunisie", "First Delivery", "Rapid Poste"]) : null,
        trackingNumber: statusIdx >= 3 ? `TN${Math.floor(rnd() * 1e9)}` : null,
        items: {
          create: lines.map((l) => ({
            productId: l.v.productId,
            variantId: l.v.id,
            productName: l.v.product.name,
            productSlug: l.v.product.slug,
            sku: l.v.sku,
            colorName: l.v.color?.name ?? null,
            colorHex: l.v.color?.hex ?? null,
            sizeLabel: l.v.size?.label ?? null,
            imageUrl: l.img?.thumbUrl ?? null,
            originalUnitPrice: l.base,
            unitPrice: l.unit,
            quantity: l.qty,
            lineTotal: l.unit * l.qty,
            categoryName: l.v.product.category.name,
          })),
        },
      },
    });
    const history = [{ from: null as string | null, to: "PENDING", at: createdAt, by: customer.fullName }];
    if (step.status === "CANCELLED") history.push({ from: "PENDING", to: "CANCELLED", at: at(1), by: owner?.fullName ?? "Admin" });
    else for (let i = 1; i <= statusIdx; i++) history.push({ from: flow[i - 1], to: flow[i], at: at(i), by: owner?.fullName ?? "Admin" });
    for (const h of history) {
      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: h.from, toStatus: h.to, createdAt: h.at, changedByName: h.by, changedById: h.to === "PENDING" ? customer.id : owner?.id ?? null },
      });
    }
    for (const l of lines) {
      if (deducted) {
        const v = await prisma.productVariant.update({ where: { id: l.v.id }, data: { stock: { decrement: l.qty }, available: { decrement: l.qty } } });
        await prisma.stockMovement.create({
          data: { variantId: l.v.id, delta: -l.qty, type: "ORDER_CONFIRMED", reason: "Commande confirmée", stockBefore: v.stock + l.qty, stockAfter: v.stock, orderId: order.id, userName: owner?.fullName ?? "Admin", userId: owner?.id, createdAt: at(1) },
        });
        await prisma.product.update({ where: { id: l.v.productId }, data: { soldCount: { increment: l.qty } } });
      } else if (step.status === "PENDING") {
        await prisma.productVariant.update({ where: { id: l.v.id }, data: { reserved: { increment: l.qty }, available: { decrement: l.qty } } });
      }
    }
    await prisma.notification.create({
      data: { userId: customer.id, type: `ORDER_${step.status}`, title: `Commande ${number}`, body: `Statut : ${step.status}`, link: `/account/orders/${number}`, createdAt: at(Math.max(0, statusIdx)), readAt: step.daysAgo > 5 ? at(5) : null },
    });

    // Reviews for delivered orders
    if (step.status === "DELIVERED" && rnd() < 0.85) {
      const l = lines[0];
      const exists = await prisma.review.findUnique({ where: { productId_userId: { productId: l.v.productId, userId: customer.id } } });
      if (!exists) {
        const rating = rnd() < 0.75 ? 5 : 4;
        await prisma.review.create({
          data: {
            productId: l.v.productId,
            userId: customer.id,
            rating,
            title: pick(["Très belle qualité", "Conforme à la description", "Je recommande", "Parfait !", "Bonne coupe"]),
            body: pick([
              "Tissu agréable et coupe impeccable. La taille correspond au guide des tailles. Livraison rapide à Tunis.",
              "Très satisfaite, la couleur est exactement comme sur les photos. Le livreur était ponctuel.",
              "Bon rapport qualité-prix. J'ai pris ma taille habituelle et c'est parfait.",
              "Belle finition, on sent la qualité. L'équipe m'a appelé pour confirmer, service très pro.",
            ]),
            status: "APPROVED",
            isVerifiedPurchase: true,
            createdAt: at(6),
            adminReply: rnd() < 0.3 ? "Merci beaucoup pour votre retour, à très bientôt chez Maison Nour !" : null,
          },
        });
      }
    }
  }

  // One pending review & one return request to moderate
  const yasmineDelivered = await prisma.order.findFirst({ where: { userId: customers[0].id, status: "DELIVERED" }, include: { items: true }, orderBy: { createdAt: "desc" } });
  if (yasmineDelivered) {
    await prisma.order.update({ where: { id: yasmineDelivered.id }, data: { deliveredAt: new Date(now - 3 * 86400_000) } });
  }
  const other = await prisma.order.findFirst({ where: { userId: customers[2].id, status: "DELIVERED" }, include: { items: true } });
  if (other) {
    await prisma.order.update({ where: { id: other.id }, data: { deliveredAt: new Date(now - 4 * 86400_000) } });
    await prisma.returnRequest.create({
      data: {
        number: "RET-DEMO-0001",
        orderId: other.id,
        userId: customers[2].id,
        type: "EXCHANGE",
        reason: "WRONG_SIZE",
        description: "Un peu trop petit, je souhaiterais la taille au-dessus.",
        items: { create: [{ orderItemId: other.items[0].id, quantity: 1, requestedSize: "L" }] },
      },
    });
  }
  await prisma.contactMessage.create({
    data: { name: "Nadia K.", email: "nadia@example.com", phone: "+21698765432", subject: "Disponibilité d'un article", message: "Bonjour, le trench beige en taille M sera-t-il de nouveau disponible ? Merci !" },
  });

  // Ratings
  const rated = await prisma.review.groupBy({ by: ["productId"], where: { status: "APPROVED" }, _avg: { rating: true }, _count: true });
  for (const r of rated) {
    await prisma.product.update({ where: { id: r.productId }, data: { ratingAvg: Math.round((r._avg.rating ?? 0) * 10) / 10, ratingCount: r._count } });
  }
}

async function main() {
  console.log(`Seeding (${isProd ? "production" : "development"}, demo data: ${DEMO})…`);
  await seedSettings();
  const charts = await seedReference();
  await seedAdmin();
  if (DEMO && (await prisma.product.count()) === 0) {
    await seedDemo(charts);
  } else if (DEMO) {
    console.log("ℹ Products already exist — demo catalog not re-created.");
  }
  await recomputeAllPricing();
  console.log("✔ Seed complete");
  if (!isProd && DEMO) {
    console.log(`
  Demo accounts (development only):
    Owner     ${process.env.SEED_ADMIN_EMAIL ?? "(see .env)"} / ${process.env.SEED_ADMIN_PASSWORD ? "(SEED_ADMIN_PASSWORD)" : "-"}
    Manager   manager@example.com / Manager-Dev-2026!
    Employee  employe@example.com / Employe-Dev-2026!
    Customer  client@example.com  / Client-Dev-2026!  (phone 98 123 456)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
