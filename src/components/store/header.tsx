"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Menu, Phone, Search, ShoppingBag, User, X } from "lucide-react";
import type { NavCategory } from "@/server/catalog";
import { useStore } from "./store-provider";
import { SearchPanel } from "./search-box";
import { LOCALE_LABELS } from "@/i18n";
import { cn } from "@/lib/utils";

type HeaderProps = {
  nav: NavCategory[];
  logoUrl: string | null;
  announcement: string;
  phone: string | null;
  phoneDisplay: string | null;
  locales: string[];
};

function PreferencesSwitcher({ locales, compact }: { locales: string[]; compact?: boolean }) {
  const { locale, currency, currencies, setPreference, t } = useStore();
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2")}>
      {locales.length > 1 && (
        <label className="flex items-center gap-1">
          <span className="sr-only">{t("common.language")}</span>
          <select
            value={locale}
            onChange={(e) => setPreference({ locale: e.target.value })}
            className="cursor-pointer bg-transparent text-[12px] outline-none"
          >
            {locales.map((l) => (
              <option key={l} value={l} className="text-ink">
                {LOCALE_LABELS[l as keyof typeof LOCALE_LABELS]}
              </option>
            ))}
          </select>
        </label>
      )}
      {currencies.length > 1 && (
        <label className="flex items-center gap-1">
          <span className="sr-only">{t("common.currency")}</span>
          <select
            value={currency.code}
            onChange={(e) => setPreference({ currency: e.target.value })}
            className="cursor-pointer bg-transparent text-[12px] outline-none"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code} className="text-ink">
                {c.code}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function Header({ nav, logoUrl, announcement, phone, phoneDisplay, locales }: HeaderProps) {
  const { t, storeName, user, cartCount, setCartOpen, wishlist, unread } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
    setMega(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const extraLinks = [
    { href: "/shop?new=1&sort=newest", label: t("common.newArrivals") },
    { href: "/shop?sale=1", label: t("common.onSale"), accent: true },
  ];

  return (
    <>
      <div className="bg-brand text-white">
        <div className="container-x flex h-9 items-center justify-between gap-4 text-[12px]">
          <div className="hidden items-center gap-2 sm:flex">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 opacity-90 hover:opacity-100">
                <Phone className="h-3.5 w-3.5" /> {phoneDisplay}
              </a>
            )}
          </div>
          <p className="flex-1 truncate text-center tracking-wide sm:flex-none">{announcement}</p>
          <div className="hidden sm:block">
            <PreferencesSwitcher locales={locales} />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur" onMouseLeave={() => setMega(null)}>
        <div className="container-x flex h-16 items-center gap-4 lg:h-[72px]">
          <button className="-ms-2 p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t("common.menu")}>
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>

          <Link href="/" className="shrink-0" aria-label={storeName}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className="h-8 w-auto lg:h-10" />
            ) : (
              <span className="font-display text-2xl font-semibold uppercase tracking-[0.18em] lg:text-[28px]">{storeName}</span>
            )}
          </Link>

          <nav className="ms-8 hidden h-full items-stretch lg:flex" aria-label="Navigation principale">
            {nav.map((c) => (
              <div key={c.slug} className="flex items-stretch" onMouseEnter={() => setMega(c.slug)}>
                <Link
                  href={`/c/${c.slug}`}
                  className={cn(
                    "flex items-center border-b-2 px-4 text-[13px] font-medium uppercase tracking-[0.14em] transition",
                    mega === c.slug || pathname.startsWith(`/c/${c.slug}`) ? "border-brand" : "border-transparent hover:border-neutral-300",
                  )}
                  aria-expanded={mega === c.slug}
                  onFocus={() => setMega(c.slug)}
                >
                  {c.name}
                </Link>
              </div>
            ))}
            {extraLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onMouseEnter={() => setMega(null)}
                className={cn(
                  "flex items-center border-b-2 border-transparent px-4 text-[13px] font-medium uppercase tracking-[0.14em] hover:border-neutral-300",
                  l.accent && "text-sale",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-0.5 sm:gap-1.5">
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 p-2 hover:opacity-70" aria-label={t("common.search")}>
              <Search className="h-5 w-5" strokeWidth={1.6} />
              <span className="hidden text-[13px] text-ink-muted xl:inline">{t("common.search")}</span>
            </button>
            <Link href={user ? (user.isStaff ? "/admin" : "/account") : "/login"} className="relative hidden p-2 hover:opacity-70 sm:block" aria-label={user ? t("common.account") : t("common.login")}>
              <User className="h-5 w-5" strokeWidth={1.6} />
              {unread > 0 && <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-sale" />}
            </Link>
            {!user?.isStaff && (
              <Link
                href={user ? "/account/wishlist" : "/login?next=/account/wishlist"}
                className="relative p-2 hover:opacity-70"
                aria-label={t("common.wishlist")}
              >
                <Heart className="h-5 w-5" strokeWidth={1.6} />
                {wishlist.size > 0 && (
                  <span className="absolute -end-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] text-white">{wishlist.size}</span>
                )}
              </Link>
            )}
            <button onClick={() => setCartOpen(true)} className="relative p-2 hover:opacity-70" aria-label={`${t("common.cart")} (${cartCount})`}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
              {cartCount > 0 && (
                <span className="absolute -end-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] text-white">{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Compact category dropdown */}
        {mega && (
          <div className="absolute inset-x-0 top-full hidden animate-fadeIn border-b border-neutral-200 bg-white shadow-sm lg:block">
            {nav
              .filter((c) => c.slug === mega)
              .map((c) => (
                <div key={c.slug} className="container-x py-6">
                  <div className="mb-4 flex items-center justify-between">
                    <Link href={`/c/${c.slug}`} className="eyebrow hover:text-ink">
                      {t("common.viewAll")} — {c.name}
                    </Link>
                    <div className="flex gap-5 text-[13px]">
                      <Link href={`/c/${c.slug}?new=1&sort=newest`} className="link-underline">
                        {t("common.newArrivals")}
                      </Link>
                      <Link href={`/c/${c.slug}?sale=1`} className="link-underline text-sale">
                        {t("common.onSale")}
                      </Link>
                    </div>
                  </div>
                  <ul className="grid grid-cols-4 gap-x-6 gap-y-2">
                    {c.subcategories.map((s) => (
                      <li key={s.slug}>
                        <Link href={`/c/${c.slug}/${s.slug}`} className="text-[14px] text-neutral-700 hover:text-ink hover:underline">
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </header>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fadeIn bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[86vw] max-w-sm animate-slideInLeft flex-col bg-white rtl:animate-slideInRight">
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
              <span className="font-display text-xl font-semibold uppercase tracking-[0.18em]">{storeName}</span>
              <button onClick={() => setMobileOpen(false)} className="p-2" aria-label={t("common.close")}>
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y divide-neutral-100">
                {nav.map((c) => (
                  <li key={c.slug}>
                    <button
                      className="flex w-full items-center justify-between px-5 py-4 text-[15px] font-medium uppercase tracking-[0.12em]"
                      onClick={() => setExpanded(expanded === c.slug ? null : c.slug)}
                      aria-expanded={expanded === c.slug}
                    >
                      {c.name}
                      <ChevronDown className={cn("h-4 w-4 transition", expanded === c.slug && "rotate-180")} />
                    </button>
                    {expanded === c.slug && (
                      <ul className="bg-neutral-50 px-5 py-2">
                        <li>
                          <Link href={`/c/${c.slug}`} className="block py-2.5 font-medium">
                            {t("common.viewAll")}
                          </Link>
                        </li>
                        {c.subcategories.map((s) => (
                          <li key={s.slug}>
                            <Link href={`/c/${c.slug}/${s.slug}`} className="block py-2.5 text-neutral-700">
                              {s.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
                {extraLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={cn("block px-5 py-4 text-[15px] font-medium uppercase tracking-[0.12em]", l.accent && "text-sale")}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 border-t border-neutral-200 px-5 py-5 text-[15px]">
                <Link href={user ? (user.isStaff ? "/admin" : "/account") : "/login"} className="flex items-center gap-3">
                  <User className="h-5 w-5" strokeWidth={1.5} /> {user ? t("common.account") : `${t("common.login")} / ${t("common.register")}`}
                </Link>
                <Link href="/track-order" className="block text-neutral-600">
                  {t("footer.trackOrder")}
                </Link>
                <Link href="/pages/contact" className="block text-neutral-600">
                  {t("footer.contact")}
                </Link>
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-3 text-neutral-600">
                    <Phone className="h-4 w-4" /> {phoneDisplay}
                  </a>
                )}
              </div>
            </div>
            <div className="border-t border-neutral-200 px-5 py-4">
              <PreferencesSwitcher locales={locales} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
