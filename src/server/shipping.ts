import { prisma } from "./db";
import { badRequest } from "./errors";
import { getSetting } from "./settings";

export async function getDeliveryOptions() {
  const [regions, delivery, store] = await Promise.all([
    prisma.deliveryRegion.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getSetting("delivery"),
    getSetting("store"),
  ]);
  return {
    regions: regions.map((r) => ({ id: r.id, name: r.name, nameAr: r.nameAr, fee: r.fee, estimatedDays: r.estimatedDays })),
    freeShippingThreshold: delivery.freeShippingThreshold,
    pickupEnabled: delivery.pickupEnabled,
    pickupAddress: delivery.pickupAddress || store.address,
    pickupHours: delivery.pickupHours,
    estimatedDelivery: delivery.estimatedDelivery,
    paymentNote: delivery.paymentNote,
  };
}

/** Delivery fee for an order amount (after discounts), validated server-side. */
export async function computeShipping(method: "DELIVERY" | "PICKUP", regionId: string | null | undefined, amount: number) {
  const delivery = await getSetting("delivery");
  if (method === "PICKUP") {
    if (!delivery.pickupEnabled) throw badRequest("PICKUP_DISABLED", "Le retrait en boutique n'est pas disponible.");
    return { fee: 0, regionName: "Retrait en boutique", regionId: null, estimatedDays: delivery.pickupHours || null };
  }
  if (!regionId) throw badRequest("REGION_REQUIRED", "Veuillez choisir une région de livraison.", { regionId: "err.required" });
  const region = await prisma.deliveryRegion.findFirst({ where: { id: regionId, isActive: true } });
  if (!region) throw badRequest("REGION_INVALID", "Région de livraison invalide.", { regionId: "err.required" });
  const free = delivery.freeShippingThreshold > 0 && amount >= delivery.freeShippingThreshold;
  return { fee: free ? 0 : region.fee, regionName: region.name, regionId: region.id, estimatedDays: region.estimatedDays ?? delivery.estimatedDelivery };
}
