/** All amounts are stored in millimes (1 TND = 1000 millimes). */

export type CurrencyConfig = {
  code: string;
  symbol: string;
  /** Units of this currency per 1 TND */
  rate: number;
  decimals: number;
};

export const BASE_CURRENCY: CurrencyConfig = { code: "TND", symbol: "DT", rate: 1, decimals: 3 };

export function toMillimes(amount: number | string): number {
  const n = typeof amount === "string" ? Number(amount.replace(",", ".")) : amount;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000);
}

export function fromMillimes(millimes: number): number {
  return millimes / 1000;
}

export function formatMoney(millimes: number, currency: CurrencyConfig = BASE_CURRENCY, locale = "fr"): string {
  const value = (millimes / 1000) * currency.rate;
  const intlLocale = locale === "ar" ? "ar-TN" : locale === "en" ? "en-GB" : "fr-TN";
  // TND prices are typically displayed without trailing zeros (45 DT, 39,900 DT)
  const isWhole = Math.abs(value - Math.round(value)) < 1e-9;
  const formatted = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: isWhole ? 0 : currency.code === "TND" ? 3 : 2,
    maximumFractionDigits: currency.code === "TND" ? 3 : 2,
    numberingSystem: "latn",
  }).format(value);
  return currency.code === "TND" ? `${formatted} ${currency.symbol}` : `${currency.symbol}${formatted}`;
}

export function discountPercent(base: number, final: number): number {
  if (base <= 0 || final >= base) return 0;
  return Math.round(((base - final) / base) * 100);
}
