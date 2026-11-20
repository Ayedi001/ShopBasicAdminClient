import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { getFacets, parseCatalogQuery, searchCatalog, type CatalogQuery } from "@/server/catalog";
import { getI18n } from "@/server/i18n";
import { getSetting } from "@/server/settings";
import { ProductGrid } from "./product-card";
import { CatalogToolbar, FilterSidebar } from "./catalog-filters";

export type Crumb = { href?: string; label: string };
type SP = Record<string, string | string[] | undefined>;

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-[12px] text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-ink hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink" aria-current="page">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function pageHref(basePath: string, sp: SP, page: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || v == null) continue;
    p.set(k, Array.isArray(v) ? v.join(",") : v);
  }
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function CatalogView({
  basePath,
  searchParams,
  fixed = {},
  title,
  description,
  crumbs,
  subNav,
}: {
  basePath: string;
  searchParams: SP;
  fixed?: Partial<CatalogQuery>;
  title: string;
  description?: string | null;
  crumbs: Crumb[];
  subNav?: { href: string; label: string; active?: boolean }[];
}) {
  const { t, locale } = await getI18n();
  const general = await getSetting("general");
  const parsed = parseCatalogQuery(searchParams);
  const query: CatalogQuery = { ...parsed, ...fixed, audience: fixed.audience ?? parsed.audience, sub: fixed.sub ?? parsed.sub };
  const [result, facets] = await Promise.all([searchCatalog(query, locale, general.catalogPageSize), getFacets(query, locale)]);
  const hasQuery = !!query.q;
  const fixedFlags = { audience: !!fixed.audience, category: !!fixed.category, sub: !!fixed.sub };
  const pages = result.pages;

  return (
    <div className="container-x pb-10 pt-6">
      <Breadcrumbs items={crumbs} />
      <header className="mb-6 mt-4 lg:mb-8">
        <h1 className="h-display text-4xl lg:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-ink-muted">{description}</p>}
        <p className="mt-2 text-[14px] text-ink-muted lg:hidden">{t("catalog.products", { n: result.total })}</p>
      </header>
      {subNav && subNav.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          {subNav.map((s) => (
            <Link key={s.href} href={s.href} className={`chip shrink-0 ${s.active ? "border-brand bg-brand text-white" : ""}`}>
              {s.label}
            </Link>
          ))}
        </div>
      )}
      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <FilterSidebar facets={facets} fixed={fixedFlags} categorySlug={fixed.category} />
        <div>
          <CatalogToolbar facets={facets} fixed={fixedFlags} categorySlug={fixed.category} total={result.total} sort={result.sort} hasQuery={hasQuery} />
          {result.items.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <SearchX className="h-10 w-10 text-ink-faint" strokeWidth={1.2} />
              <p className="h-display mt-5 text-2xl">{t("catalog.noResults")}</p>
              <p className="mt-2 max-w-sm text-ink-muted">{t("catalog.noResultsHint")}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hasQuery && (
                  <Link href="/shop" className="btn-outline">
                    {t("catalog.clearSearch")}
                  </Link>
                )}
                <Link href={basePath === "/search" ? "/shop" : basePath} className="btn-primary">
                  {t("common.clearAll")}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ProductGrid products={result.items} priorityCount={4} />
              {pages > 1 && (
                <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
                  {result.page > 1 && (
                    <Link href={pageHref(basePath, searchParams, result.page - 1)} className="flex h-10 w-10 items-center justify-center border border-neutral-300 hover:border-brand" aria-label={t("common.previous")}>
                      <ChevronLeft className="flip-rtl h-4 w-4" />
                    </Link>
                  )}
                  {Array.from({ length: pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pages || Math.abs(p - result.page) <= 1)
                    .map((p, i, arr) => (
                      <span key={p} className="flex items-center gap-2">
                        {i > 0 && p - arr[i - 1] > 1 && <span className="text-ink-faint">…</span>}
                        <Link
                          href={pageHref(basePath, searchParams, p)}
                          aria-current={p === result.page ? "page" : undefined}
                          className={`flex h-10 min-w-10 items-center justify-center border px-2 text-sm ${p === result.page ? "border-brand bg-brand text-white" : "border-neutral-300 hover:border-brand"}`}
                        >
                          {p}
                        </Link>
                      </span>
                    ))}
                  {result.page < pages && (
                    <Link href={pageHref(basePath, searchParams, result.page + 1)} className="flex h-10 w-10 items-center justify-center border border-neutral-300 hover:border-brand" aria-label={t("common.next")}>
                      <ChevronRight className="flip-rtl h-4 w-4" />
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
