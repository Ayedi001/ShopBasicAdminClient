import { crud } from "./crud";
import { prisma } from "./db";
import { badRequest } from "./errors";
import {
  bannerSchema,
  categorySchema,
  collectionSchema,
  colorSchema,
  deliveryRegionSchema,
  namedSchema,
  sizeChartSchema,
  sizeSchema,
  subcategorySchema,
} from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { rebuildSearchTextWhere } from "./products-admin";

async function uniqueSlug(model: "category" | "collection", base: string, id?: string) {
  const root = slugify(base) || model;
  let slug = root;
  for (let i = 2; i < 100; i++) {
    const found =
      model === "category"
        ? await prisma.category.findUnique({ where: { slug }, select: { id: true } })
        : await prisma.collection.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === id) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export const categoriesCrud = crud({
  model: "category",
  entity: "Category",
  permission: "categories.manage",
  schema: categorySchema,
  orderBy: { sortOrder: "asc" },
  include: { subcategories: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
  toData: async (input, id) => ({ ...input, slug: await uniqueSlug("category", input.slug || input.name, id) }),
  afterChange: async (id) => rebuildSearchTextWhere({ categoryId: id }),
  beforeDelete: async (id) => {
    const products = await prisma.product.count({ where: { categoryId: id } });
    if (products) throw badRequest("IN_USE", `Impossible : ${products} produit(s) utilisent cette catégorie. Déplacez-les ou archivez la catégorie.`);
    await prisma.subcategory.deleteMany({ where: { categoryId: id } });
  },
});

export const subcategoriesCrud = crud({
  model: "subcategory",
  entity: "Subcategory",
  permission: "categories.manage",
  schema: subcategorySchema,
  orderBy: { sortOrder: "asc" },
  toData: async (input, id) => {
    const root = slugify(input.slug || input.name) || "sous-categorie";
    let slug = root;
    for (let i = 2; i < 100; i++) {
      const found = await prisma.subcategory.findUnique({ where: { categoryId_slug: { categoryId: input.categoryId, slug } } });
      if (!found || found.id === id) break;
      slug = `${root}-${i}`;
    }
    if (id) {
      const current = await prisma.subcategory.findUnique({ where: { id } });
      if (current && current.categoryId !== input.categoryId) {
        const used = await prisma.product.count({ where: { subcategoryId: id } });
        if (used) throw badRequest("IN_USE", "Cette sous-catégorie contient des produits : impossible de changer sa catégorie parente.");
      }
    }
    return { ...input, slug };
  },
  afterChange: async (id) => rebuildSearchTextWhere({ subcategoryId: id }),
  beforeDelete: async (id) => {
    const products = await prisma.product.count({ where: { subcategoryId: id } });
    if (products) throw badRequest("IN_USE", `Impossible : ${products} produit(s) utilisent cette sous-catégorie.`);
  },
});

export const colorsCrud = crud({
  model: "color",
  entity: "Color",
  permission: "categories.manage",
  schema: colorSchema,
  orderBy: { sortOrder: "asc" },
  toData: async (input, id) => {
    const slug = slugify(input.name);
    const clash = await prisma.color.findUnique({ where: { slug } });
    if (clash && clash.id !== id) throw badRequest("DUPLICATE", "Une couleur porte déjà ce nom.");
    return { ...input, hex: input.hex.toLowerCase(), slug };
  },
  beforeDelete: async (id) => {
    const used = await prisma.productVariant.count({ where: { colorId: id } });
    if (used) throw badRequest("IN_USE", `Couleur utilisée par ${used} variante(s).`);
  },
});

export const sizesCrud = crud({
  model: "size",
  entity: "Size",
  permission: "categories.manage",
  schema: sizeSchema,
  orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  beforeDelete: async (id) => {
    const used = await prisma.productVariant.count({ where: { sizeId: id } });
    if (used) throw badRequest("IN_USE", `Taille utilisée par ${used} variante(s).`);
  },
});

export const materialsCrud = crud({
  model: "material",
  entity: "Material",
  permission: "categories.manage",
  schema: namedSchema,
  orderBy: { name: "asc" },
  beforeDelete: async (id) => {
    const used = await prisma.productMaterial.count({ where: { materialId: id } });
    if (used) throw badRequest("IN_USE", `Matière utilisée par ${used} produit(s).`);
  },
});

export const collectionsCrud = crud({
  model: "collection",
  entity: "Collection",
  permission: "categories.manage",
  schema: collectionSchema,
  orderBy: { sortOrder: "asc" },
  toData: async (input, id) => ({ ...input, slug: await uniqueSlug("collection", input.slug || input.name, id) }),
  afterChange: async (id) => rebuildSearchTextWhere({ collectionId: id }),
});

export const sizeChartsCrud = crud({
  model: "sizeChart",
  entity: "SizeChart",
  permission: "categories.manage",
  schema: sizeChartSchema,
  orderBy: { name: "asc" },
  toData: (input) => {
    for (const r of input.rows) {
      if (r.values.length !== input.columns.length) throw badRequest("VALIDATION", `La ligne « ${r.size} » doit avoir ${input.columns.length} valeurs.`);
    }
    return { ...input, columns: JSON.stringify(input.columns), rows: JSON.stringify(input.rows) };
  },
});

export const regionsCrud = crud({
  model: "deliveryRegion",
  entity: "DeliveryRegion",
  permission: "settings.manage",
  schema: deliveryRegionSchema,
  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
});

export const bannersCrud = crud({
  model: "banner",
  entity: "Banner",
  permission: "content.manage",
  schema: bannerSchema,
  orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
});
