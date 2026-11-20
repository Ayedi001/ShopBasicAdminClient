import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  // Minimal store settings so the homepage does not crash
  const store = await prisma.setting.findUnique({ where: { key: "store" } });
  if (!store) {
    await prisma.setting.create({
      data: {
        key: "store",
        value: JSON.stringify({
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
        }),
      },
    });
  }
  for (const key of ["general", "delivery"] as const) {
    const exists = await prisma.setting.findUnique({ where: { key } });
    if (!exists) {
      await prisma.setting.create({
        data: {
          key,
          value: JSON.stringify(
            key === "general"
              ? { defaultLocale: "fr", enabledLocales: ["fr", "ar", "en"], defaultCurrency: "TND", lowStockThreshold: 3 }
              : { freeShippingThreshold: 150_000, pickupEnabled: true, estimatedDelivery: "24 à 72 heures", paymentNote: "Paiement à la livraison (espèces)." },
          ),
        },
      });
    }
  }

  // Ensure Tunis region exists for checkout
  await prisma.deliveryRegion.upsert({
    where: { name: "Tunis" },
    create: { name: "Tunis", nameAr: "تونس", fee: 7000, estimatedDays: "24 h", sortOrder: 0, isActive: true },
    update: { isActive: true },
  });

  const products = await prisma.product.count();
  const categories = await prisma.category.count();

  return NextResponse.json({
    ok: true,
    message: products === 0 ? "Accounts created. Catalog is empty — run full seed from CI or paste DATABASE_URL locally for demo products." : "Accounts ready.",
    accounts: {
      admin: { email: adminEmail, password: adminPass, id: admin.id },
      customer: { email: customerEmail, password: customerPass, id: customer.id },
    },
    counts: { products, categories, users: await prisma.user.count() },
  });
}
