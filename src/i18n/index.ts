import { fr, type Dictionary } from "./fr";
import { en } from "./en";
import { ar } from "./ar";
import type { Locale } from "@/lib/constants";

export const dictionaries: Record<Locale, Dictionary> = { fr, en, ar };
export type { Dictionary };

export const LOCALE_COOKIE = "ms_locale";
export const CURRENCY_COOKIE = "ms_currency";

export const LOCALE_LABELS: Record<Locale, string> = { fr: "Français", ar: "العربية", en: "English" };

export function isRtl(locale: string) {
  return locale === "ar";
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function createT(dict: Dictionary): TFunction {
  return (key, vars) => {
    let node: unknown = dict;
    for (const part of key.split(".")) {
      if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        node = undefined;
        break;
      }
    }
    let str = typeof node === "string" ? node : key.startsWith("err.") ? dict.err.generic : key;
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v));
    return str;
  };
}

/** Pick the translated name for entities with name / nameAr / nameEn columns. */
export function localized<T extends { name: string; nameAr?: string | null; nameEn?: string | null }>(entity: T, locale: string) {
  if (locale === "ar" && entity.nameAr) return entity.nameAr;
  if (locale === "en" && entity.nameEn) return entity.nameEn;
  return entity.name;
}

export function localizedField(base: string | null | undefined, ar: string | null | undefined, en: string | null | undefined, locale: string) {
  if (locale === "ar" && ar) return ar;
  if (locale === "en" && en) return en;
  return base ?? "";
}
