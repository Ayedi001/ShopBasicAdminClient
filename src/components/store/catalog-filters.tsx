"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X, Loader2 } from "lucide-react";
import type { Facets } from "@/server/catalog";
import { useStore } from "./store-provider";
import { cn } from "@/lib/utils";

type Fixed = { audience?: boolean; category?: boolean; sub?: boolean };

function useParamsState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const push = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mutate(p);
    p.delete("page");
    const qs = p.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const toggle = (k: string, v: string) =>
    push((p) => {
      const cur = new Set((p.get(k) ?? "").split(",").filter(Boolean));
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      if (cur.size) p.set(k, [...cur].join(","));
      else p.delete(k);
    });
  const set = (k: string, v: string | null) => push((p) => (v ? p.set(k, v) : p.delete(k)));
  return { sp, list, toggle, set, push, pending, pathname };
}

function Group({ title, children, defaultOpen = true, count }: { title: string; children: React.ReactNode; defaultOpen?: boolean; count?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-200 py-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-[13px] font-medium uppercase tracking-[0.12em]" aria-expanded={open}>
        <span>
          {title}
          {count ? <span className="ms-1.5 text-ink-muted">({count})</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

function Check({ checked, onChange, label, swatch }: { checked: boolean; onChange: () => void; label: string; swatch?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px] text-neutral-700 hover:text-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[rgb(var(--brand))]" />
      {swatch && <span className="h-4 w-4 rounded-full ring-1 ring-black/15" style={{ backgroundColor: swatch }} />}
      <span>{label}</span>
    </label>
  );
}

function SizeButtons({ values, selected, onToggle }: { values: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onToggle(v)}
          aria-pressed={selected.includes(v)}
          className={cn("min-w-11 border px-2.5 py-1.5 text-[13px] transition", selected.includes(v) ? "border-brand bg-brand text-white" : "border-neutral-300 hover:border-brand")}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function PriceRange({ min, max }: { min: number; max: number }) {
  const { t } = useStore();
  const { sp, push } = useParamsState();
  const [lo, setLo] = useState(sp.get("min") ?? "");
  const [hi, setHi] = useState(sp.get("max") ?? "");
  useEffect(() => {
    setLo(sp.get("min") ?? "");
    setHi(sp.get("max") ?? "");
  }, [sp]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        push((p) => {
          if (lo) p.set("min", String(Math.max(0, Number(lo)))); else p.delete("min");
          if (hi) p.set("max", String(Math.max(0, Number(hi)))); else p.delete("max");
        });
      }}
      className="flex items-end gap-2"
    >
      <label className="flex-1">
        <span className="mb-1 block text-[12px] text-ink-muted">{t("catalog.min")} (DT)</span>
        <input type="number" inputMode="numeric" min={0} value={lo} placeholder={String(min)} onChange={(e) => setLo(e.target.value)} className="input py-2 text-sm" />
      </label>
      <label className="flex-1">
        <span className="mb-1 block text-[12px] text-ink-muted">{t("catalog.max")} (DT)</span>
        <input type="number" inputMode="numeric" min={0} value={hi} placeholder={String(max)} onChange={(e) => setHi(e.target.value)} className="input py-2 text-sm" />
      </label>
      <button className="btn-outline btn-sm h-[38px]">{t("common.apply")}</button>
    </form>
  );
}

function FilterBody({ facets, fixed, categorySlug }: { facets: Facets; fixed: Fixed; categorySlug?: string }) {
  const { t } = useStore();
  const { list, toggle, set, sp } = useParamsState();
  const audiences = ["WOMEN", "MEN", "KIDS"];
  const currentCat = categorySlug ?? sp.get("category") ?? undefined;
  const subs = facets.categories.find((c) => c.slug === currentCat)?.subcategories ?? [];
  return (
    <div>
      {!fixed.audience && !fixed.category && (
        <Group title={t("catalog.audience")} defaultOpen={list("audience").length > 0}>
          {audiences.map((a) => (
            <Check key={a} label={t(`audience.${a}`)} checked={list("audience").includes(a)} onChange={() => toggle("audience", a)} />
          ))}
        </Group>
      )}
      {!fixed.category && (
        <Group title={t("catalog.category")}>
          <div className="space-y-1">
            {facets.categories.map((c) => (
              <label key={c.slug} className="flex cursor-pointer items-center gap-2.5 py-1 text-[14px] text-neutral-700">
                <input type="radio" name="category" checked={sp.get("category") === c.slug} onChange={() => set("category", c.slug)} className="accent-[rgb(var(--brand))]" />
                {c.name}
              </label>
            ))}
            {sp.get("category") && (
              <button type="button" onClick={() => set("category", null)} className="mt-1 text-[13px] underline">
                {t("common.clear")}
              </button>
            )}
          </div>
        </Group>
      )}
      {!fixed.sub && subs.length > 0 && (
        <Group title={t("catalog.subcategory")} count={list("sub").length}>
          {subs.map((s) => (
            <Check key={s.slug} label={s.name} checked={list("sub").includes(s.slug)} onChange={() => toggle("sub", s.slug)} />
          ))}
        </Group>
      )}
      <Group title={t("catalog.availability")} defaultOpen={sp.get("stock") === "1" || sp.get("sale") === "1" || sp.get("new") === "1"}>
        <Check label={t("catalog.inStockOnly")} checked={sp.get("stock") === "1"} onChange={() => set("stock", sp.get("stock") === "1" ? null : "1")} />
        <Check label={t("catalog.discountedOnly")} checked={sp.get("sale") === "1"} onChange={() => set("sale", sp.get("sale") === "1" ? null : "1")} />
        <Check label={t("catalog.newOnly")} checked={sp.get("new") === "1"} onChange={() => set("new", sp.get("new") === "1" ? null : "1")} />
      </Group>
      {facets.clothingSizes.length > 0 && (
        <Group title={t("catalog.clothingSize")} count={list("size").length}>
          <SizeButtons values={facets.clothingSizes} selected={list("size")} onToggle={(v) => toggle("size", v)} />
        </Group>
      )}
      {facets.shoeSizes.length > 0 && (
        <Group title={t("catalog.shoeSize")} count={list("shoe").length} defaultOpen={false}>
          <SizeButtons values={facets.shoeSizes} selected={list("shoe")} onToggle={(v) => toggle("shoe", v)} />
        </Group>
      )}
      {facets.ageSizes.length > 0 && (
        <Group title={t("catalog.ageSize")} count={list("age").length} defaultOpen={false}>
          <SizeButtons values={facets.ageSizes} selected={list("age")} onToggle={(v) => toggle("age", v)} />
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title={t("catalog.color")} count={list("color").length}>
          <div className="grid grid-cols-2 gap-x-2">
            {facets.colors.map((c) => (
              <Check key={c.slug} label={c.name} swatch={c.hex} checked={list("color").includes(c.slug)} onChange={() => toggle("color", c.slug)} />
            ))}
          </div>
        </Group>
      )}
      <Group title={t("catalog.price")} defaultOpen={!!(sp.get("min") || sp.get("max"))}>
        <PriceRange min={facets.priceMin} max={facets.priceMax} />
      </Group>
      {facets.materials.length > 0 && (
        <Group title={t("catalog.material")} count={list("material").length} defaultOpen={false}>
          {facets.materials.map((m) => (
            <Check key={m.value} label={m.name} checked={list("material").includes(m.value)} onChange={() => toggle("material", m.value)} />
          ))}
        </Group>
      )}
      {facets.brands.length > 0 && (
        <Group title={t("catalog.brand")} count={list("brand").length} defaultOpen={false}>
          {facets.brands.map((b) => (
            <Check key={b.value} label={b.name} checked={list("brand").includes(b.value)} onChange={() => toggle("brand", b.value)} />
          ))}
        </Group>
      )}
    </div>
  );
}

const FILTER_KEYS = ["audience", "category", "sub", "size", "shoe", "age", "color", "material", "brand", "min", "max", "stock", "sale", "new", "season"];

export function CatalogToolbar({ facets, fixed, categorySlug, total, sort, hasQuery }: { facets: Facets; fixed: Fixed; categorySlug?: string; total: number; sort: string; hasQuery: boolean }) {
  const { t, money } = useStore();
  const { sp, set, push, pending, pathname } = useParamsState();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const chips: { key: string; value?: string; label: string }[] = [];
  const lookup = {
    color: (v: string) => facets.colors.find((c) => c.slug === v)?.name ?? v,
    material: (v: string) => facets.materials.find((m) => m.value === v)?.name ?? v,
    brand: (v: string) => facets.brands.find((b) => b.value === v)?.name ?? v,
    sub: (v: string) => facets.categories.flatMap((c) => c.subcategories).find((s) => s.slug === v)?.name ?? v,
    audience: (v: string) => t(`audience.${v.toUpperCase()}`),
    category: (v: string) => facets.categories.find((c) => c.slug === v)?.name ?? v,
  } as Record<string, (v: string) => string>;
  for (const k of ["audience", "category", "sub", "size", "shoe", "age", "color", "material", "brand"]) {
    if ((k === "audience" && fixed.audience) || (k === "category" && fixed.category) || (k === "sub" && fixed.sub)) continue;
    for (const v of (sp.get(k) ?? "").split(",").filter(Boolean)) chips.push({ key: k, value: v, label: lookup[k] ? lookup[k](v) : v });
  }
  if (sp.get("min")) chips.push({ key: "min", label: `≥ ${money(Number(sp.get("min")) * 1000)}` });
  if (sp.get("max")) chips.push({ key: "max", label: `≤ ${money(Number(sp.get("max")) * 1000)}` });
  if (sp.get("stock") === "1") chips.push({ key: "stock", label: t("catalog.inStockOnly") });
  if (sp.get("sale") === "1") chips.push({ key: "sale", label: t("catalog.discountedOnly") });
  if (sp.get("new") === "1") chips.push({ key: "new", label: t("catalog.newOnly") });

  const removeChip = (c: (typeof chips)[number]) =>
    push((p) => {
      if (!c.value) return p.delete(c.key);
      const rest = (p.get(c.key) ?? "").split(",").filter((x) => x && x !== c.value);
      if (rest.length) p.set(c.key, rest.join(","));
      else p.delete(c.key);
    });

  const sorts = [
    ["relevance", hasQuery ? t("catalog.sortRelevance") : t("common.featured")],
    ["newest", t("catalog.sortNewest")],
    ["bestsellers", t("catalog.sortBestSellers")],
    ["price_asc", t("catalog.sortPriceAsc")],
    ["price_desc", t("catalog.sortPriceDesc")],
  ];

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:px-0 lg:py-0">
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] lg:hidden">
          <SlidersHorizontal className="h-4 w-4" /> {t("common.filters")}
          {chips.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">{chips.length}</span>}
        </button>
        <p className="hidden items-center gap-2 text-[14px] text-ink-muted lg:flex">
          {t("catalog.products", { n: total })}
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        </p>
        <label className="flex items-center gap-2 text-[13px]">
          <span className="hidden text-ink-muted sm:inline">{t("common.sort")} :</span>
          <select value={sort} onChange={(e) => set("sort", e.target.value === "relevance" ? null : e.target.value)} className="cursor-pointer border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-brand">
            {sorts.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.key + (c.value ?? "")} onClick={() => removeChip(c)} className="chip bg-neutral-50">
              {c.label} <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <Link href={hasQuery ? `${pathname}?q=${encodeURIComponent(sp.get("q") ?? "")}` : pathname} className="ms-1 text-[13px] underline underline-offset-4">
            {t("common.clearAll")}
          </Link>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[65] lg:hidden" role="dialog" aria-modal="true" aria-label={t("common.filters")}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[88vw] max-w-sm animate-slideInLeft flex-col bg-white rtl:animate-slideInRight">
            <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-5">
              <span className="text-[13px] font-medium uppercase tracking-[0.14em]">{t("common.filters")}</span>
              <button onClick={() => setOpen(false)} className="p-2" aria-label={t("common.close")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <FilterBody facets={facets} fixed={fixed} categorySlug={categorySlug} />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-neutral-200 p-4">
              <button
                className="btn-outline"
                onClick={() =>
                  push((p) => {
                    for (const k of FILTER_KEYS) {
                      if ((k === "audience" && fixed.audience) || (k === "category" && fixed.category) || (k === "sub" && fixed.sub)) continue;
                      p.delete(k);
                    }
                  })
                }
              >
                {t("common.clearAll")}
              </button>
              <button className="btn-primary" onClick={() => setOpen(false)}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("catalog.showResults", { n: total })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterSidebar({ facets, fixed, categorySlug }: { facets: Facets; fixed: Fixed; categorySlug?: string }) {
  return (
    <aside className="hidden lg:block">
      <FilterBody facets={facets} fixed={fixed} categorySlug={categorySlug} />
    </aside>
  );
}
