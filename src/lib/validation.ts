import { z } from "zod";
import {
  AUDIENCES,
  COUPON_SCOPES,
  DISCOUNT_TYPES,
  FIT_TYPES,
  MANUAL_STOCK_TYPES,
  ORDER_STATUSES,
  PERMISSIONS,
  PRODUCT_STATUSES,
  PROMOTION_SCOPES,
  RETURN_REASONS,
  RETURN_STATUSES,
  RETURN_TYPES,
  SEASONS,
  SIZE_TYPES,
  STAFF_ROLES,
} from "./constants";
import { isValidPhone } from "./phone";

// Error messages are translation keys (see src/i18n) so the same schema can
// be used for French/Arabic/English forms and for API responses.

const trimmed = (max: number) => z.string().trim().max(max, "err.tooLong");
const required = (max: number) => trimmed(max).min(1, "err.required");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "err.tooLong")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const phoneField = z.string().trim().min(1, "err.required").refine((v) => isValidPhone(v), "err.phone");
export const emailField = z.string().trim().toLowerCase().min(1, "err.required").max(160).email("err.email");
export const passwordField = z
  .string()
  .min(8, "err.passwordShort")
  .max(128, "err.tooLong")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "err.passwordWeak");

export const registerSchema = z
  .object({
    fullName: required(100).min(3, "err.nameShort"),
    phone: phoneField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "err.passwordMismatch" });

export const loginSchema = z.object({
  identifier: required(160),
  password: z.string().min(1, "err.required").max(128),
  remember: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
  fullName: required(100).min(3, "err.nameShort"),
  phone: phoneField,
  email: emailField,
  address: optionalText(300),
  city: optionalText(100),
  regionId: optionalText(40),
  postalCode: optionalText(10),
  deliveryInstructions: optionalText(500),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "err.required"),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "err.passwordMismatch" });

export const cartAddSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.number().int().min(1, "err.quantity").max(20, "err.quantity"),
});
export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(20, "err.quantity"),
});

export const checkoutSchema = z
  .object({
    fullName: required(100).min(3, "err.nameShort"),
    phone: phoneField,
    deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
    address: trimmed(300).optional().default(""),
    city: trimmed(100).optional().default(""),
    regionId: trimmed(40).optional().default(""),
    postalCode: optionalText(10),
    deliveryInstructions: optionalText(500),
    couponCode: optionalText(40),
    saveAddress: z.boolean().optional().default(true),
    /** Total displayed to the customer; the order is refused if it changed. */
    expectedTotal: z.number().int().nonnegative().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.deliveryMethod === "DELIVERY") {
      if (d.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "err.address" });
      if (d.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "err.required" });
      if (!d.regionId) ctx.addIssue({ code: "custom", path: ["regionId"], message: "err.required" });
    }
  });

export const couponCheckSchema = z.object({ code: required(40) });

export const contactSchema = z
  .object({
    name: required(100),
    email: z.string().trim().max(160).email("err.email").optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    subject: required(150),
    message: required(3000).min(10, "err.messageShort"),
  })
  .refine((d) => !!d.email || (!!d.phone && isValidPhone(d.phone)), { path: ["phone"], message: "err.contactNeeded" });

export const trackOrderSchema = z.object({ number: required(40), phone: phoneField });

export const returnRequestSchema = z.object({
  orderNumber: required(40),
  type: z.enum(RETURN_TYPES),
  reason: z.enum(RETURN_REASONS),
  description: optionalText(1000),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(50),
        requestedSize: optionalText(30),
      }),
    )
    .min(1, "err.selectItem"),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: optionalText(120),
  body: required(2000).min(10, "err.messageShort"),
});

// ─────────────── Admin schemas ───────────────

const money = z.number().int().min(0).max(100_000_000);
const optionalMoney = money.optional().nullable();
const idList = z.array(z.string().min(1).max(40)).max(1000).default([]);

