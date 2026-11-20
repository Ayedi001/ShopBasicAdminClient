import { z } from "zod";
import { prisma } from "./db";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optStr = (max: number) => z.string().trim().max(max).default("");

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1).max(80).default("Maison Medina"),
  tagline: optStr(160),
  logoUrl: optStr(500),
  faviconUrl: optStr(500),
  primaryColor: hex.default("#141414"),
  accentColor: hex.default("#9a6b4b"),
  phone: optStr(30),
  whatsapp: optStr(30),
  email: optStr(160),
  address: optStr(300),
  mapUrl: optStr(500),
  openingHours: optStr(500),
  social: z
    .object({
      facebook: optStr(300),
      instagram: optStr(300),
      tiktok: optStr(300),
      youtube: optStr(300),
    })
    .default({}),
});

export const currencySchema = z.object({
  code: z.string().trim().length(3),
  symbol: z.string().trim().min(1).max(5),
  rate: z.number().positive(),
  decimals: z.number().int().min(0).max(3),
});

export const generalSettingsSchema = z.object({
  defaultLocale: z.enum(["fr", "ar", "en"]).default("fr"),
  enabledLocales: z.array(z.enum(["fr", "ar", "en"])).min(1).default(["fr", "ar", "en"]),
  defaultCurrency: z.string().length(3).default("TND"),
  currencies: z
    .array(currencySchema)
    .min(1)
    .default([
      { code: "TND", symbol: "DT", rate: 1, decimals: 3 },
      { code: "EUR", symbol: "€", rate: 0.29, decimals: 2 },
      { code: "USD", symbol: "$", rate: 0.32, decimals: 2 },
    ]),
  pricesIncludeTax: z.boolean().default(true),
  taxRate: z.number().min(0).max(50).default(19),
  taxLabel: optStr(40).default("TVA"),
  phoneCountryCode: z.string().regex(/^\d{1,4}$/).default("216"),
  phoneDigits: z.number().int().min(6).max(12).default(8),
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: optStr(500),
  lowStockThreshold: z.number().int().min(0).max(1000).default(3),
  returnPeriodDays: z.number().int().min(0).max(365).default(14),
  exchangePeriodDays: z.number().int().min(0).max(365).default(30),
  returnPolicySummary: optStr(1000),
  exchangePolicySummary: optStr(1000),
  reviewsEnabled: z.boolean().default(true),
  reviewsRequireApproval: z.boolean().default(true),
  catalogPageSize: z.number().int().min(8).max(60).default(24),
});

export const deliverySettingsSchema = z.object({
  /** Free delivery above this amount (millimes). 0 disables it. */
  freeShippingThreshold: z.number().int().min(0).default(150_000),
  pickupEnabled: z.boolean().default(true),
  pickupAddress: optStr(300),
  pickupHours: optStr(200),
  estimatedDelivery: optStr(100).default("24 à 72 heures"),
  deliveryInstructions: optStr(2000),
  paymentNote: optStr(300).default("Paiement à la livraison (espèces)."),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type DeliverySettings = z.infer<typeof deliverySettingsSchema>;

const SCHEMAS = {
  store: storeSettingsSchema,
  general: generalSettingsSchema,
  delivery: deliverySettingsSchema,
} as const;
type Key = keyof typeof SCHEMAS;
type ValueOf<K extends Key> = z.infer<(typeof SCHEMAS)[K]>;

const cache = new Map<Key, { value: unknown; at: number }>();
const TTL = 15_000;

export async function getSetting<K extends Key>(key: K): Promise<ValueOf<K>> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as ValueOf<K>;
  const row = await prisma.setting.findUnique({ where: { key } });
  let raw: unknown = {};
  if (row) {
    try {
      raw = JSON.parse(row.value);
    } catch {
      raw = {};
    }
  }
  const parsed = SCHEMAS[key].safeParse(raw);
  const value = parsed.success ? parsed.data : SCHEMAS[key].parse({});
  cache.set(key, { value, at: Date.now() });
  return value as ValueOf<K>;
}

export async function updateSetting<K extends Key>(key: K, input: unknown): Promise<ValueOf<K>> {
  const current = await getSetting(key);
  const merged = SCHEMAS[key].parse({ ...(current as object), ...(input as object) });
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  });
  cache.delete(key);
  return merged as ValueOf<K>;
}

export async function getAllSettings() {
  const [store, general, delivery] = await Promise.all([getSetting("store"), getSetting("general"), getSetting("delivery")]);
  return { store, general, delivery };
}

export async function phoneConfig() {
  const g = await getSetting("general");
  return { countryCode: g.phoneCountryCode, nationalDigits: g.phoneDigits };
}
