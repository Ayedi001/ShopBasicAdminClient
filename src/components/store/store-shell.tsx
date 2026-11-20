import Link from "next/link";
import { getI18n } from "@/server/i18n";
import { getAllSettings } from "@/server/settings";
import { getNavigation } from "@/server/catalog";
import { getCurrentUser } from "@/server/auth/session";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { StoreProvider } from "./store-provider";
import { Header } from "./header";
import { Footer } from "./footer";
import { CartDrawer } from "./cart-drawer";

/** Shared storefront chrome (providers, header, footer, cart drawer, maintenance gate). */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  const [{ locale, dict, t, currency, currencies, locales }, settings, user] = await Promise.all([getI18n(), getAllSettings(), getCurrentUser()]);
  const { store, general, delivery } = settings;

  if (general.maintenanceMode && !user?.isStaff) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
        <p className="font-display text-4xl font-semibold uppercase tracking-[0.18em]">{store.name}</p>
        <h1 className="h-display text-3xl">{t("pages.maintenanceTitle")}</h1>
        <p className="max-w-md text-ink-muted">{general.maintenanceMessage || t("pages.maintenanceText")}</p>
        {store.phone && (
          <a href={`tel:${store.phone}`} className="btn-outline" dir="ltr">
            {formatPhone(store.phone)}
          </a>
        )}
        <Link href="/admin/login" className="mt-8 text-[12px] text-ink-faint underline">
          Espace équipe
        </Link>
      </main>
    );
  }

  const nav = await getNavigation(locale);
  const freeShip = delivery.freeShippingThreshold ? formatMoney(delivery.freeShippingThreshold, currency, locale) : null;
  const banner = freeShip
    ? locale === "ar"
      ? `توصيل مجاني ابتداءً من ${freeShip} · الدفع عند الاستلام`
      : locale === "en"
        ? `Free delivery from ${freeShip} · Cash on delivery`
        : `Livraison offerte dès ${freeShip} · Paiement à la livraison`
    : t("home.perks.payment");

  return (
    <StoreProvider
      locale={locale}
      dict={dict}
      currency={currency}
      currencies={currencies}
      storeName={store.name}
      initialUser={user ? { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, isStaff: user.isStaff } : null}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:bg-white focus:p-3">
        {t("common.skipToContent")}
      </a>
      {general.maintenanceMode && (
        <div className="bg-amber-500 py-1.5 text-center text-[12px] font-medium text-black">Mode maintenance actif — seuls les membres de l&apos;équipe voient la boutique.</div>
      )}
      <Header
        nav={nav}
        logoUrl={store.logoUrl || null}
        announcement={banner}
        phone={store.phone || null}
        phoneDisplay={store.phone ? formatPhone(store.phone) : null}
        locales={locales}
      />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer store={store} nav={nav} t={t} />
      <CartDrawer />
    </StoreProvider>
  );
}
