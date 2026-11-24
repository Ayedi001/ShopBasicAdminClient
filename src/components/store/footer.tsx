import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube, Clock, Truck, Banknote, RefreshCw, Headphones } from "lucide-react";
import type { NavCategory } from "@/server/catalog";
import type { StoreSettings } from "@/server/settings";
import type { TFunction } from "@/i18n";
import { formatPhone, whatsappDigits } from "@/lib/phone";
import { safeHref } from "@/lib/utils";

function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1 0-5.2c.27 0 .53.04.78.12V9.66a5.73 5.73 0 0 0-.78-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.25-1.48Z" />
    </svg>
  );
}

export function Perks({ t }: { t: TFunction }) {
  const perks = [
    { icon: Truck, label: t("home.perks.delivery") },
    { icon: Banknote, label: t("home.perks.payment") },
    { icon: RefreshCw, label: t("home.perks.exchange") },
    { icon: Headphones, label: t("home.perks.support") },
  ];
  return (
    <div className="border-y border-neutral-200 bg-paper">
      <ul className="container-x grid grid-cols-2 gap-y-5 py-6 lg:grid-cols-4">
        {perks.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center justify-center gap-3 text-[13px] text-neutral-700">
            <Icon className="h-5 w-5 shrink-0 text-brand-accent" strokeWidth={1.5} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ store, nav, t }: { store: StoreSettings; nav: NavCategory[]; t: TFunction }) {
  const socials = [
    { href: store.social.facebook, icon: Facebook, label: "Facebook" },
    { href: store.social.instagram, icon: Instagram, label: "Instagram" },
    { href: store.social.tiktok, icon: TikTok, label: "TikTok" },
    { href: store.social.youtube, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.href);
  const help = [
    { href: "/pages/contact", label: t("footer.contact") },
    { href: "/pages/faq", label: t("footer.faq") },
    { href: "/pages/shipping", label: t("footer.shipping") },
    { href: "/pages/returns", label: t("footer.returns") },
    { href: "/size-guide", label: t("footer.sizeGuide") },
    { href: "/track-order", label: t("footer.trackOrder") },
  ];
  const legal = [
    { href: "/pages/about", label: t("footer.about") },
    { href: "/pages/privacy", label: t("footer.privacy") },
    { href: "/pages/terms", label: t("footer.terms") },
  ];
  return (
    <footer className="mt-14 bg-brand text-white/80">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-semibold uppercase tracking-[0.18em] text-white">{store.name}</p>
          {store.tagline && <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{store.tagline}</p>}
          <ul className="mt-4 space-y-2 text-sm">
            {store.phone && (
              <li>
                <a href={`tel:${store.phone}`} className="flex items-center gap-2.5 hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" /> <span dir="ltr">{formatPhone(store.phone)}</span>
                </a>
              </li>
            )}
            {store.whatsapp && (
              <li>
                <a href={`https://wa.me/${whatsappDigits(store.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-white">
                  <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp <span dir="ltr">{formatPhone(store.whatsapp)}</span>
                </a>
              </li>
            )}
            {store.email && (
              <li>
                <a href={`mailto:${store.email}`} className="flex items-center gap-2.5 hover:text-white">
                  <Mail className="h-4 w-4 shrink-0" /> {store.email}
                </a>
              </li>
            )}
            {store.address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {store.mapUrl ? (
                  <a href={safeHref(store.mapUrl)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {store.address}
                  </a>
                ) : (
                  <span>{store.address}</span>
                )}
              </li>
            )}
            {store.openingHours && (
              <li className="flex items-start gap-2.5 text-white/70">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="whitespace-pre-line">{store.openingHours}</span>
              </li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a key={label} href={safeHref(href)} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-9 w-9 items-center justify-center border border-white/25 transition hover:border-white hover:text-white">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-3 text-[12px] font-medium uppercase tracking-widest2 text-white">{t("footer.shop")}</p>
          <ul className="space-y-2 text-sm">
            {nav.map((c) => (
              <li key={c.slug}>
                <Link href={`/c/${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop?new=1&sort=newest" className="hover:text-white">
                {t("common.newArrivals")}
              </Link>
            </li>
            <li>
              <Link href="/shop?sale=1" className="hover:text-white">
                {t("common.onSale")}
              </Link>
            </li>
            <li>
              <Link href="/collections" className="hover:text-white">
                {t("common.collections")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-medium uppercase tracking-widest2 text-white">{t("footer.help")}</p>
          <ul className="space-y-2 text-sm">
            {help.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-4 text-[12px] text-white/60 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {store.name}. {t("footer.rights")}
          </p>
          <p>{t("home.perks.payment")}</p>
        </div>
      </div>
    </footer>
  );
}
