import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import { getCurrentUser } from "./auth/session";
import { computePrice, getActivePromotions } from "./pricing";
import { evaluateCoupon, type CouponResult } from "./coupons";
import { localized } from "@/i18n";
import { getSetting } from "./settings";
import { AppError } from "./errors";

export const CART_COOKIE = "ms_cart";
const MAX_LINE_QTY = 20;

async function guestToken(create: boolean) {
  const jar = await cookies();
  let token = jar.get(CART_COOKIE)?.value ?? null;
  if (!token && create) {
    token = crypto.randomBytes(24).toString("base64url");
    jar.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }
  return token;
}

/** Returns the cart for the current visitor (user cart when logged in, guest cart otherwise). */
export async function getCart(create: boolean) {
  const user = await getCurrentUser();
  if (user) {
    const existing = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (existing || !create) return existing;
    return prisma.cart.create({ data: { userId: user.id } });
  }
  const token = await guestToken(create);
  if (!token) return null;
  const existing = await prisma.cart.findUnique({ where: { guestToken: token } });
  if (existing || !create) return existing;
  return prisma.cart.create({ data: { guestToken: token } });
}

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  categoryId: string;
  slug: string;
  name: string;
  image: string | null;
  colorName: string | null;
  colorHex: string | null;
  sizeLabel: string | null;
  sku: string | null;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
  issue: null | "UNAVAILABLE" | "REDUCED" | "PRICE_CHANGED";
};

export type CartView = Awaited<ReturnType<typeof buildCartView>>;

/**
 * Builds the cart with live prices & stock. Lines whose stock dropped are
 * reduced (and flagged) so the customer is informed of availability changes.
 */
export async function buildCartView(cartId: string | null, locale: string, userId: string | null) {
  const empty = {
    id: cartId,
    lines: [] as CartLine[],
    count: 0,
    subtotal: 0,
    baseSubtotal: 0,
    promoSavings: 0,
    coupon: null as (CouponResult & { error?: never }) | null,
    couponError: null as string | null,
    couponCode: null as string | null,
    total: 0,
    hasIssues: false,
    freeShippingThreshold: 0,
  };
  const delivery = await getSetting("delivery");
  empty.freeShippingThreshold = delivery.freeShippingThreshold;
  if (!cartId) return empty;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              color: true,
              size: true,
              product: {
                include: {
                  translations: { where: { locale } },
                  images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], where: { kind: "IMAGE" } },
                  category: { select: { isActive: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!cart) return empty;
  const promos = await getActivePromotions();
  const lines: CartLine[] = [];
  for (const item of cart.items) {
    const v = item.variant;
    const p = v.product;
    const price = computePrice(p, v, promos);
    const sellable = v.isActive && p.status === "PUBLISHED" && p.category.isActive;
    const available = sellable ? Math.max(0, v.available) : 0;
    let quantity = item.quantity;
    let issue: CartLine["issue"] = null;
    if (available <= 0) issue = "UNAVAILABLE";
    else if (quantity > available) {
      quantity = available;
      issue = "REDUCED";
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    } else if (item.seenPrice != null && item.seenPrice !== price.final) {
      issue = "PRICE_CHANGED";
    }
    if (item.seenPrice !== price.final) {
      await prisma.cartItem.update({ where: { id: item.id }, data: { seenPrice: price.final } });
    }
    const colorImage = p.images.find((i) => i.colorId && i.colorId === v.colorId) ?? p.images[0];
    lines.push({
      id: item.id,
      variantId: v.id,
      productId: p.id,
      categoryId: p.categoryId,
      slug: p.slug,
      name: p.translations[0]?.name || p.name,
      image: colorImage?.thumbUrl ?? null,
      colorName: v.color ? localized(v.color, locale) : null,
      colorHex: v.color?.hex ?? null,
      sizeLabel: v.size?.label ?? null,
      sku: v.sku,
      unitPrice: price.final,
      basePrice: price.base,
      quantity,
      lineTotal: issue === "UNAVAILABLE" ? 0 : price.final * quantity,
      available,
      issue,
    });
  }
  const valid = lines.filter((l) => l.issue !== "UNAVAILABLE");
  const subtotal = valid.reduce((s, l) => s + l.lineTotal, 0);
  const baseSubtotal = valid.reduce((s, l) => s + l.basePrice * l.quantity, 0);

  let coupon: CouponResult | null = null;
  let couponError: string | null = null;
  if (cart.couponCode && valid.length) {
    try {
      coupon = await evaluateCoupon(cart.couponCode, userId, valid.map((l) => ({ productId: l.productId, categoryId: l.categoryId, lineTotal: l.lineTotal })));
    } catch (e) {
      couponError = e instanceof AppError ? e.message : "Code promo invalide.";
    }
  }
  return {
    id: cart.id,
    lines,
    count: valid.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    baseSubtotal,
    promoSavings: baseSubtotal - subtotal,
    coupon,
    couponError,
    couponCode: cart.couponCode,
    total: Math.max(0, subtotal - (coupon?.discount ?? 0)),
    hasIssues: lines.some((l) => l.issue === "UNAVAILABLE" || l.issue === "REDUCED"),
    freeShippingThreshold: delivery.freeShippingThreshold,
  };
}

export async function currentCartView(locale: string) {
  const [cart, user] = await Promise.all([getCart(false), getCurrentUser()]);
  return buildCartView(cart?.id ?? null, locale, user?.id ?? null);
}

export async function addToCart(variantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true, category: { select: { isActive: true } } } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "PUBLISHED" || !variant.product.category.isActive) {
    throw badRequest("VARIANT_UNAVAILABLE", "Cette variante n'est pas disponible.");
  }
  const cart = (await getCart(true))!;
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (variant.available <= 0) throw badRequest("OUT_OF_STOCK", "Cet article est en rupture de stock.");
  if (desired > variant.available) {
    throw badRequest("INSUFFICIENT_STOCK", `Stock insuffisant : ${variant.available} disponible(s).`, undefined, { available: variant.available });
  }
  if (desired > MAX_LINE_QTY) throw badRequest("MAX_QUANTITY", `Maximum ${MAX_LINE_QTY} unités par article.`);
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: desired },
    update: { quantity: desired },
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return cart.id;
}

