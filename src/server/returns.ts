import { prisma } from "./db";
import { badRequest, notFound } from "./errors";
import { getSetting } from "./settings";
import { newOrderNumber } from "./orders";
import { deductDirect, restock } from "./inventory";
import { refreshProductAggregates } from "./pricing";
import { notify } from "./notifications";
import { audit } from "./audit";
import { RETURN_TRANSITIONS, type ReturnStatus } from "@/lib/constants";
import type { SessionUser } from "./auth/session";
import type { returnRequestSchema, returnUpdateSchema } from "@/lib/validation";
import type { z } from "zod";

const STATUS_FR: Record<string, string> = {
  REQUESTED: "demandée",
  APPROVED: "acceptée",
  REJECTED: "refusée",
  RECEIVED: "article reçu",
  COMPLETED: "terminée",
  CANCELLED: "annulée",
};

export async function returnWindow(order: { deliveredAt: Date | null; status: string }) {
  const g = await getSetting("general");
  if (order.status !== "DELIVERED" || !order.deliveredAt) return { canReturn: false, canExchange: false };
  const days = (Date.now() - order.deliveredAt.getTime()) / 86400_000;
  return { canReturn: days <= g.returnPeriodDays, canExchange: days <= g.exchangePeriodDays, returnDays: g.returnPeriodDays, exchangeDays: g.exchangePeriodDays };
}

export async function createReturnRequest(user: SessionUser, input: z.output<typeof returnRequestSchema>) {
  const order = await prisma.order.findFirst({
    where: { number: input.orderNumber, userId: user.id },
    include: { items: { include: { returnItems: { include: { returnRequest: true } } } } },
  });
  if (!order) throw notFound("Commande introuvable");
  const window = await returnWindow(order);
  if (input.type === "RETURN" ? !window.canReturn : !window.canExchange) {
    throw badRequest("RETURN_WINDOW", "Le délai de retour/échange est dépassé pour cette commande.");
  }
  for (const it of input.items) {
    const oi = order.items.find((i) => i.id === it.orderItemId);
    if (!oi) throw badRequest("INVALID_ITEM", "Article invalide");
    const alreadyRequested = oi.returnItems
      .filter((r) => !["REJECTED", "CANCELLED"].includes(r.returnRequest.status))
      .reduce((s, r) => s + r.quantity, 0);
    if (it.quantity > oi.quantity - alreadyRequested) {
      throw badRequest("QUANTITY", `Quantité trop élevée pour « ${oi.productName} » (déjà demandée ou dépassée).`);
    }
    if (input.type === "EXCHANGE" && !it.requestedSize) {
      throw badRequest("SIZE_REQUIRED", "Indiquez la taille souhaitée pour l'échange.", { items: "err.required" });
    }
  }
  const req = await prisma.returnRequest.create({
    data: {
      number: newOrderNumber("RET"),
      orderId: order.id,
      userId: user.id,
      type: input.type,
      reason: input.reason,
      description: input.description,
      items: { create: input.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity, requestedSize: i.requestedSize })) },
    },
  });
  return req;
}

export async function updateReturnRequest(id: string, input: z.output<typeof returnUpdateSchema>, actor: SessionUser) {
  const affected = await prisma.$transaction(async (tx) => {
    const req = await tx.returnRequest.findUnique({ where: { id }, include: { items: { include: { orderItem: true } } } });
    if (!req) throw notFound("Demande introuvable");
    const productIds = new Set<string>();

    if (input.replacements) {
      for (const r of input.replacements) {
        const item = req.items.find((i) => i.id === r.returnItemId);
        if (!item) continue;
        let label: string | null = null;
        if (r.replacementVariantId) {
          const v = await tx.productVariant.findUnique({ where: { id: r.replacementVariantId }, include: { product: true, color: true, size: true } });
          if (!v) throw badRequest("INVALID_VARIANT", "Variante de remplacement introuvable");
          label = [v.product.name, v.color?.name, v.size?.label].filter(Boolean).join(" / ");
        }
        await tx.returnItem.update({ where: { id: item.id }, data: { replacementVariantId: r.replacementVariantId, replacementLabel: label } });
      }
    }

    const data: Record<string, unknown> = {};
    if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes;
    if (input.replacementNote !== undefined) data.replacementNote = input.replacementNote;
    if (input.rejectionReason !== undefined) data.rejectionReason = input.rejectionReason;

    if (input.status && input.status !== req.status) {
      const from = req.status as ReturnStatus;
      if (!RETURN_TRANSITIONS[from].includes(input.status)) throw badRequest("INVALID_TRANSITION", `Transition impossible : ${from} → ${input.status}`);
      if (input.status === "REJECTED" && !input.rejectionReason && !req.rejectionReason) {
        throw badRequest("REASON_REQUIRED", "Indiquez le motif du refus.", { rejectionReason: "Obligatoire" });
      }
      data.status = input.status;

      // Stock: returned items go back on hand once received/completed (if requested), exchange replacements leave stock
      if ((input.status === "COMPLETED" || input.status === "RECEIVED") && input.restock && !req.restocked) {
        for (const item of req.items) {
          if (item.orderItem.variantId) {
            await restock(tx, item.orderItem.variantId, item.quantity, "RETURN", { actor, reason: `Retour ${req.number}` });
            if (item.orderItem.productId) productIds.add(item.orderItem.productId);
          }
        }
        data.restocked = true;
      }
      if (input.status === "COMPLETED" && req.type === "EXCHANGE") {
        const fresh = await tx.returnItem.findMany({ where: { returnRequestId: req.id } });
        for (const item of fresh) {
          if (item.replacementVariantId) {
            await deductDirect(tx, item.replacementVariantId, item.quantity, "EXCHANGE_OUT", { actor, reason: `Échange ${req.number}` });
            const v = await tx.productVariant.findUnique({ where: { id: item.replacementVariantId }, select: { productId: true } });
            if (v) productIds.add(v.productId);
          }
        }
      }
      await notify(tx, req.userId, "RETURN_UPDATED", { number: req.number, status: STATUS_FR[input.status] ?? input.status }, "/account/returns");
    }
    await tx.returnRequest.update({ where: { id }, data });
    await audit(actor, "return.update", "ReturnRequest", id, { number: req.number, ...input }, tx);
    return [...productIds];
  });
  if (affected.length) await refreshProductAggregates(affected);
}
