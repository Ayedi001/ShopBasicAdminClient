import { prisma, type Tx } from "./db";
import { badRequest, conflict, notFound } from "./errors";
import type { StockMovementType } from "@/lib/constants";
import type { SessionUser } from "./auth/session";
import { refreshProductAggregates } from "./pricing";

/**
 * Stock model per variant:
 *   stock     physical units on hand
 *   reserved  units held by PENDING orders (not yet confirmed by the shop)
 *   available stock - reserved (what customers can still order)
 *
 * Every mutation is a single conditional UPDATE so concurrent orders can never
 * oversell: the row lock taken by the UPDATE (PostgreSQL) or the database
 * write lock (SQLite) serialises competing requests and the WHERE clause
 * re-checks availability at write time.
 */

type Actor = Pick<SessionUser, "id" | "fullName"> | null;

async function movement(
  tx: Tx,
  variantId: string,
  delta: number,
  type: StockMovementType,
  opts: { reason?: string | null; orderId?: string | null; actor?: Actor },
) {
  const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } });
  await tx.stockMovement.create({
    data: {
      variantId,
      delta,
      type,
      reason: opts.reason ?? null,
      stockBefore: v.stock - delta,
      stockAfter: v.stock,
      orderId: opts.orderId ?? null,
      userId: opts.actor?.id ?? null,
      userName: opts.actor?.fullName ?? "Système",
    },
  });
}

/** Hold units for a new pending order. Returns false when not enough stock. */
export async function holdStock(tx: Tx, variantId: string, qty: number): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET "reserved" = "reserved" + ${qty}, "available" = "available" - ${qty}
    WHERE "id" = ${variantId} AND "isActive" = true AND "available" >= ${qty}`;
  return n === 1;
}

/** Release a hold (pending order cancelled). */
export async function releaseHold(tx: Tx, variantId: string, qty: number) {
  await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET "reserved" = "reserved" - ${qty}, "available" = "available" + ${qty}
    WHERE "id" = ${variantId} AND "reserved" >= ${qty}`;
}

/** Convert a hold into a permanent deduction (order confirmed by the shop). */
export async function commitHold(tx: Tx, variantId: string, qty: number, orderId: string, actor: Actor) {
  const n = await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET "reserved" = "reserved" - ${qty}, "stock" = "stock" - ${qty}
    WHERE "id" = ${variantId} AND "reserved" >= ${qty} AND "stock" >= ${qty}`;
  if (n !== 1) throw conflict("STOCK_INCONSISTENT", "Stock incohérent pour une variante de la commande.");
  await movement(tx, variantId, -qty, "ORDER_CONFIRMED", { orderId, actor, reason: "Commande confirmée" });
}

/** Put units back on hand (cancelled after confirmation, accepted return). */
export async function restock(
  tx: Tx,
  variantId: string,
  qty: number,
  type: StockMovementType,
  opts: { orderId?: string | null; actor: Actor; reason?: string },
) {
  await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET "stock" = "stock" + ${qty}, "available" = "available" + ${qty}
    WHERE "id" = ${variantId}`;
  await movement(tx, variantId, qty, type, opts);
}

/** Take units out of stock directly (exchange replacement shipped). */
export async function deductDirect(
  tx: Tx,
  variantId: string,
  qty: number,
  type: StockMovementType,
  opts: { orderId?: string | null; actor: Actor; reason?: string },
) {
  const n = await tx.$executeRaw`
    UPDATE "ProductVariant"
    SET "stock" = "stock" - ${qty}, "available" = "available" - ${qty}
    WHERE "id" = ${variantId} AND "available" >= ${qty}`;
  if (n !== 1) throw conflict("OUT_OF_STOCK", "Stock insuffisant pour la variante de remplacement.");
  await movement(tx, variantId, -qty, type, opts);
}

/** Manual stock adjustment from the inventory screen. Never silently overwrites: always logged. */
export async function adjustStock(
  input: { variantId: string; mode: "DELTA" | "SET"; quantity: number; type: StockMovementType; reason: string },
  actor: Actor,
) {
  const productId = await prisma.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: input.variantId } });
    if (!v) throw notFound("Variante introuvable");
    const newStock = input.mode === "SET" ? input.quantity : v.stock + input.quantity;
    if (newStock < 0) throw badRequest("NEGATIVE_STOCK", "Le stock ne peut pas être négatif");
    if (newStock < v.reserved) {
      throw badRequest(
        "BELOW_RESERVED",
        `${v.reserved} unité(s) sont réservées par des commandes en attente. Le stock ne peut pas descendre en dessous.`,
      );
    }
    const delta = newStock - v.stock;
    if (delta === 0) return v.productId;
    // Optimistic concurrency: only apply if nobody changed stock meanwhile
    const n = await tx.productVariant.updateMany({
      where: { id: v.id, stock: v.stock, reserved: v.reserved },
      data: { stock: newStock, available: newStock - v.reserved },
    });
    if (n.count !== 1) throw conflict("CONCURRENT_UPDATE", "Le stock a changé entre-temps, veuillez réessayer.");
    await tx.stockMovement.create({
      data: {
        variantId: v.id,
        delta,
        type: input.type,
        reason: input.reason,
        stockBefore: v.stock,
        stockAfter: newStock,
        userId: actor?.id ?? null,
        userName: actor?.fullName ?? "Système",
      },
    });
    return v.productId;
  });
  await refreshProductAggregates([productId]);
}

export async function bulkSetStock(
  items: { variantId: string; stock: number }[],
  type: StockMovementType,
  reason: string,
  actor: Actor,
) {
  const errors: { variantId: string; message: string }[] = [];
  for (const item of items) {
    try {
      await adjustStock({ variantId: item.variantId, mode: "SET", quantity: item.stock, type, reason }, actor);
    } catch (e) {
      errors.push({ variantId: item.variantId, message: (e as Error).message });
    }
  }
  return { updated: items.length - errors.length, errors };
}