export async function updateCartItem(itemId: string, quantity: number) {
  const cart = await getCart(false);
  if (!cart) throw notFound("Panier introuvable");
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
  if (!item) throw notFound("Article introuvable dans le panier");
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return cart.id;
  }
  if (quantity > item.variant.available) {
    throw badRequest("INSUFFICIENT_STOCK", `Stock insuffisant : ${item.variant.available} disponible(s).`, undefined, {
      available: item.variant.available,
    });
  }
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, MAX_LINE_QTY) } });
  return cart.id;
}

export async function setCartCoupon(code: string | null, locale: string) {
  const cart = await getCart(true);
  const user = await getCurrentUser();
  if (!code) {
    await prisma.cart.update({ where: { id: cart!.id }, data: { couponCode: null } });
    return buildCartView(cart!.id, locale, user?.id ?? null);
  }
  const view = await buildCartView(cart!.id, locale, user?.id ?? null);
  const valid = view.lines.filter((l) => l.issue !== "UNAVAILABLE");
  if (!valid.length) throw badRequest("CART_EMPTY", "Votre panier est vide.");
  // throws with a precise message when invalid
  await evaluateCoupon(code, user?.id ?? null, valid.map((l) => ({ productId: l.productId, categoryId: l.categoryId, lineTotal: l.lineTotal })));
  await prisma.cart.update({ where: { id: cart!.id }, data: { couponCode: code.trim().toUpperCase() } });
  return buildCartView(cart!.id, locale, user?.id ?? null);
}

/** Merge the visitor's guest cart into the account cart after login/registration. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await prisma.cart.findUnique({ where: { guestToken: token }, include: { items: { include: { variant: true } } } });
  jar.delete(CART_COOKIE);
  if (!guest) return;
  let userCart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
  if (!userCart) {
    // Simply adopt the guest cart
    await prisma.cart.update({ where: { id: guest.id }, data: { userId, guestToken: null } });
    return;
  }
  for (const gi of guest.items) {
    const existing = userCart.items.find((i) => i.variantId === gi.variantId);
    const qty = Math.min((existing?.quantity ?? 0) + gi.quantity, Math.max(0, gi.variant.available), MAX_LINE_QTY);
    if (qty <= 0) continue;
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: userCart.id, variantId: gi.variantId } },
      create: { cartId: userCart.id, variantId: gi.variantId, quantity: qty, seenPrice: gi.seenPrice },
      update: { quantity: qty },
    });
  }
  if (guest.couponCode && !userCart.couponCode) {
    userCart = await prisma.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode }, include: { items: true } });
  }
  await prisma.cart.delete({ where: { id: guest.id } });
}
