import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { CATEGORIES, COLORS, MATERIALS, PRODUCTS, SIZES } from "../../../../../prisma/seed/data";
import { slugify } from "@/lib/utils";
import { rebuildSearchText } from "@/server/products-admin";
import { recomputeAllPricing } from "@/server/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

const TND = (n: number) => Math.round(n * 1000);

/**
 * One-shot production bootstrap. Remove this route after use.
 * POST /api/setup/bootstrap
 * Header: x-setup-token: <SETUP_TOKEN>
 */
export async function POST(req: NextRequest) {
  const expected = process.env.SETUP_TOKEN?.trim();
  const got = req.headers.get("x-setup-token")?.trim();
  if (!expected || !got || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    return NextResponse.json({ error: "Database unreachable", detail: String(e) }, { status: 500 });
  }

  const adminEmail = "admin@maisonnour.tn";
  const customerEmail = "client@maisonnour.tn";
  const adminPass = "Admin-Maison-2026!";
  const customerPass = "Client-Maison-2026!";

  const adminHash = await bcrypt.hash(adminPass, 12);
  const customerHash = await bcrypt.hash(customerPass, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      phone: "+21698111000",
      fullName: "Marwen Ayedi",
      role: "OWNER",
      passwordHash: adminHash,
      isActive: true,
    },
    update: { passwordHash: adminHash, role: "OWNER", isActive: true, fullName: "Marwen Ayedi" },
  });

  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    create: {
      email: customerEmail,
      phone: "+21698222000",
      fullName: "Client Demo",
      role: "CUSTOMER",
      passwordHash: customerHash,
      isActive: true,
      profile: { create: { address: "12 avenue Habib Bourguiba", city: "Tunis" } },
    },
    update: { passwordHash: customerHash, isActive: true },
  });

  // Settings
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
      openingHours: "Lundi – Samedi : 9h00 – 19h00",
      social: { facebook: "", instagram: "", tiktok: "", youtube: "" },
    },
    general: { defaultLocale: "fr", enabledLocales: ["fr", "ar", "en"], defaultCurrency: "TND", lowStockThreshold: 3 },
    delivery: {
      freeShippingThreshold: 150_000,
      pickupEnabled: true,
      estimatedDelivery: "24 à 72 heures",
      paymentNote: "Paiement à la livraison (espèces).",
    },
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: {},
    });
  }

  await prisma.deliveryRegion.upsert({
    where: { name: "Tunis" },
    create: { name: "Tunis", nameAr: "تونس", fee: 7000, estimatedDays: "24 h", sortOrder: 0, isActive: true },
    update: { isActive: true },
  });
  await prisma.deliveryRegion.upsert({
    where: { name: "Sfax" },
    create: { name: "Sfax", nameAr: "صفاقس", fee: 8000, estimatedDays: "24 à 48 h", sortOrder: 1, isActive: true },
    update: {},
  });

  let catalogSeeded = false;
  if ((await prisma.product.count()) === 0) {
    catalogSeeded = true;

    for (const [i, c] of COLORS.entries()) {
      await prisma.color.upsert({
        where: { slug: c.slug },
        create: { slug: c.slug, name: c.name, nameAr: c.nameAr, nameEn: c.nameEn, hex: c.hex, sortOrder: i },
        update: {},
      });
    }
    for (const group of SIZES) {
      for (const [i, label] of group.labels.entries()) {
        const existing = await prisma.size.findFirst({ where: { type: group.type, label } });
        if (!existing) await prisma.size.create({ data: { type: group.type, label, sortOrder: i } });
      }
    }
    for (const [name, nameAr, nameEn] of MATERIALS) {
      await prisma.material.upsert({
        where: { name },
        create: { name, nameAr, nameEn },
        update: {},
      });
    }

    for (const [i, cat] of CATEGORIES.entries()) {
      const created = await prisma.category.upsert({
        where: { slug: cat.slug },
        create: {
          slug: cat.slug,
          name: cat.name,
          nameAr: cat.nameAr,
          nameEn: cat.nameEn,
          audience: cat.audience,
          sortOrder: i,
          isActive: true,
          imageUrl: `https://placehold.co/800x1000/141414/f5f5f5/png?text=${encodeURIComponent(cat.name)}`,
        },
        update: {},
      });
      for (const [j, sub] of cat.subs.entries()) {
        await prisma.subcategory.upsert({
          where: { categoryId_slug: { categoryId: created.id, slug: sub.slug } },
          create: {
            categoryId: created.id,
            slug: sub.slug,
            name: sub.name,
            nameAr: sub.nameAr,
            nameEn: sub.nameEn,
            productType: sub.productType,
            sizeType: sub.sizeType ?? "CLOTHING",
            sortOrder: j,
            isActive: true,
          },
          update: {},
        });
      }
    }

    // Seed a subset of products (enough for demo, fits serverless timeout)
    const subset = PRODUCTS.slice(0, 18);
    for (const [index, p] of subset.entries()) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.cat } });
      const sub = await prisma.subcategory.findUniqueOrThrow({
        where: { categoryId_slug: { categoryId: category.id, slug: p.sub } },
      });
      const colors = await prisma.color.findMany({ where: { slug: { in: p.colors } } });
      const sizes = p.sizes
        ? await prisma.size.findMany({ where: { type: p.sizes.type, label: { in: p.sizes.labels } } })
        : [];

      const price = TND(p.price);
      const salePrice = p.sale != null ? TND(p.sale) : null;
      const audience = p.audience ?? (p.cat === "femme" ? "WOMEN" : p.cat === "enfant" ? "KIDS" : "MEN");
      const slug = slugify(`${p.name}-${audience === "BABY" ? "bebe" : p.cat}`);
      const cover = `https://placehold.co/900x1200/${(colors[0]?.hex ?? "141414").replace("#", "")}/f8f8f8/png?text=${encodeURIComponent(p.name)}`;
      const sku = p.sku ?? `SKU-${index + 1}`;

      const product = await prisma.product.create({
        data: {
          slug,
          sku,
          name: p.name,
          shortDescription: p.short,
          description: p.desc,
          audience,
          categoryId: category.id,
          subcategoryId: sub.id,
          price,
          salePrice,
          status: "PUBLISHED",
          isNewArrival: !!p.flags?.new,
          isBestSeller: !!p.flags?.best,
          isFeatured: !!p.flags?.featured || index < 6,
          isOnSale: salePrice != null,
          careInstructions: p.care || "Lavage délicat à 30°C.",
          publishedAt: new Date(),
          translations: {
            create: [
              { locale: "fr", name: p.name, shortDescription: p.short, description: p.desc },
              { locale: "en", name: p.nameEn, shortDescription: p.short, description: p.descEn },
              { locale: "ar", name: p.nameAr, shortDescription: p.short, description: p.descAr },
            ],
          },
          images: {
            create: [{ url: cover, thumbUrl: cover, storageKey: `bootstrap/${slug}`, sortOrder: 0, isMain: true, view: "FRONT", width: 900, height: 1200 }],
          },
          materials: {
            create: p.materials.map(([materialName, percentage]) => ({
              percentage,
              material: { connect: { name: materialName } },
            })),
          },
        },
      });

      const colorList = colors.length ? colors : [null];
      const sizeList = sizes.length ? sizes : [null];
      let v = 0;
      for (const color of colorList) {
        for (const size of sizeList) {
          const stock = 5 + ((index + v) % 8);
          const colorId = color?.id ?? null;
          const sizeId = size?.id ?? null;
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              colorId,
              sizeId,
              variantKey: `${colorId ?? "-"}:${sizeId ?? "-"}`,
              sku: `${sku}-${color?.slug ?? "x"}-${size?.label?.replace(/\s+/g, "") ?? "u"}`.slice(0, 40),
              price,
              salePrice,
              stock,
              reserved: 0,
              available: stock,
              isActive: true,
            },
          });
          v += 1;
        }
      }
      await rebuildSearchText(product.id);
    }

    // Homepage sections
    if ((await prisma.homeSection.count()) === 0) {
      const sections = [
        { type: "HERO", title: "Nouvelle saison", sortOrder: 0 },
        { type: "CATEGORY_TILES", title: "Collections", sortOrder: 10 },
        { type: "NEW_ARRIVALS", title: "Nouveautés", sortOrder: 20, config: { limit: 8 } },
        { type: "BEST_SELLERS", title: "Meilleures ventes", sortOrder: 30, config: { limit: 8 } },
        { type: "ON_SALE", title: "Promotions", sortOrder: 40, config: { limit: 8 } },
      ];
      for (const s of sections) {
        await prisma.homeSection.create({
          data: {
            type: s.type,
            title: s.title,
            sortOrder: s.sortOrder,
            isVisible: true,
            config: JSON.stringify(s.config ?? {}),
          },
        });
      }
    }

    await recomputeAllPricing();
  }

  return NextResponse.json({
    ok: true,
    message: catalogSeeded ? "Accounts + demo catalog created." : "Accounts ready (catalog already present).",
    accounts: {
      admin: { email: adminEmail, password: adminPass, login: "/admin/login" },
      customer: { email: customerEmail, password: customerPass, login: "/login" },
    },
    counts: {
      products: await prisma.product.count(),
      categories: await prisma.category.count(),
      users: await prisma.user.count(),
    },
    site: process.env.APP_URL || "https://shop-basic-admin-client.vercel.app",
  });
}
