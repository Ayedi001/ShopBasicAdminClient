import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { productEditorOptions } from "@/server/admin-product-data";
import { Badge, PageHeader } from "@/components/admin/parts";
import { PRODUCT_STATUS_LABELS } from "@/components/admin/labels";
import { ProductForm, type ProductFormValue } from "@/components/admin/product-form";
import { VariantsEditor } from "@/components/admin/variants-editor";
import { ImagesManager } from "@/components/admin/images-manager";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "general", label: "Informations" },
  { key: "variants", label: "Variantes & stock" },
  { key: "images", label: "Photos & vidéos" },
] as const;

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await adminPage("products.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "general";
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      brand: true,
      materials: { include: { material: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { include: { color: true, size: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();
  const options = await productEditorOptions();

  const value: ProductFormValue = {
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description,
    audience: product.audience,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    brandName: product.brand?.name ?? "",
    collectionId: product.collectionId ?? "",
    season: product.season,
    fitType: product.fitType ?? "",
    weightGrams: product.weightGrams,
    careInstructions: product.careInstructions ?? "",
    countryOfOrigin: product.countryOfOrigin ?? "",
    characteristics: product.characteristics ?? "",
    price: product.price,
    salePrice: product.salePrice,
    status: product.status,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    isOnSale: product.isOnSale,
    sizeChartId: product.sizeChartId ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    materials: product.materials.map((m) => ({ materialName: m.material.name, percentage: m.percentage })),
    translations: (["ar", "en"] as const).map((locale) => {
      const t = product.translations.find((x) => x.locale === locale);
      return { locale, name: t?.name ?? "", shortDescription: t?.shortDescription ?? "", description: t?.description ?? "", careInstructions: t?.careInstructions ?? "" };
    }),
  };
  const activeVariants = product.variants.filter((v) => v.isActive);
  const sizeType = options.categories.flatMap((c) => c.subcategories).find((s) => s.id === product.subcategoryId)?.sizeType ?? "CLOTHING";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Produits" }}
        title={product.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge status={product.status}>{PRODUCT_STATUS_LABELS[product.status]}</Badge>
            <span>
              {activeVariants.length} variante(s) active(s) · {product.totalAvailable} unité(s) disponible(s) · {product.images.length} média(s)
            </span>
          </span>
        }
        actions={
          product.status === "PUBLISHED" && (
            <a href={`/p/${product.slug}`} target="_blank" rel="noreferrer" className="a-btn">
              <ExternalLink className="h-4 w-4" /> Voir sur la boutique
            </a>
          )
        }
      />
      {product.status === "PUBLISHED" && (!activeVariants.length || !product.images.length) && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Ce produit est publié mais {!activeVariants.length ? "n'a aucune variante active : il ne peut pas être commandé" : "n'a aucune photo"}.
        </p>
      )}
      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/products/${id}${t.key === "general" ? "" : `?tab=${t.key}`}`}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[13px]", tab === t.key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {tab === "general" && <ProductForm options={options} productId={product.id} initial={value} />}
      {tab === "variants" && (
        <VariantsEditor
          productId={product.id}
          basePrice={product.price}
          baseSalePrice={product.salePrice}
          colors={options.colors}
          sizes={options.sizes}
          defaultSizeType={sizeType}
          canAdjustStock={user.permissions.includes("inventory.manage")}
          initial={product.variants.map((v) => ({
            id: v.id,
            colorId: v.colorId,
            sizeId: v.sizeId,
            sku: v.sku ?? "",
            price: v.price,
            salePrice: v.salePrice,
            stock: v.stock,
            reserved: v.reserved,
            available: v.available,
            isActive: v.isActive,
          }))}
        />
      )}
      {tab === "images" && (
        <ImagesManager
          productId={product.id}
          colors={options.colors.filter((c) => product.variants.some((v) => v.colorId === c.id))}
          allColors={options.colors}
          initial={product.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl, kind: i.kind, view: i.view, colorId: i.colorId, isMain: i.isMain, alt: i.alt ?? "" }))}
        />
      )}
    </>
  );
}
