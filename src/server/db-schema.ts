// Auto-generated database schema metadata (100% Supabase, zero Prisma runtime).
export type RelationMeta = {
  target: string;
  isList: boolean;
  isOpt: boolean;
  fk: string | null;
  ref: string | null;
  relName: string | null;
  inverseFk?: string;
  inverseRef?: string;
};

export type ModelMeta = {
  table: string;
  pk: string[];
  fields: Record<string, string>;
  dates: string[];
  defaults: Record<string, unknown>;
  uniques: Record<string, string[]>;
  relations: Record<string, RelationMeta>;
};

export const DB_SCHEMA: Record<string, ModelMeta> = {
  "User": {
    "table": "User",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "email": "String",
      "phone": "String",
      "fullName": "String",
      "passwordHash": "String",
      "role": "String",
      "permissions": "String",
      "isActive": "Boolean",
      "locale": "String",
      "lastLoginAt": "DateTime",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "lastLoginAt",
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "role": "CUSTOMER",
      "isActive": true,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "profile": {
        "target": "CustomerProfile",
        "isList": false,
        "isOpt": true,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "sessions": {
        "target": "Session",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "cart": {
        "target": "Cart",
        "isList": false,
        "isOpt": true,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "orders": {
        "target": "Order",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "wishlist": {
        "target": "WishlistItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "reviews": {
        "target": "Review",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "notifications": {
        "target": "Notification",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "returnRequests": {
        "target": "ReturnRequest",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "statusChanges": {
        "target": "OrderStatusHistory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "changedById",
        "inverseRef": "id"
      },
      "orderNotes": {
        "target": "OrderNote",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "authorId",
        "inverseRef": "id"
      },
      "stockMovements": {
        "target": "StockMovement",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "auditLogs": {
        "target": "AuditLog",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      },
      "couponUses": {
        "target": "CouponRedemption",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "userId",
        "inverseRef": "id"
      }
    }
  },
  "CustomerProfile": {
    "table": "CustomerProfile",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "userId": "String",
      "address": "String",
      "city": "String",
      "regionId": "String",
      "postalCode": "String",
      "deliveryInstructions": "String",
      "updatedAt": "DateTime"
    },
    "dates": [
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "region": {
        "target": "DeliveryRegion",
        "isList": false,
        "isOpt": true,
        "fk": "regionId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Session": {
    "table": "Session",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "tokenHash": "String",
      "userId": "String",
      "expiresAt": "DateTime",
      "remember": "Boolean",
      "userAgent": "String",
      "ip": "String",
      "createdAt": "DateTime",
      "lastSeenAt": "DateTime"
    },
    "dates": [
      "expiresAt",
      "createdAt",
      "lastSeenAt"
    ],
    "defaults": {
      "id": "CUID",
      "remember": false,
      "createdAt": "NOW",
      "lastSeenAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Category": {
    "table": "Category",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "slug": "String",
      "name": "String",
      "nameAr": "String",
      "nameEn": "String",
      "audience": "String",
      "description": "String",
      "imageUrl": "String",
      "sortOrder": "Int",
      "isActive": "Boolean",
      "sizeChartId": "String",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "sizeChart": {
        "target": "SizeChart",
        "isList": false,
        "isOpt": true,
        "fk": "sizeChartId",
        "ref": "id",
        "relName": null
      },
      "subcategories": {
        "target": "Subcategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "categoryId",
        "inverseRef": "id"
      },
      "products": {
        "target": "Product",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "categoryId",
        "inverseRef": "id"
      },
      "promotions": {
        "target": "PromotionCategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "categoryId",
        "inverseRef": "id"
      },
      "coupons": {
        "target": "CouponCategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "categoryId",
        "inverseRef": "id"
      }
    }
  },
  "Subcategory": {
    "table": "Subcategory",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "categoryId": "String",
      "slug": "String",
      "name": "String",
      "nameAr": "String",
      "nameEn": "String",
      "productType": "String",
      "sizeType": "String",
      "imageUrl": "String",
      "sortOrder": "Int",
      "isActive": "Boolean",
      "sizeChartId": "String",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "sizeType": "CLOTHING",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {
      "categoryId_slug": [
        "categoryId",
        "slug"
      ]
    },
    "relations": {
      "category": {
        "target": "Category",
        "isList": false,
        "isOpt": false,
        "fk": "categoryId",
        "ref": "id",
        "relName": null
      },
      "sizeChart": {
        "target": "SizeChart",
        "isList": false,
        "isOpt": true,
        "fk": "sizeChartId",
        "ref": "id",
        "relName": null
      },
      "products": {
        "target": "Product",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "subcategoryId",
        "inverseRef": "id"
      },
      "promotions": {
        "target": "PromotionSubcategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "subcategoryId",
        "inverseRef": "id"
      }
    }
  },
  "Brand": {
    "table": "Brand",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "name": "String",
      "slug": "String",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "products": {
        "target": "Product",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "brandId",
        "inverseRef": "id"
      }
    }
  },
  "Collection": {
    "table": "Collection",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "slug": "String",
      "name": "String",
      "nameAr": "String",
      "nameEn": "String",
      "description": "String",
      "season": "String",
      "imageUrl": "String",
      "isFeatured": "Boolean",
      "isActive": "Boolean",
      "sortOrder": "Int",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "season": "ALL",
      "isFeatured": false,
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "products": {
        "target": "Product",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "collectionId",
        "inverseRef": "id"
      }
    }
  },
  "Material": {
    "table": "Material",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "name": "String",
      "nameAr": "String",
      "nameEn": "String"
    },
    "dates": [],
    "defaults": {
      "id": "CUID"
    },
    "uniques": {},
    "relations": {
      "products": {
        "target": "ProductMaterial",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "materialId",
        "inverseRef": "id"
      }
    }
  },
  "Color": {
    "table": "Color",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "slug": "String",
      "name": "String",
      "nameAr": "String",
      "nameEn": "String",
      "hex": "String",
      "sortOrder": "Int"
    },
    "dates": [],
    "defaults": {
      "id": "CUID",
      "sortOrder": 0
    },
    "uniques": {},
    "relations": {
      "variants": {
        "target": "ProductVariant",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "colorId",
        "inverseRef": "id"
      },
      "images": {
        "target": "ProductImage",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "colorId",
        "inverseRef": "id"
      }
    }
  },
  "Size": {
    "table": "Size",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "label": "String",
      "type": "String",
      "sortOrder": "Int"
    },
    "dates": [],
    "defaults": {
      "id": "CUID",
      "sortOrder": 0
    },
    "uniques": {
      "type_label": [
        "type",
        "label"
      ]
    },
    "relations": {
      "variants": {
        "target": "ProductVariant",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "sizeId",
        "inverseRef": "id"
      }
    }
  },
  "SizeChart": {
    "table": "SizeChart",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "name": "String",
      "nameAr": "String",
      "nameEn": "String",
      "description": "String",
      "unit": "String",
      "columns": "String",
      "rows": "String",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "unit": "cm",
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "products": {
        "target": "Product",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "sizeChartId",
        "inverseRef": "id"
      },
      "categories": {
        "target": "Category",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "sizeChartId",
        "inverseRef": "id"
      },
      "subcategories": {
        "target": "Subcategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "sizeChartId",
        "inverseRef": "id"
      }
    }
  },
  "Product": {
    "table": "Product",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "slug": "String",
      "sku": "String",
      "name": "String",
      "shortDescription": "String",
      "description": "String",
      "audience": "String",
      "categoryId": "String",
      "subcategoryId": "String",
      "brandId": "String",
      "collectionId": "String",
      "season": "String",
      "fitType": "String",
      "weightGrams": "Int",
      "careInstructions": "String",
      "countryOfOrigin": "String",
      "characteristics": "String",
      "price": "Int",
      "salePrice": "Int",
      "status": "String",
      "isFeatured": "Boolean",
      "isNewArrival": "Boolean",
      "isBestSeller": "Boolean",
      "isOnSale": "Boolean",
      "sizeChartId": "String",
      "metaTitle": "String",
      "metaDescription": "String",
      "minPrice": "Int",
      "maxDiscountPct": "Int",
      "isDiscounted": "Boolean",
      "totalAvailable": "Int",
      "soldCount": "Int",
      "ratingAvg": "Float",
      "ratingCount": "Int",
      "searchText": "String",
      "publishedAt": "DateTime",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "publishedAt",
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "season": "ALL",
      "status": "DRAFT",
      "isFeatured": false,
      "isNewArrival": false,
      "isBestSeller": false,
      "isOnSale": false,
      "minPrice": 0,
      "maxDiscountPct": 0,
      "isDiscounted": false,
      "totalAvailable": 0,
      "soldCount": 0,
      "ratingAvg": 0,
      "ratingCount": 0,
      "searchText": "",
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "category": {
        "target": "Category",
        "isList": false,
        "isOpt": false,
        "fk": "categoryId",
        "ref": "id",
        "relName": null
      },
      "subcategory": {
        "target": "Subcategory",
        "isList": false,
        "isOpt": true,
        "fk": "subcategoryId",
        "ref": "id",
        "relName": null
      },
      "brand": {
        "target": "Brand",
        "isList": false,
        "isOpt": true,
        "fk": "brandId",
        "ref": "id",
        "relName": null
      },
      "collection": {
        "target": "Collection",
        "isList": false,
        "isOpt": true,
        "fk": "collectionId",
        "ref": "id",
        "relName": null
      },
      "sizeChart": {
        "target": "SizeChart",
        "isList": false,
        "isOpt": true,
        "fk": "sizeChartId",
        "ref": "id",
        "relName": null
      },
      "translations": {
        "target": "ProductTranslation",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "materials": {
        "target": "ProductMaterial",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "images": {
        "target": "ProductImage",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "variants": {
        "target": "ProductVariant",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "wishlistedBy": {
        "target": "WishlistItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "reviews": {
        "target": "Review",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "orderItems": {
        "target": "OrderItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "promotions": {
        "target": "PromotionProduct",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      },
      "coupons": {
        "target": "CouponProduct",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "productId",
        "inverseRef": "id"
      }
    }
  },
  "ProductTranslation": {
    "table": "ProductTranslation",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "productId": "String",
      "locale": "String",
      "name": "String",
      "shortDescription": "String",
      "description": "String",
      "careInstructions": "String"
    },
    "dates": [],
    "defaults": {
      "id": "CUID"
    },
    "uniques": {
      "productId_locale": [
        "productId",
        "locale"
      ]
    },
    "relations": {
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "ProductMaterial": {
    "table": "ProductMaterial",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "productId": "String",
      "materialId": "String",
      "percentage": "Int"
    },
    "dates": [],
    "defaults": {
      "id": "CUID"
    },
    "uniques": {
      "productId_materialId": [
        "productId",
        "materialId"
      ]
    },
    "relations": {
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      },
      "material": {
        "target": "Material",
        "isList": false,
        "isOpt": false,
        "fk": "materialId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "ProductImage": {
    "table": "ProductImage",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "productId": "String",
      "colorId": "String",
      "kind": "String",
      "view": "String",
      "storageKey": "String",
      "url": "String",
      "thumbUrl": "String",
      "width": "Int",
      "height": "Int",
      "alt": "String",
      "isMain": "Boolean",
      "sortOrder": "Int",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "kind": "IMAGE",
      "view": "OTHER",
      "isMain": false,
      "sortOrder": 0,
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      },
      "color": {
        "target": "Color",
        "isList": false,
        "isOpt": true,
        "fk": "colorId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "ProductVariant": {
    "table": "ProductVariant",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "productId": "String",
      "colorId": "String",
      "sizeId": "String",
      "variantKey": "String",
      "sku": "String",
      "price": "Int",
      "salePrice": "Int",
      "stock": "Int",
      "reserved": "Int",
      "available": "Int",
      "isActive": "Boolean",
      "sortOrder": "Int",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "stock": 0,
      "reserved": 0,
      "available": 0,
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {
      "productId_variantKey": [
        "productId",
        "variantKey"
      ]
    },
    "relations": {
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      },
      "color": {
        "target": "Color",
        "isList": false,
        "isOpt": true,
        "fk": "colorId",
        "ref": "id",
        "relName": null
      },
      "size": {
        "target": "Size",
        "isList": false,
        "isOpt": true,
        "fk": "sizeId",
        "ref": "id",
        "relName": null
      },
      "cartItems": {
        "target": "CartItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "variantId",
        "inverseRef": "id"
      },
      "orderItems": {
        "target": "OrderItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "variantId",
        "inverseRef": "id"
      },
      "stockMovements": {
        "target": "StockMovement",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "variantId",
        "inverseRef": "id"
      }
    }
  },
  "Cart": {
    "table": "Cart",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "userId": "String",
      "guestToken": "String",
      "couponCode": "String",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": true,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "items": {
        "target": "CartItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "cartId",
        "inverseRef": "id"
      }
    }
  },
  "CartItem": {
    "table": "CartItem",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "cartId": "String",
      "variantId": "String",
      "quantity": "Int",
      "seenPrice": "Int",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {
      "cartId_variantId": [
        "cartId",
        "variantId"
      ]
    },
    "relations": {
      "cart": {
        "target": "Cart",
        "isList": false,
        "isOpt": false,
        "fk": "cartId",
        "ref": "id",
        "relName": null
      },
      "variant": {
        "target": "ProductVariant",
        "isList": false,
        "isOpt": false,
        "fk": "variantId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "WishlistItem": {
    "table": "WishlistItem",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "userId": "String",
      "productId": "String",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {
      "userId_productId": [
        "userId",
        "productId"
      ]
    },
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Review": {
    "table": "Review",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "productId": "String",
      "userId": "String",
      "rating": "Int",
      "title": "String",
      "body": "String",
      "status": "String",
      "isVerifiedPurchase": "Boolean",
      "adminReply": "String",
      "repliedAt": "DateTime",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "repliedAt",
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "status": "PENDING",
      "isVerifiedPurchase": false,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {
      "productId_userId": [
        "productId",
        "userId"
      ]
    },
    "relations": {
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      },
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "photos": {
        "target": "ReviewPhoto",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "reviewId",
        "inverseRef": "id"
      }
    }
  },
  "ReviewPhoto": {
    "table": "ReviewPhoto",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "reviewId": "String",
      "storageKey": "String",
      "url": "String",
      "thumbUrl": "String"
    },
    "dates": [],
    "defaults": {
      "id": "CUID"
    },
    "uniques": {},
    "relations": {
      "review": {
        "target": "Review",
        "isList": false,
        "isOpt": false,
        "fk": "reviewId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Notification": {
    "table": "Notification",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "userId": "String",
      "type": "String",
      "title": "String",
      "body": "String",
      "link": "String",
      "readAt": "DateTime",
      "createdAt": "DateTime"
    },
    "dates": [
      "readAt",
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Order": {
    "table": "Order",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "number": "String",
      "userId": "String",
      "status": "String",
      "stockState": "String",
      "customerName": "String",
      "customerPhone": "String",
      "customerEmail": "String",
      "deliveryMethod": "String",
      "address": "String",
      "city": "String",
      "regionName": "String",
      "regionId": "String",
      "postalCode": "String",
      "deliveryInstructions": "String",
      "subtotal": "Int",
      "discountTotal": "Int",
      "couponCode": "String",
      "couponDiscount": "Int",
      "shippingFee": "Int",
      "total": "Int",
      "currency": "String",
      "paymentMethod": "String",
      "locale": "String",
      "cancellationReason": "String",
      "deliveryCompany": "String",
      "trackingNumber": "String",
      "deliveryNotes": "String",
      "confirmedAt": "DateTime",
      "shippedAt": "DateTime",
      "deliveredAt": "DateTime",
      "cancelledAt": "DateTime",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "confirmedAt",
      "shippedAt",
      "deliveredAt",
      "cancelledAt",
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "status": "PENDING",
      "stockState": "HELD",
      "deliveryMethod": "DELIVERY",
      "discountTotal": 0,
      "couponDiscount": 0,
      "shippingFee": 0,
      "currency": "TND",
      "paymentMethod": "CASH_ON_DELIVERY",
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "items": {
        "target": "OrderItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderId",
        "inverseRef": "id"
      },
      "history": {
        "target": "OrderStatusHistory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderId",
        "inverseRef": "id"
      },
      "notes": {
        "target": "OrderNote",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderId",
        "inverseRef": "id"
      },
      "returnRequests": {
        "target": "ReturnRequest",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderId",
        "inverseRef": "id"
      },
      "couponUse": {
        "target": "CouponRedemption",
        "isList": false,
        "isOpt": true,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderId",
        "inverseRef": "id"
      },
      "stockMovements": {
        "target": "StockMovement",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderId",
        "inverseRef": "id"
      }
    }
  },
  "OrderItem": {
    "table": "OrderItem",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "orderId": "String",
      "productId": "String",
      "variantId": "String",
      "productName": "String",
      "productSlug": "String",
      "sku": "String",
      "colorName": "String",
      "colorHex": "String",
      "sizeLabel": "String",
      "imageUrl": "String",
      "originalUnitPrice": "Int",
      "unitPrice": "Int",
      "quantity": "Int",
      "lineTotal": "Int",
      "categoryName": "String"
    },
    "dates": [],
    "defaults": {
      "id": "CUID"
    },
    "uniques": {},
    "relations": {
      "order": {
        "target": "Order",
        "isList": false,
        "isOpt": false,
        "fk": "orderId",
        "ref": "id",
        "relName": null
      },
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": true,
        "fk": "productId",
        "ref": "id",
        "relName": null
      },
      "variant": {
        "target": "ProductVariant",
        "isList": false,
        "isOpt": true,
        "fk": "variantId",
        "ref": "id",
        "relName": null
      },
      "returnItems": {
        "target": "ReturnItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "orderItemId",
        "inverseRef": "id"
      }
    }
  },
  "OrderStatusHistory": {
    "table": "OrderStatusHistory",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "orderId": "String",
      "fromStatus": "String",
      "toStatus": "String",
      "note": "String",
      "changedById": "String",
      "changedByName": "String",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "order": {
        "target": "Order",
        "isList": false,
        "isOpt": false,
        "fk": "orderId",
        "ref": "id",
        "relName": null
      },
      "changedBy": {
        "target": "User",
        "isList": false,
        "isOpt": true,
        "fk": "changedById",
        "ref": "id",
        "relName": null
      }
    }
  },
  "OrderNote": {
    "table": "OrderNote",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "orderId": "String",
      "authorId": "String",
      "authorName": "String",
      "body": "String",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "order": {
        "target": "Order",
        "isList": false,
        "isOpt": false,
        "fk": "orderId",
        "ref": "id",
        "relName": null
      },
      "author": {
        "target": "User",
        "isList": false,
        "isOpt": true,
        "fk": "authorId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "ReturnRequest": {
    "table": "ReturnRequest",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "number": "String",
      "orderId": "String",
      "userId": "String",
      "type": "String",
      "status": "String",
      "reason": "String",
      "description": "String",
      "adminNotes": "String",
      "rejectionReason": "String",
      "replacementNote": "String",
      "restocked": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "status": "REQUESTED",
      "restocked": false,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "order": {
        "target": "Order",
        "isList": false,
        "isOpt": false,
        "fk": "orderId",
        "ref": "id",
        "relName": null
      },
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "items": {
        "target": "ReturnItem",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "returnRequestId",
        "inverseRef": "id"
      }
    }
  },
  "ReturnItem": {
    "table": "ReturnItem",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "returnRequestId": "String",
      "orderItemId": "String",
      "quantity": "Int",
      "requestedSize": "String",
      "replacementVariantId": "String",
      "replacementLabel": "String"
    },
    "dates": [],
    "defaults": {
      "id": "CUID"
    },
    "uniques": {},
    "relations": {
      "returnRequest": {
        "target": "ReturnRequest",
        "isList": false,
        "isOpt": false,
        "fk": "returnRequestId",
        "ref": "id",
        "relName": null
      },
      "orderItem": {
        "target": "OrderItem",
        "isList": false,
        "isOpt": false,
        "fk": "orderItemId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Promotion": {
    "table": "Promotion",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "name": "String",
      "description": "String",
      "type": "String",
      "value": "Int",
      "scope": "String",
      "startsAt": "DateTime",
      "endsAt": "DateTime",
      "isActive": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "startsAt",
      "endsAt",
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "scope": "ALL",
      "isActive": true,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "products": {
        "target": "PromotionProduct",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "promotionId",
        "inverseRef": "id"
      },
      "categories": {
        "target": "PromotionCategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "promotionId",
        "inverseRef": "id"
      },
      "subcategories": {
        "target": "PromotionSubcategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "promotionId",
        "inverseRef": "id"
      }
    }
  },
  "PromotionProduct": {
    "table": "PromotionProduct",
    "pk": [
      "promotionId",
      "productId"
    ],
    "fields": {
      "promotionId": "String",
      "productId": "String"
    },
    "dates": [],
    "defaults": {},
    "uniques": {
      "promotionId_productId": [
        "promotionId",
        "productId"
      ]
    },
    "relations": {
      "promotion": {
        "target": "Promotion",
        "isList": false,
        "isOpt": false,
        "fk": "promotionId",
        "ref": "id",
        "relName": null
      },
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "PromotionCategory": {
    "table": "PromotionCategory",
    "pk": [
      "promotionId",
      "categoryId"
    ],
    "fields": {
      "promotionId": "String",
      "categoryId": "String"
    },
    "dates": [],
    "defaults": {},
    "uniques": {
      "promotionId_categoryId": [
        "promotionId",
        "categoryId"
      ]
    },
    "relations": {
      "promotion": {
        "target": "Promotion",
        "isList": false,
        "isOpt": false,
        "fk": "promotionId",
        "ref": "id",
        "relName": null
      },
      "category": {
        "target": "Category",
        "isList": false,
        "isOpt": false,
        "fk": "categoryId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "PromotionSubcategory": {
    "table": "PromotionSubcategory",
    "pk": [
      "promotionId",
      "subcategoryId"
    ],
    "fields": {
      "promotionId": "String",
      "subcategoryId": "String"
    },
    "dates": [],
    "defaults": {},
    "uniques": {
      "promotionId_subcategoryId": [
        "promotionId",
        "subcategoryId"
      ]
    },
    "relations": {
      "promotion": {
        "target": "Promotion",
        "isList": false,
        "isOpt": false,
        "fk": "promotionId",
        "ref": "id",
        "relName": null
      },
      "subcategory": {
        "target": "Subcategory",
        "isList": false,
        "isOpt": false,
        "fk": "subcategoryId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "Coupon": {
    "table": "Coupon",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "code": "String",
      "description": "String",
      "type": "String",
      "value": "Int",
      "minOrderAmount": "Int",
      "maxUses": "Int",
      "maxUsesPerUser": "Int",
      "usedCount": "Int",
      "scope": "String",
      "startsAt": "DateTime",
      "expiresAt": "DateTime",
      "isActive": "Boolean",
      "createdAt": "DateTime",
      "updatedAt": "DateTime"
    },
    "dates": [
      "startsAt",
      "expiresAt",
      "createdAt",
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "minOrderAmount": 0,
      "maxUsesPerUser": 1,
      "usedCount": 0,
      "scope": "ALL",
      "isActive": true,
      "createdAt": "NOW",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {
      "products": {
        "target": "CouponProduct",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "couponId",
        "inverseRef": "id"
      },
      "categories": {
        "target": "CouponCategory",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "couponId",
        "inverseRef": "id"
      },
      "redemptions": {
        "target": "CouponRedemption",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "couponId",
        "inverseRef": "id"
      }
    }
  },
  "CouponProduct": {
    "table": "CouponProduct",
    "pk": [
      "couponId",
      "productId"
    ],
    "fields": {
      "couponId": "String",
      "productId": "String"
    },
    "dates": [],
    "defaults": {},
    "uniques": {
      "couponId_productId": [
        "couponId",
        "productId"
      ]
    },
    "relations": {
      "coupon": {
        "target": "Coupon",
        "isList": false,
        "isOpt": false,
        "fk": "couponId",
        "ref": "id",
        "relName": null
      },
      "product": {
        "target": "Product",
        "isList": false,
        "isOpt": false,
        "fk": "productId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "CouponCategory": {
    "table": "CouponCategory",
    "pk": [
      "couponId",
      "categoryId"
    ],
    "fields": {
      "couponId": "String",
      "categoryId": "String"
    },
    "dates": [],
    "defaults": {},
    "uniques": {
      "couponId_categoryId": [
        "couponId",
        "categoryId"
      ]
    },
    "relations": {
      "coupon": {
        "target": "Coupon",
        "isList": false,
        "isOpt": false,
        "fk": "couponId",
        "ref": "id",
        "relName": null
      },
      "category": {
        "target": "Category",
        "isList": false,
        "isOpt": false,
        "fk": "categoryId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "CouponRedemption": {
    "table": "CouponRedemption",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "couponId": "String",
      "userId": "String",
      "orderId": "String",
      "amount": "Int",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "coupon": {
        "target": "Coupon",
        "isList": false,
        "isOpt": false,
        "fk": "couponId",
        "ref": "id",
        "relName": null
      },
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": false,
        "fk": "userId",
        "ref": "id",
        "relName": null
      },
      "order": {
        "target": "Order",
        "isList": false,
        "isOpt": false,
        "fk": "orderId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "DeliveryRegion": {
    "table": "DeliveryRegion",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "name": "String",
      "nameAr": "String",
      "fee": "Int",
      "estimatedDays": "String",
      "isActive": "Boolean",
      "sortOrder": "Int"
    },
    "dates": [],
    "defaults": {
      "id": "CUID",
      "isActive": true,
      "sortOrder": 0
    },
    "uniques": {},
    "relations": {
      "profiles": {
        "target": "CustomerProfile",
        "isList": true,
        "isOpt": false,
        "fk": null,
        "ref": null,
        "relName": null,
        "inverseFk": "regionId",
        "inverseRef": "id"
      }
    }
  },
  "Setting": {
    "table": "Setting",
    "pk": [
      "key"
    ],
    "fields": {
      "key": "String",
      "value": "String",
      "updatedAt": "DateTime"
    },
    "dates": [
      "updatedAt"
    ],
    "defaults": {
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {}
  },
  "HomeSection": {
    "table": "HomeSection",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "type": "String",
      "title": "String",
      "titleAr": "String",
      "titleEn": "String",
      "subtitle": "String",
      "subtitleAr": "String",
      "subtitleEn": "String",
      "config": "String",
      "sortOrder": "Int",
      "isVisible": "Boolean",
      "updatedAt": "DateTime"
    },
    "dates": [
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "config": "{}",
      "sortOrder": 0,
      "isVisible": true,
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {},
    "relations": {}
  },
  "Banner": {
    "table": "Banner",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "placement": "String",
      "title": "String",
      "titleAr": "String",
      "titleEn": "String",
      "subtitle": "String",
      "subtitleAr": "String",
      "subtitleEn": "String",
      "ctaLabel": "String",
      "ctaLabelAr": "String",
      "ctaLabelEn": "String",
      "linkUrl": "String",
      "imageUrl": "String",
      "sortOrder": "Int",
      "isActive": "Boolean",
      "startsAt": "DateTime",
      "endsAt": "DateTime",
      "createdAt": "DateTime"
    },
    "dates": [
      "startsAt",
      "endsAt",
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "placement": "HERO",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {}
  },
  "ContentPage": {
    "table": "ContentPage",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "slug": "String",
      "locale": "String",
      "title": "String",
      "body": "String",
      "updatedAt": "DateTime"
    },
    "dates": [
      "updatedAt"
    ],
    "defaults": {
      "id": "CUID",
      "updatedAt": "NOW_UPDATED"
    },
    "uniques": {
      "slug_locale": [
        "slug",
        "locale"
      ]
    },
    "relations": {}
  },
  "ContactMessage": {
    "table": "ContactMessage",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "name": "String",
      "email": "String",
      "phone": "String",
      "subject": "String",
      "message": "String",
      "isRead": "Boolean",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "isRead": false,
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {}
  },
  "StockMovement": {
    "table": "StockMovement",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "variantId": "String",
      "delta": "Int",
      "type": "String",
      "reason": "String",
      "stockBefore": "Int",
      "stockAfter": "Int",
      "orderId": "String",
      "userId": "String",
      "userName": "String",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "variant": {
        "target": "ProductVariant",
        "isList": false,
        "isOpt": false,
        "fk": "variantId",
        "ref": "id",
        "relName": null
      },
      "order": {
        "target": "Order",
        "isList": false,
        "isOpt": true,
        "fk": "orderId",
        "ref": "id",
        "relName": null
      },
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": true,
        "fk": "userId",
        "ref": "id",
        "relName": null
      }
    }
  },
  "AuditLog": {
    "table": "AuditLog",
    "pk": [
      "id"
    ],
    "fields": {
      "id": "String",
      "userId": "String",
      "userName": "String",
      "action": "String",
      "entity": "String",
      "entityId": "String",
      "details": "String",
      "ip": "String",
      "createdAt": "DateTime"
    },
    "dates": [
      "createdAt"
    ],
    "defaults": {
      "id": "CUID",
      "createdAt": "NOW"
    },
    "uniques": {},
    "relations": {
      "user": {
        "target": "User",
        "isList": false,
        "isOpt": true,
        "fk": "userId",
        "ref": "id",
        "relName": null
      }
    }
  }
};
