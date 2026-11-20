import { cache } from "react";
import { cookies } from "next/headers";
import { CURRENCY_COOKIE, LOCALE_COOKIE, createT, dictionaries } from "@/i18n";
import { LOCALES, type Locale } from "@/lib/constants";
import { getSetting } from "./settings";
import { BASE_CURRENCY, type CurrencyConfig } from "@/lib/money";

export const getI18n = cache(async () => {
  const [jar, general] = await Promise.all([cookies(), getSetting("general")]);
  const requested = jar.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const enabled = general.enabledLocales;
  const locale: Locale =
    requested && (LOCALES as readonly string[]).includes(requested) && enabled.includes(requested)
      ? requested
      : enabled.includes(general.defaultLocale)
        ? general.defaultLocale
        : enabled[0];

  const requestedCurrency = jar.get(CURRENCY_COOKIE)?.value ?? general.defaultCurrency;
  const currency: CurrencyConfig =
    general.currencies.find((c) => c.code === requestedCurrency) ??
    general.currencies.find((c) => c.code === general.defaultCurrency) ??
    BASE_CURRENCY;

  const dict = dictionaries[locale];
  return { locale, dict, t: createT(dict), currency, currencies: general.currencies, locales: enabled };
});
