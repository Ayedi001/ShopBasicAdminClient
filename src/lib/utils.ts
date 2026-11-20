import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(d: Date | string, locale = "fr", withTime = false): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const intlLocale = locale === "ar" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-FR";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    numberingSystem: "latn",
  }).format(date);
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Only allow internal links or http(s) URLs in admin-configured links. */
export function safeHref(href: string | null | undefined): string {
  if (!href) return "#";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^(tel|mailto):/i.test(href)) return href;
  return "#";
}

export function toArray(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean);
}
