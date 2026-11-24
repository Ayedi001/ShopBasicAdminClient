/* eslint-disable @typescript-eslint/no-explicit-any */
// Typed Supabase table records (zero Prisma dependency).

export type UserRecord = {
  id: string | any;
  email: string | any;
  phone: string | any;
  fullName: string | any;
  passwordHash: string | any;
  role: string | any;
  permissions: string | any;
  isActive: boolean | any;
  locale: string | any;
  lastLoginAt: Date | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  profile: CustomerProfileRecord | any;
  sessions: SessionRecord[];
  cart: CartRecord | any;
  orders: OrderRecord[];
  wishlist: WishlistItemRecord[];
  reviews: ReviewRecord[];
  notifications: NotificationRecord[];
  returnRequests: ReturnRequestRecord[];
  statusChanges: OrderStatusHistoryRecord[];
  orderNotes: OrderNoteRecord[];
  stockMovements: StockMovementRecord[];
  auditLogs: AuditLogRecord[];
  couponUses: CouponRedemptionRecord[];
  _count: Record<string, number>;
};

export type CustomerProfileRecord = {
  id: string | any;
  userId: string | any;
  address: string | any;
  city: string | any;
  regionId: string | any;
  postalCode: string | any;
  deliveryInstructions: string | any;
  updatedAt: Date | any;
  user: UserRecord | any;
  region: DeliveryRegionRecord | any;
  _count: Record<string, number>;
};

export type SessionRecord = {
  id: string | any;
  tokenHash: string | any;
  userId: string | any;
  expiresAt: Date | any;
  remember: boolean | any;
  userAgent: string | any;
  ip: string | any;
  createdAt: Date | any;
  lastSeenAt: Date | any;
  user: UserRecord | any;
  _count: Record<string, number>;
};

export type CategoryRecord = {
  id: string | any;
  slug: string | any;
  name: string | any;
  nameAr: string | any;
  nameEn: string | any;
  audience: string | any;
  description: string | any;
  imageUrl: string | any;
  sortOrder: number | any;
  isActive: boolean | any;
  sizeChartId: string | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  sizeChart: SizeChartRecord | any;
  subcategories: SubcategoryRecord[];
  products: ProductRecord[];
  promotions: PromotionCategoryRecord[];
  coupons: CouponCategoryRecord[];
  _count: Record<string, number>;
};

export type SubcategoryRecord = {
  id: string | any;
  categoryId: string | any;
  slug: string | any;
  name: string | any;
  nameAr: string | any;
  nameEn: string | any;
  productType: string | any;
  sizeType: string | any;
  imageUrl: string | any;
  sortOrder: number | any;
  isActive: boolean | any;
  sizeChartId: string | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  category: CategoryRecord | any;
  sizeChart: SizeChartRecord | any;
  products: ProductRecord[];
  promotions: PromotionSubcategoryRecord[];
  _count: Record<string, number>;
};

export type BrandRecord = {
  id: string | any;
  name: string | any;
  slug: string | any;
  createdAt: Date | any;
  products: ProductRecord[];
  _count: Record<string, number>;
};

export type CollectionRecord = {
  id: string | any;
  slug: string | any;
  name: string | any;
  nameAr: string | any;
  nameEn: string | any;
  description: string | any;
  season: string | any;
  imageUrl: string | any;
  isFeatured: boolean | any;
  isActive: boolean | any;
  sortOrder: number | any;
  createdAt: Date | any;
  products: ProductRecord[];
  _count: Record<string, number>;
};

export type MaterialRecord = {
  id: string | any;
  name: string | any;
  nameAr: string | any;
  nameEn: string | any;
  products: ProductMaterialRecord[];
  _count: Record<string, number>;
};

export type ColorRecord = {
  id: string | any;
  slug: string | any;
  name: string | any;
  nameAr: string | any;
  nameEn: string | any;
  hex: string | any;
  sortOrder: number | any;
  variants: ProductVariantRecord[];
  images: ProductImageRecord[];
  _count: Record<string, number>;
};

export type SizeRecord = {
  id: string | any;
  label: string | any;
  type: string | any;
  sortOrder: number | any;
  variants: ProductVariantRecord[];
  _count: Record<string, number>;
};

export type SizeChartRecord = {
  id: string | any;
  name: string | any;
  nameAr: string | any;
  nameEn: string | any;
  description: string | any;
  unit: string | any;
  columns: string | any;
  rows: string | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  products: ProductRecord[];
  categories: CategoryRecord[];
  subcategories: SubcategoryRecord[];
  _count: Record<string, number>;
};

