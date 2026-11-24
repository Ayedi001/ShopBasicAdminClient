import Link from "next/link";
import type { Prisma } from "@/server/db";
import { Download, Search } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { getSetting } from "@/server/settings";
import { searchTokens } from "@/lib/search-text";
import { Card, ColorDot, Empty, PageHeader, Pagination, fdatetime } from "@/components/admin/parts";
import { STOCK_TYPE_LABELS } from "@/components/admin/labels";
import { InventoryTable } from "@/components/admin/inventory-table";
import { cn } from "@/lib/utils";

type SP = { tab?: string; q?: string; filter?: string; category?: string; page?: string; variant?: string; type?: string };
const PAGE_SIZE = 50;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await adminPage("inventory.manage");
  const sp = await searchParams;
  const tab = sp.tab === "movements" ? "movements" : "stock";
  const page = Math.max(1, Number(sp.page) || 1);
  const { lowStockThreshold } = await getSetting("general");

  return (
    <>
      <PageHeader
        title="Stock"
        description={`Stock physique, unités réservées par les commandes en attente et quantité disponible à la vente. Seuil de stock faible : ${lowStockThreshold}.`}
        actions={
          user.permissions.includes("reports.view") && (
            <a href="/api/admin/export/stock" className="a-btn">
              <Download className="h-4 w-4" /> Exporter CSV
            </a>
          )
        }
      />
      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {[
          { key: "stock", label: "Inventaire" },
          { key: "movements", label: "Historique des mouvements" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.key === "stock" ? "/admin/inventory" : "/admin/inventory?tab=movements"}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[13px]", tab === t.key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {tab === "stock" ? <StockTab sp={sp} page={page} threshold={lowStockThreshold} /> : <MovementsTab sp={sp} page={page} />}
    </>
  );
}

async function StockTab({ sp, page, threshold }: { sp: SP; page: number; threshold: number }) {
  const and: Prisma.ProductVariantWhereInput[] = [{ product: { status: { not: "ARCHIVED" } } }];
  if (sp.q) {
    const tokens = searchTokens(sp.q);
    and.push({ OR: [{ sku: { contains: sp.q.trim() } }, { AND: tokens.map((t) => ({ product: { searchText: { contains: t } } })) }] });
  }
  if (sp.filter === "low") and.push({ isActive: true, available: { lte: threshold } });
  if (sp.filter === "out") and.push({ isActive: true, available: { lte: 0 } });
  if (sp.filter === "reserved") and.push({ reserved: { gt: 0 } });
  if (sp.category) and.push({ product: { categoryId: sp.category } });
  const where = { AND: and };
  const [variants, total, categories] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      include: { product: { select: { id: true, name: true, status: true } }, color: true, size: true },
      orderBy: sp.filter ? [{ available: "asc" }] : [{ product: { name: "asc" } }, { sortOrder: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.productVariant.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const params = { q: sp.q, filter: sp.filter, category: sp.category };

  return (
    <Card bodyClass="p-0">
      <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/inventory">
        <label className="min-w-[220px] flex-1">
          <span className="a-label">Recherche</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input name="q" defaultValue={sp.q} className="a-input pl-8" placeholder="Produit ou SKU" />
          </div>
        </label>
        <label>
          <span className="a-label">Afficher</span>
          <select name="filter" defaultValue={sp.filter ?? ""} className="a-input">
            <option value="">Toutes les variantes</option>
            <option value="low">Stock faible (≤ {threshold})</option>
            <option value="out">En rupture</option>
            <option value="reserved">Avec réservations</option>
          </select>
        </label>
        <label>
          <span className="a-label">Catégorie</span>
          <select name="category" defaultValue={sp.category ?? ""} className="a-input">
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="a-btn-primary">Filtrer</button>
        {(sp.q || sp.filter || sp.category) && (
          <Link href="/admin/inventory" className="a-btn-ghost">
            Réinitialiser
          </Link>
        )}
      </form>
      {variants.length ? (
        <InventoryTable
          threshold={threshold}
          rows={variants.map((v) => ({
            id: v.id,
            productId: v.product.id,
            productName: v.product.name,
            productStatus: v.product.status,
            color: v.color ? { name: v.color.name, hex: v.color.hex } : null,
            size: v.size?.label ?? null,
            sku: v.sku,
            stock: v.stock,
            reserved: v.reserved,
            available: v.available,
            isActive: v.isActive,
          }))}
        />
      ) : (
        <Empty>Aucune variante ne correspond.</Empty>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/inventory" params={params} />
    </Card>
  );
}

async function MovementsTab({ sp, page }: { sp: SP; page: number }) {
  const where: Prisma.StockMovementWhereInput = {
    ...(sp.variant ? { variantId: sp.variant } : {}),
    ...(sp.type && sp.type in STOCK_TYPE_LABELS ? { type: sp.type } : {}),
  };
  const [moves, total, variant] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { variant: { include: { product: { select: { id: true, name: true } }, color: true, size: true } }, order: { select: { id: true, number: true } } },
    }),
    prisma.stockMovement.count({ where }),
    sp.variant ? prisma.productVariant.findUnique({ where: { id: sp.variant }, include: { product: { select: { name: true } }, color: true, size: true } }) : null,
  ]);
  return (
    <Card bodyClass="p-0">
      <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/inventory">
        <input type="hidden" name="tab" value="movements" />
        {sp.variant && <input type="hidden" name="variant" value={sp.variant} />}
        <label>
          <span className="a-label">Type de mouvement</span>
          <select name="type" defaultValue={sp.type ?? ""} className="a-input">
            <option value="">Tous</option>
            {Object.entries(STOCK_TYPE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="a-btn-primary">Filtrer</button>
        {variant && (
          <p className="ml-2 self-center text-[13px]">
            Variante : <strong>{variant.product.name}</strong> {[variant.color?.name, variant.size?.label].filter(Boolean).join(" · ")}{" "}
            <Link href="/admin/inventory?tab=movements" className="text-neutral-500 underline">
              (toutes)
            </Link>
          </p>
        )}
      </form>
      {moves.length ? (
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Variante</th>
                <th>Type</th>
                <th className="text-right">Variation</th>
                <th className="text-right">Avant → après</th>
                <th>Motif</th>
                <th>Par</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-neutral-500">{fdatetime(m.createdAt)}</td>
                  <td>
                    <Link href={`/admin/products/${m.variant.product.id}?tab=variants`} className="hover:underline">
                      {m.variant.product.name}
                    </Link>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5">
                      <ColorDot hex={m.variant.color?.hex} />
                      {[m.variant.color?.name, m.variant.size?.label].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>
                  <td>{STOCK_TYPE_LABELS[m.type] ?? m.type}</td>
                  <td className={cn("text-right font-medium tabular-nums", m.delta > 0 ? "text-emerald-700" : "text-red-600")}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td className="text-right tabular-nums text-neutral-500">
                    {m.stockBefore} → {m.stockAfter}
                  </td>
                  <td className="max-w-[260px] text-[12px] text-neutral-600">
                    {m.reason}
                    {m.order && (
                      <Link href={`/admin/orders/${m.order.id}`} className="ml-1 underline">
                        {m.order.number}
                      </Link>
                    )}
                  </td>
                  <td className="text-[12px] text-neutral-500">{m.userName ?? "Système"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Aucun mouvement.</Empty>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/inventory" params={{ tab: "movements", variant: sp.variant, type: sp.type }} />
    </Card>
  );
}