export const productSchema = z
  .object({
    name: required(150).min(2),
    slug: trimmed(100).optional().default(""),
    sku: optionalText(60),
    shortDescription: optionalText(300),
    description: required(10000),
    audience: z.enum(AUDIENCES),
    categoryId: required(40),
    subcategoryId: optionalText(40),
    brandName: optionalText(80),
    collectionId: optionalText(40),
    season: z.enum(SEASONS).default("ALL"),
    fitType: z.enum(FIT_TYPES).optional().nullable(),
    weightGrams: z.number().int().min(0).max(100000).optional().nullable(),
    careInstructions: optionalText(2000),
    countryOfOrigin: optionalText(80),
    characteristics: optionalText(3000),
    price: money.min(1, "Le prix doit être supérieur à 0"),
    salePrice: optionalMoney,
    status: z.enum(PRODUCT_STATUSES).default("DRAFT"),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isOnSale: z.boolean().default(false),
    sizeChartId: optionalText(40),
    metaTitle: optionalText(160),
    metaDescription: optionalText(320),
    materials: z
      .array(z.object({ materialName: required(60), percentage: z.number().int().min(1).max(100) }))
      .max(10)
      .default([]),
    translations: z
      .array(
        z.object({
          locale: z.enum(["ar", "en"]),
          name: trimmed(150),
          shortDescription: optionalText(300),
          description: optionalText(10000),
          careInstructions: optionalText(2000),
        }),
      )
      .max(2)
      .default([]),
  })
  .superRefine((d, ctx) => {
    if (d.salePrice != null && d.salePrice >= d.price) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Le prix promotionnel doit être inférieur au prix" });
    }
    const total = d.materials.reduce((s, m) => s + m.percentage, 0);
    if (d.materials.length && total !== 100) {
      ctx.addIssue({ code: "custom", path: ["materials"], message: `La composition doit totaliser 100% (actuellement ${total}%)` });
    }
  });
export type ProductInput = z.infer<typeof productSchema>;

export const variantRowSchema = z.object({
  id: z.string().max(40).optional().nullable(),
  colorId: z.string().max(40).optional().nullable(),
  sizeId: z.string().max(40).optional().nullable(),
  sku: optionalText(60),
  price: optionalMoney,
  salePrice: optionalMoney,
  /** Initial stock for new variants only (existing stock changes go through inventory adjustments) */
  stock: z.number().int().min(0).max(100000).optional().default(0),
  isActive: z.boolean().default(true),
});
export const variantsSchema = z.object({ variants: z.array(variantRowSchema).max(300) });

export const categorySchema = z.object({
  name: required(80),
  nameAr: optionalText(80),
  nameEn: optionalText(80),
  slug: trimmed(80).optional().default(""),
  audience: z.enum(AUDIENCES),
  description: optionalText(500),
  imageUrl: optionalText(500),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
  sizeChartId: optionalText(40),
});

export const subcategorySchema = z.object({
  categoryId: required(40),
  name: required(80),
  nameAr: optionalText(80),
  nameEn: optionalText(80),
  slug: trimmed(80).optional().default(""),
  productType: optionalText(60),
  sizeType: z.enum(SIZE_TYPES).default("CLOTHING"),
  imageUrl: optionalText(500),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
  sizeChartId: optionalText(40),
});