export type ProductRecord = {
  id: string | any;
  slug: string | any;
  sku: string | any;
  name: string | any;
  shortDescription: string | any;
  description: string | any;
  audience: string | any;
  categoryId: string | any;
  subcategoryId: string | any;
  brandId: string | any;
  collectionId: string | any;
  season: string | any;
  fitType: string | any;
  weightGrams: number | any;
  careInstructions: string | any;
  countryOfOrigin: string | any;
  characteristics: string | any;
  price: number | any;
  salePrice: number | any;
  status: string | any;
  isFeatured: boolean | any;
  isNewArrival: boolean | any;
  isBestSeller: boolean | any;
  isOnSale: boolean | any;
  sizeChartId: string | any;
  metaTitle: string | any;
  metaDescription: string | any;
  minPrice: number | any;
  maxDiscountPct: number | any;
  isDiscounted: boolean | any;
  totalAvailable: number | any;
  soldCount: number | any;
  ratingAvg: number | any;
  ratingCount: number | any;
  searchText: string | any;
  publishedAt: Date | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  category: CategoryRecord | any;
  subcategory: SubcategoryRecord | any;
  brand: BrandRecord | any;
  collection: CollectionRecord | any;
  sizeChart: SizeChartRecord | any;
  translations: ProductTranslationRecord[];
  materials: ProductMaterialRecord[];
  images: ProductImageRecord[];
  variants: ProductVariantRecord[];
  wishlistedBy: WishlistItemRecord[];
  reviews: ReviewRecord[];
  orderItems: OrderItemRecord[];
  promotions: PromotionProductRecord[];
  coupons: CouponProductRecord[];
  _count: Record<string, number>;
};

export type ProductTranslationRecord = {
  id: string | any;
  productId: string | any;
  locale: string | any;
  name: string | any;
  shortDescription: string | any;
  description: string | any;
  careInstructions: string | any;
  product: ProductRecord | any;
  _count: Record<string, number>;
};

export type ProductMaterialRecord = {
  id: string | any;
  productId: string | any;
  materialId: string | any;
  percentage: number | any;
  product: ProductRecord | any;
  material: MaterialRecord | any;
  _count: Record<string, number>;
};

export type ProductImageRecord = {
  id: string | any;
  productId: string | any;
  colorId: string | any;
  kind: string | any;
  view: string | any;
  storageKey: string | any;
  url: string | any;
  thumbUrl: string | any;
  width: number | any;
  height: number | any;
  alt: string | any;
  isMain: boolean | any;
  sortOrder: number | any;
  createdAt: Date | any;
  product: ProductRecord | any;
  color: ColorRecord | any;
  _count: Record<string, number>;
};

export type ProductVariantRecord = {
  id: string | any;
  productId: string | any;
  colorId: string | any;
  sizeId: string | any;
  variantKey: string | any;
  sku: string | any;
  price: number | any;
  salePrice: number | any;
  stock: number | any;
  reserved: number | any;
  available: number | any;
  isActive: boolean | any;
  sortOrder: number | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  product: ProductRecord | any;
  color: ColorRecord | any;
  size: SizeRecord | any;
  cartItems: CartItemRecord[];
  orderItems: OrderItemRecord[];
  stockMovements: StockMovementRecord[];
  _count: Record<string, number>;
};

export type CartRecord = {
  id: string | any;
  userId: string | any;
  guestToken: string | any;
  couponCode: string | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  user: UserRecord | any;
  items: CartItemRecord[];
  _count: Record<string, number>;
};

export type CartItemRecord = {
  id: string | any;
  cartId: string | any;
  variantId: string | any;
  quantity: number | any;
  seenPrice: number | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  cart: CartRecord | any;
  variant: ProductVariantRecord | any;
  _count: Record<string, number>;
};

export type WishlistItemRecord = {
  id: string | any;
  userId: string | any;
  productId: string | any;
  createdAt: Date | any;
  user: UserRecord | any;
  product: ProductRecord | any;
  _count: Record<string, number>;
};

export type ReviewRecord = {
  id: string | any;
  productId: string | any;
  userId: string | any;
  rating: number | any;
  title: string | any;
  body: string | any;
  status: string | any;
  isVerifiedPurchase: boolean | any;
  adminReply: string | any;
  repliedAt: Date | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  product: ProductRecord | any;
  user: UserRecord | any;
  photos: ReviewPhotoRecord[];
  _count: Record<string, number>;
};

