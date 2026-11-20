import { api } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { csvResponse, money, toCsv } from "@/server/csv";
import { badRequest } from "@/server/errors";
import { orderWhere } from "@/server/admin-orders";
import { audit } from "@/server/audit";
import { analytics } from "@/server/reports";

const MAX_ROWS = 50_000;

export const GET = api<{ type: string }>(async (req, ctx) => {
  const user = await requireStaff("reports.view");
  const { type } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const stamp = new Date().toISOString().slice(0, 10);
  await audit(user, "export", "Export", type, Object.fromEntries(sp.entries()));

  switch (type) {
    case "orders": {
      const orders = await prisma.order.findMany({
        where: orderWhere({ q: sp.get("q"), status: sp.get("status"), from: sp.get("from"), to: sp.get("to") }),
        orderBy: { createdAt: "desc" },
        include: { items: true },
        take: MAX_ROWS,
      });
      const rows = orders.map((o) => [
        o.number,
        o.createdAt,
        o.status,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.deliveryMethod,
        o.address,
        o.city,
        o.regionName,
        o.items.map((i) => `${i.quantity}x ${i.productName} [${[i.colorName, i.sizeLabel].filter(Boolean).join(" / ")}]`).join(" | "),
        money(o.subtotal),
        money(o.couponDiscount),
        o.couponCode,
        money(o.shippingFee),
        money(o.total),
        o.deliveryCompany,
        o.trackingNumber,
        o.cancellationReason,
      ]);
      return csvResponse(
        `commandes-${stamp}.csv`,
        toCsv(
          ["N°", "Date", "Statut", "Client", "Téléphone", "E-mail", "Mode", "Adresse", "Ville", "Région", "Articles", "Sous-total", "Remise coupon", "Coupon", "Livraison", "Total", "Livreur", "N° suivi", "Motif annulation"],
          rows,
        ),
      );
    }
    case "products": {
      const products = await prisma.product.findMany({
        include: { category: true, subcategory: true, brand: true, variants: { include: { color: true, size: true } } },
        orderBy: { name: "asc" },
        take: MAX_ROWS,
      });
      const rows = products.flatMap((p) =>
        (p.variants.length ? p.variants : [null]).map((v) => [
          p.name,
          p.sku,
          p.status,
          p.audience,
          p.category.name,
          p.subcategory?.name,
          p.brand?.name,
          v?.color?.name,
          v?.size?.label,
          v?.sku,
          money(v?.price ?? p.price),
          v?.salePrice != null || p.salePrice != null ? money((v?.salePrice ?? p.salePrice)!) : "",
          v?.stock ?? 0,
          v?.reserved ?? 0,
          v?.available ?? 0,
          v ? (v.isActive ? "oui" : "non") : "",
        ]),
      );
      return csvResponse(
        `catalogue-${stamp}.csv`,
        toCsv(["Produit", "Réf.", "Statut", "Public", "Catégorie", "Sous-catégorie", "Marque", "Couleur", "Taille", "SKU variante", "Prix", "Prix promo", "Stock", "Réservé", "Disponible", "Active"], rows),
      );
    }
    case "stock": {
      const variants = await prisma.productVariant.findMany({
        include: { product: { select: { name: true, status: true } }, color: true, size: true },
        orderBy: [{ available: "asc" }],
        take: MAX_ROWS,
      });
      return csvResponse(
        `stock-${stamp}.csv`,
        toCsv(
          ["Produit", "Statut produit", "Couleur", "Taille", "SKU", "Stock physique", "Réservé (en attente)", "Disponible", "Variante active"],
          variants.map((v) => [v.product.name, v.product.status, v.color?.name, v.size?.label, v.sku, v.stock, v.reserved, v.available, v.isActive ? "oui" : "non"]),
        ),
      );
    }
    case "customers": {
      const customers = await prisma.user.findMany({
        where: { role: "CUSTOMER" },
        include: { profile: { include: { region: true } }, orders: { select: { total: true, status: true } } },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });
      return csvResponse(
        `clients-${stamp}.csv`,
        toCsv(
          ["Nom", "E-mail", "Téléphone", "Adresse", "Ville", "Région", "Inscription", "Commandes", "Commandes livrées", "Total livré"],
          customers.map((c) => {
            const delivered = c.orders.filter((o) => o.status === "DELIVERED");
            return [
              c.fullName,
              c.email,
              c.phone,
              c.profile?.address,
              c.profile?.city,
              c.profile?.region?.name,
              c.createdAt,
              c.orders.length,
              delivered.length,
              money(delivered.reduce((s, o) => s + o.total, 0)),
            ];
          }),
        ),
      );
    }
    case "sales": {
      const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(Date.now() - 30 * 86400_000);
      const to = sp.get("to") ? new Date(sp.get("to")! + "T23:59:59") : new Date();
      const a = await analytics(from, to);
      const rows: (string | number)[][] = [
        ["Période", `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`],
        ["Commandes", a.orders],
        ["Commandes livrées", a.completedOrders],
        ["Chiffre d'affaires (livrées)", money(a.revenue)],
        ["Panier moyen", money(a.averageOrderValue)],
        ["Taux d'annulation (%)", a.cancellationRate],
        ["Nouveaux clients", a.registrations],
        [],
        ["Ventes par catégorie", "Quantité", "CA"],
        ...a.salesByCategory.map((c) => [c.name, c.quantity, money(c.revenue)]),
        [],
        ["Produits les plus vendus", "Quantité", "CA"],
        ...a.topProducts.map((p) => [p.name, p.quantity, money(p.revenue)]),
        [],
        ["Tailles les plus vendues", "Quantité"],
        ...a.topSizes.map((s) => [s.size, s.qty]),
        [],
        ["Couleurs les plus vendues", "Quantité"],
        ...a.topColors.map((c) => [c.name, c.qty]),
      ];
      return csvResponse(`ventes-${stamp}.csv`, toCsv(["Indicateur", "Valeur", ""], rows));
    }
    default:
      throw badRequest("INVALID_EXPORT", "Export inconnu");
  }
});