export const colorSchema = z.object({
  name: required(40),
  nameAr: optionalText(40),
  nameEn: optionalText(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale invalide"),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export const sizeSchema = z.object({
  label: required(20),
  type: z.enum(SIZE_TYPES),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
export const namedSchema = z.object({ name: required(60), nameAr: optionalText(60), nameEn: optionalText(60) });

export const collectionSchema = z.object({
  name: required(80),
  nameAr: optionalText(80),
  nameEn: optionalText(80),
  slug: trimmed(80).optional().default(""),
  description: optionalText(1000),
  season: z.enum(SEASONS).default("ALL"),
  imageUrl: optionalText(500),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const sizeChartSchema = z.object({
  name: required(100),
  nameAr: optionalText(100),
  nameEn: optionalText(100),
  description: optionalText(1000),
  unit: z.enum(["cm", "in", "EU"]).default("cm"),
  columns: z.array(required(40)).min(1).max(10),
  rows: z.array(z.object({ size: required(20), values: z.array(trimmed(30)) })).min(1).max(40),
});

export const orderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    note: optionalText(1000),
    cancellationReason: optionalText(500),
  })
  .refine((d) => d.status !== "CANCELLED" || !!d.cancellationReason, {
    path: ["cancellationReason"],
    message: "Le motif d'annulation est obligatoire",
  });

export const orderDeliverySchema = z.object({
  deliveryCompany: optionalText(100),
  trackingNumber: optionalText(100),
  deliveryNotes: optionalText(1000),
  deliveredAt: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
});

export const orderNoteSchema = z.object({ body: required(2000) });

export const stockAdjustSchema = z.object({
  variantId: required(40),
  mode: z.enum(["DELTA", "SET"]),
  quantity: z.number().int().min(-100000).max(100000),
  type: z.enum(MANUAL_STOCK_TYPES),
  reason: required(300),
});
export const bulkStockSchema = z.object({
  reason: required(300),
  type: z.enum(MANUAL_STOCK_TYPES),
  items: z.array(z.object({ variantId: required(40), stock: z.number().int().min(0).max(100000) })).min(1).max(500),
});

const dateField = z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")).transform((v) => (v ? new Date(v) : null));

export const promotionSchema = z
  .object({
    name: required(100),
    description: optionalText(500),
    type: z.enum(DISCOUNT_TYPES),
    value: z.number().int().min(1),
    scope: z.enum(PROMOTION_SCOPES),
    startsAt: dateField,
    endsAt: dateField,
    isActive: z.boolean().default(true),
    productIds: idList,
    categoryIds: idList,
    subcategoryIds: idList,
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 90, { path: ["value"], message: "Pourcentage maximum : 90%" })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt, { path: ["endsAt"], message: "La date de fin doit suivre la date de début" });

export const couponSchema = z
  .object({
    code: required(40).regex(/^[A-Za-z0-9_-]+$/, "Lettres, chiffres, - et _ uniquement").transform((c) => c.toUpperCase()),
    description: optionalText(300),
    type: z.enum(DISCOUNT_TYPES),
    value: z.number().int().min(1),
    minOrderAmount: money.default(0),
    maxUses: z.number().int().min(1).optional().nullable(),
    maxUsesPerUser: z.number().int().min(1).optional().nullable(),
    scope: z.enum(COUPON_SCOPES),
    startsAt: dateField,
    expiresAt: dateField,
    isActive: z.boolean().default(true),
    productIds: idList,
    categoryIds: idList,
  })
  .refine((d) => d.type !== "PERCENT" || d.value <= 90, { path: ["value"], message: "Pourcentage maximum : 90%" });

export const deliveryRegionSchema = z.object({
  name: required(80),
  nameAr: optionalText(80),
  fee: money,
  estimatedDays: optionalText(40),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const returnUpdateSchema = z.object({
  status: z.enum(RETURN_STATUSES).optional(),
  adminNotes: optionalText(2000),
  rejectionReason: optionalText(500),
  replacementNote: optionalText(500),
  restock: z.boolean().optional(),
  replacements: z
    .array(z.object({ returnItemId: required(40), replacementVariantId: optionalText(40) }))
    .max(50)
    .optional(),
});

export const reviewModerationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  adminReply: optionalText(2000),
});

export const staffSchema = z.object({
  fullName: required(100),
  email: emailField,
  phone: phoneField,
  role: z.enum(STAFF_ROLES),
  password: passwordField.optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  permissions: z.array(z.enum(PERMISSIONS)).optional().nullable(),
});

export const bannerSchema = z.object({
  placement: z.enum(["HERO", "PROMO", "CATEGORY"]),
  title: required(120),
  titleAr: optionalText(120),
  titleEn: optionalText(120),
  subtitle: optionalText(300),
  subtitleAr: optionalText(300),
  subtitleEn: optionalText(300),
  ctaLabel: optionalText(40),
  ctaLabelAr: optionalText(40),
  ctaLabelEn: optionalText(40),
  linkUrl: optionalText(500),
  imageUrl: required(500),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
  startsAt: dateField,
  endsAt: dateField,
});

export const homeSectionSchema = z.object({
  title: optionalText(120),
  titleAr: optionalText(120),
  titleEn: optionalText(120),
  subtitle: optionalText(300),
  subtitleAr: optionalText(300),
  subtitleEn: optionalText(300),
  isVisible: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
  config: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});

export const contentPageSchema = z.object({
  title: required(150),
  body: required(30000),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
