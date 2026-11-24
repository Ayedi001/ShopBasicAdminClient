import Link from "next/link";
import type { Prisma } from "@/server/db";
import { Download, Plus, Search } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { searchTokens } from "@/lib/search-text";
import { PRODUCT_STATUSES } from "@/lib/constants";
import { Badge, Card, Empty, PageHeader, Pagination, dt } from "@/components/admin/parts";
import { PRODUCT_STATUS_LABELS } from "@/components/admin/labels";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { cn } from "@/lib/utils";

type SP = { q?: string; status?: string; category?: string; stock?: string; page?: string };
const PAGE_SIZE = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await adminPage("products.manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const and: Prisma.ProductWhereInput[] = [];
  if (sp.q) for (const t of searchTokens(sp.q)) and.push({ OR: [{ searchText: { contains: t } }, { sku: { contains: sp.q.trim() } }, { variants: { some: { sku: { contains: sp.q.trim() } } } }] });
  if (sp.status && (PRODUCT_STATUSES as readonly string[]).includes(sp.status)) and.push({ status: sp.status });
  if (sp.category) and.push({ categoryId: sp.category });
  if (sp.stock === "out") and.push({ totalAvailable: 0 });
  const where: Prisma.ProductWhereInput = { AND: and };

  const [items, total, categories, counts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        images: { where: { kind: "IMAGE" }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], take: 1, select: { thumbUrl: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.product.groupBy({ by: ["status"], _count: true }),
  ]);
  const params = { q: sp.q, status: sp.status, category: sp.category, stock: sp.stock };
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Produits"
        description={`${count("PUBLISHED")} publiés · ${count("DRAFT")} brouillons · ${count("ARCHIVED")} archivés`}
        actions={
          <>
            {user.permissions.includes("reports.view") && (
              <a href="/api/admin/export/products" className="a-btn">
                <Download className="h-4 w-4" /> Exporter CSV
              </a>
            )}
            <Link href="/admin/products/new" className="a-btn-primary">
              <Plus className="h-4 w-4" /> Nouveau produit
            </Link>
          </>
        }
      />
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/products">
          <label className="min-w-[220px] flex-1">
            <span className="a-label">Recherche</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input name="q" defaultValue={sp.q} className="a-input pl-8" placeholder="Nom, référence, SKU, couleur…" />
            </div>
          </label>
          <label>
            <span className="a-label">Statut</span>
            <select name="status" defaultValue={sp.status ?? ""} className="a-input">
              <option value="">Tous</option>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PRODUCT_STATUS_LABELS[s]}
                </option>
              ))}
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
          <label>
            <span className="a-label">Stock</span>
            <select name="stock" defaultValue={sp.stock ?? ""} className="a-input">
              <option value="">Tous</option>
              <option value="out">En rupture totale</option>
            </select>
          </label>
          <button className="a-btn-primary">Filtrer</button>
          {(sp.q || sp.status || sp.category || sp.stock) && (
            <Link href="/admin/products" className="a-btn-ghost">
              Réinitialiser
            </Link>
          )}
        </form>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th className="w-14" />
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th className="text-right">Prix</th>
                  <th className="text-right">Disponible</th>
                  <th className="text-right">Vendus</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].thumbUrl} alt="" className="h-14 w-11 rounded bg-neutral-100 object-cover" />
                      ) : (
                        <div className="flex h-14 w-11 items-center justify-center rounded bg-neutral-100 text-[10px] text-neutral-400">—</div>
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <span className="block text-[12px] text-neutral-500">
                        {p.sku ?? "Sans référence"} · {p._count.variants} variante(s)
                        {p.isFeatured && " · ★ mis en avant"}
                      </span>
                    </td>
                    <td className="text-neutral-600">
                      {p.category.name}
                      {p.subcategory && <span className="block text-[12px] text-neutral-500">{p.subcategory.name}</span>}
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">
                      {p.isDiscounted && p.minPrice < p.price ? (
                        <>
                          <span className="text-red-700">{dt(p.minPrice)}</span>
                          <span className="block text-[12px] text-neutral-400 line-through">{dt(p.price)}</span>
                        </>
                      ) : (
                        dt(p.minPrice || p.price)
                      )}
                    </td>
                    <td className={cn("text-right tabular-nums", p.totalAvailable === 0 && "font-semibold text-red-600")}>{p.totalAvailable === 0 ? "Rupture" : p.totalAvailable}</td>
                    <td className="text-right tabular-nums">{p.soldCount}</td>
                    <td>
                      <Badge status={p.status}>{PRODUCT_STATUS_LABELS[p.status]}</Badge>
                    </td>
                    <td>
                      <ProductRowActions id={p.id} slug={p.slug} name={p.name} published={p.status === "PUBLISHED"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            action={
              <Link href="/admin/products/new" className="a-btn-primary">
                <Plus className="h-4 w-4" /> Créer un produit
              </Link>
            }
          >
            Aucun produit ne correspond à ces critères.
          </Empty>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/products" params={params} />
      </Card>
    </>
  );
}
