export const AUDIENCES = ["MEN", "WOMEN", "KIDS", "UNISEX", "BABY"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const SEASONS = ["ALL", "SPRING", "SUMMER", "AUTUMN", "WINTER"] as const;
export type Season = (typeof SEASONS)[number];

export const FIT_TYPES = ["SLIM", "REGULAR", "OVERSIZED", "RELAXED"] as const;
export type FitType = (typeof FIT_TYPES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SIZE_TYPES = ["CLOTHING", "SHOES", "AGE", "ONE_SIZE", "OTHER"] as const;
export type SizeType = (typeof SIZE_TYPES)[number];

export const IMAGE_VIEWS = ["FRONT", "BACK", "SIDE", "DETAIL", "OTHER"] as const;

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed manual transitions. Cancelling is possible until delivery. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "SHIPPED", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Statuses that count as "real" sales in reports (stock deducted, not cancelled). */
export const COMMITTED_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];
/** Revenue is only recognised for successfully completed orders. */
export const COMPLETED_ORDER_STATUSES: OrderStatus[] = ["DELIVERED"];

export const RETURN_TYPES = ["RETURN", "EXCHANGE"] as const;
export const RETURN_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "COMPLETED", "CANCELLED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["RECEIVED", "COMPLETED", "CANCELLED"],
  RECEIVED: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};
export const RETURN_REASONS = ["WRONG_SIZE", "DEFECTIVE", "NOT_AS_DESCRIBED", "CHANGED_MIND", "WRONG_ITEM", "OTHER"] as const;

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export const STOCK_MOVEMENT_TYPES = [
  "INITIAL",
  "RESTOCK",
  "ADJUSTMENT",
  "DAMAGED",
  "CORRECTION",
  "ORDER_CONFIRMED",
  "ORDER_CANCELLED",
  "RETURN",
  "EXCHANGE_OUT",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
/** Types an administrator may pick for a manual adjustment. */
export const MANUAL_STOCK_TYPES = ["RESTOCK", "ADJUSTMENT", "DAMAGED", "CORRECTION", "RETURN"] as const;

export const DISCOUNT_TYPES = ["PERCENT", "FIXED"] as const;
export const PROMOTION_SCOPES = ["ALL", "PRODUCTS", "CATEGORIES", "SUBCATEGORIES"] as const;
export const COUPON_SCOPES = ["ALL", "PRODUCTS", "CATEGORIES"] as const;

export const HOME_SECTION_TYPES = [
  "HERO",
  "CATEGORY_TILES",
  "COLLECTIONS",
  "NEW_ARRIVALS",
  "BEST_SELLERS",
  "ON_SALE",
  "FEATURED",
  "PROMO_TEXT",
  "RECENTLY_VIEWED",
] as const;
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export const CONTENT_PAGES = ["about", "contact", "faq", "shipping", "returns", "privacy", "terms"] as const;
export type ContentPageSlug = (typeof CONTENT_PAGES)[number];

export const LOCALES = ["fr", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

// ─────────────── Roles & permissions ───────────────

export const STAFF_ROLES = ["OWNER", "MANAGER", "EMPLOYEE"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type Role = StaffRole | "CUSTOMER";

export const PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.update",
  "orders.cancel",
  "products.manage",
  "categories.manage",
  "inventory.manage",
  "promotions.manage",
  "customers.view",
  "reviews.manage",
  "returns.manage",
  "content.manage",
  "settings.manage",
  "reports.view",
  "staff.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  OWNER: [...PERMISSIONS],
  MANAGER: [
    "dashboard.view",
    "orders.view",
    "orders.update",
    "orders.cancel",
    "products.manage",
    "categories.manage",
    "inventory.manage",
    "promotions.manage",
    "customers.view",
    "reviews.manage",
    "returns.manage",
    "content.manage",
    "reports.view",
  ],
  EMPLOYEE: ["dashboard.view", "orders.view", "orders.update", "customers.view", "returns.manage"],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view": "Voir le tableau de bord",
  "orders.view": "Voir les commandes",
  "orders.update": "Mettre à jour les commandes",
  "orders.cancel": "Annuler des commandes",
  "products.manage": "Gérer les produits",
  "categories.manage": "Gérer les catégories et attributs",
  "inventory.manage": "Gérer le stock",
  "promotions.manage": "Gérer promotions et coupons",
  "customers.view": "Voir les clients",
  "reviews.manage": "Modérer les avis",
  "returns.manage": "Gérer retours et échanges",
  "content.manage": "Gérer contenu et page d'accueil",
  "settings.manage": "Paramètres de la boutique",
  "reports.view": "Rapports et exports",
  "staff.manage": "Gérer l'équipe",
  "audit.view": "Journal d'audit",
};

export function permissionsFor(role: string, override?: string | null): Set<Permission> {
  if (role === "OWNER") return new Set(PERMISSIONS);
  if (!STAFF_ROLES.includes(role as StaffRole)) return new Set();
  if (override) {
    const list = override.split(",").map((p) => p.trim()).filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
    // staff.manage is reserved to owners regardless of overrides
    return new Set(list.filter((p) => p !== "staff.manage"));
  }
  return new Set(ROLE_PERMISSIONS[role as StaffRole]);
}

export const isStaffRole = (role: string): role is StaffRole => (STAFF_ROLES as readonly string[]).includes(role);