export type ReviewPhotoRecord = {
  id: string | any;
  reviewId: string | any;
  storageKey: string | any;
  url: string | any;
  thumbUrl: string | any;
  review: ReviewRecord | any;
  _count: Record<string, number>;
};

export type NotificationRecord = {
  id: string | any;
  userId: string | any;
  type: string | any;
  title: string | any;
  body: string | any;
  link: string | any;
  readAt: Date | any;
  createdAt: Date | any;
  user: UserRecord | any;
  _count: Record<string, number>;
};

export type OrderRecord = {
  id: string | any;
  number: string | any;
  userId: string | any;
  status: string | any;
  stockState: string | any;
  customerName: string | any;
  customerPhone: string | any;
  customerEmail: string | any;
  deliveryMethod: string | any;
  address: string | any;
  city: string | any;
  regionName: string | any;
  regionId: string | any;
  postalCode: string | any;
  deliveryInstructions: string | any;
  subtotal: number | any;
  discountTotal: number | any;
  couponCode: string | any;
  couponDiscount: number | any;
  shippingFee: number | any;
  total: number | any;
  currency: string | any;
  paymentMethod: string | any;
  locale: string | any;
  cancellationReason: string | any;
  deliveryCompany: string | any;
  trackingNumber: string | any;
  deliveryNotes: string | any;
  confirmedAt: Date | any;
  shippedAt: Date | any;
  deliveredAt: Date | any;
  cancelledAt: Date | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  user: UserRecord | any;
  items: OrderItemRecord[];
  history: OrderStatusHistoryRecord[];
  notes: OrderNoteRecord[];
  returnRequests: ReturnRequestRecord[];
  couponUse: CouponRedemptionRecord | any;
  stockMovements: StockMovementRecord[];
  _count: Record<string, number>;
};

export type OrderItemRecord = {
  id: string | any;
  orderId: string | any;
  productId: string | any;
  variantId: string | any;
  productName: string | any;
  productSlug: string | any;
  sku: string | any;
  colorName: string | any;
  colorHex: string | any;
  sizeLabel: string | any;
  imageUrl: string | any;
  originalUnitPrice: number | any;
  unitPrice: number | any;
  quantity: number | any;
  lineTotal: number | any;
  categoryName: string | any;
  order: OrderRecord | any;
  product: ProductRecord | any;
  variant: ProductVariantRecord | any;
  returnItems: ReturnItemRecord[];
  _count: Record<string, number>;
};

export type OrderStatusHistoryRecord = {
  id: string | any;
  orderId: string | any;
  fromStatus: string | any;
  toStatus: string | any;
  note: string | any;
  changedById: string | any;
  changedByName: string | any;
  createdAt: Date | any;
  order: OrderRecord | any;
  changedBy: UserRecord | any;
  _count: Record<string, number>;
};

export type OrderNoteRecord = {
  id: string | any;
  orderId: string | any;
  authorId: string | any;
  authorName: string | any;
  body: string | any;
  createdAt: Date | any;
  order: OrderRecord | any;
  author: UserRecord | any;
  _count: Record<string, number>;
};

export type ReturnRequestRecord = {
  id: string | any;
  number: string | any;
  orderId: string | any;
  userId: string | any;
  type: string | any;
  status: string | any;
  reason: string | any;
  description: string | any;
  adminNotes: string | any;
  rejectionReason: string | any;
  replacementNote: string | any;
  restocked: boolean | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  order: OrderRecord | any;
  user: UserRecord | any;
  items: ReturnItemRecord[];
  _count: Record<string, number>;
};

export type ReturnItemRecord = {
  id: string | any;
  returnRequestId: string | any;
  orderItemId: string | any;
  quantity: number | any;
  requestedSize: string | any;
  replacementVariantId: string | any;
  replacementLabel: string | any;
  returnRequest: ReturnRequestRecord | any;
  orderItem: OrderItemRecord | any;
  _count: Record<string, number>;
};

export type PromotionRecord = {
  id: string | any;
  name: string | any;
  description: string | any;
  type: string | any;
  value: number | any;
  scope: string | any;
  startsAt: Date | any;
  endsAt: Date | any;
  isActive: boolean | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  products: PromotionProductRecord[];
  categories: PromotionCategoryRecord[];
  subcategories: PromotionSubcategoryRecord[];
  _count: Record<string, number>;
};

export type PromotionProductRecord = {
  promotionId: string | any;
  productId: string | any;
  promotion: PromotionRecord | any;
  product: ProductRecord | any;
  _count: Record<string, number>;
};

