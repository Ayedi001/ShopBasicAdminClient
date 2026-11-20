import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost, Noto_Kufi_Arabic } from "next/font/google";
import { getI18n } from "@/server/i18n";
import { getSetting } from "@/server/settings";
import { isRtl } from "@/i18n";
import "./globals.css";

const sans = Jost({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const arabic = Noto_Kufi_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap" });

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getSetting("store");
  return {
    metadataBase: new URL(APP_URL),
    title: { default: `${store.name} — ${store.tagline || "Boutique en ligne"}`, template: `%s | ${store.name}` },
    description: store.tagline || `${store.name}, boutique de vêtements en ligne en Tunisie.`,
    icons: store.faviconUrl ? { icon: store.faviconUrl } : undefined,
    openGraph: { siteName: store.name, type: "website", locale: "fr_TN" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, store] = await Promise.all([getI18n(), getSetting("store")]);
  const style = {
    "--brand": hexToRgb(store.primaryColor),
    "--brand-accent": hexToRgb(store.accentColor),
  } as React.CSSProperties;
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className={`${sans.variable} ${display.variable} ${arabic.variable}`} style={style}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