export type PromotionCategoryRecord = {
  promotionId: string | any;
  categoryId: string | any;
  promotion: PromotionRecord | any;
  category: CategoryRecord | any;
  _count: Record<string, number>;
};

export type PromotionSubcategoryRecord = {
  promotionId: string | any;
  subcategoryId: string | any;
  promotion: PromotionRecord | any;
  subcategory: SubcategoryRecord | any;
  _count: Record<string, number>;
};

export type CouponRecord = {
  id: string | any;
  code: string | any;
  description: string | any;
  type: string | any;
  value: number | any;
  minOrderAmount: number | any;
  maxUses: number | any;
  maxUsesPerUser: number | any;
  usedCount: number | any;
  scope: string | any;
  startsAt: Date | any;
  expiresAt: Date | any;
  isActive: boolean | any;
  createdAt: Date | any;
  updatedAt: Date | any;
  products: CouponProductRecord[];
  categories: CouponCategoryRecord[];
  redemptions: CouponRedemptionRecord[];
  _count: Record<string, number>;
};

export type CouponProductRecord = {
  couponId: string | any;
  productId: string | any;
  coupon: CouponRecord | any;
  product: ProductRecord | any;
  _count: Record<string, number>;
};

export type CouponCategoryRecord = {
  couponId: string | any;
  categoryId: string | any;
  coupon: CouponRecord | any;
  category: CategoryRecord | any;
  _count: Record<string, number>;
};

export type CouponRedemptionRecord = {
  id: string | any;
  couponId: string | any;
  userId: string | any;
  orderId: string | any;
  amount: number | any;
  createdAt: Date | any;
  coupon: CouponRecord | any;
  user: UserRecord | any;
  order: OrderRecord | any;
  _count: Record<string, number>;
};

export type DeliveryRegionRecord = {
  id: string | any;
  name: string | any;
  nameAr: string | any;
  fee: number | any;
  estimatedDays: string | any;
  isActive: boolean | any;
  sortOrder: number | any;
  profiles: CustomerProfileRecord[];
  _count: Record<string, number>;
};

export type SettingRecord = {
  key: string | any;
  value: string | any;
  updatedAt: Date | any;
  _count: Record<string, number>;
};

export type HomeSectionRecord = {
  id: string | any;
  type: string | any;
  title: string | any;
  titleAr: string | any;
  titleEn: string | any;
  subtitle: string | any;
  subtitleAr: string | any;
  subtitleEn: string | any;
  config: string | any;
  sortOrder: number | any;
  isVisible: boolean | any;
  updatedAt: Date | any;
  _count: Record<string, number>;
};

export type BannerRecord = {
  id: string | any;
  placement: string | any;
  title: string | any;
  titleAr: string | any;
  titleEn: string | any;
  subtitle: string | any;
  subtitleAr: string | any;
  subtitleEn: string | any;
  ctaLabel: string | any;
  ctaLabelAr: string | any;
  ctaLabelEn: string | any;
  linkUrl: string | any;
  imageUrl: string | any;
  sortOrder: number | any;
  isActive: boolean | any;
  startsAt: Date | any;
  endsAt: Date | any;
  createdAt: Date | any;
  _count: Record<string, number>;
};

export type ContentPageRecord = {
  id: string | any;
  slug: string | any;
  locale: string | any;
  title: string | any;
  body: string | any;
  updatedAt: Date | any;
  _count: Record<string, number>;
};

export type ContactMessageRecord = {
  id: string | any;
  name: string | any;
  email: string | any;
  phone: string | any;
  subject: string | any;
  message: string | any;
  isRead: boolean | any;
  createdAt: Date | any;
  _count: Record<string, number>;
};

export type StockMovementRecord = {
  id: string | any;
  variantId: string | any;
  delta: number | any;
  type: string | any;
  reason: string | any;
  stockBefore: number | any;
  stockAfter: number | any;
  orderId: string | any;
  userId: string | any;
  userName: string | any;
  createdAt: Date | any;
  variant: ProductVariantRecord | any;
  order: OrderRecord | any;
  user: UserRecord | any;
  _count: Record<string, number>;
};

export type AuditLogRecord = {
  id: string | any;
  userId: string | any;
  userName: string | any;
  action: string | any;
  entity: string | any;
  entityId: string | any;
  details: string | any;
  ip: string | any;
  createdAt: Date | any;
  user: UserRecord | any;
  _count: Record<string, number>;
};
