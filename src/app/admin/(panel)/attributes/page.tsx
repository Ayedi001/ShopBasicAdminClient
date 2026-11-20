import Link from "next/link";
import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/admin/parts";
import { SimpleCrud, type CrudField } from "@/components/admin/simple-crud";
import { SEASON_LABELS, SIZE_TYPE_LABELS } from "@/components/admin/labels";
import { SEASONS, SIZE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "colors", label: "Couleurs" },
  { key: "sizes", label: "Tailles" },
  { key: "materials", label: "Matières" },
  { key: "collections", label: "Collections" },
] as const;

const names = (max: number): CrudField[] => [
  { key: "name", label: "Nom (FR) *", type: "text", column: true, span: 1, max },
  { key: "nameAr", label: "Nom (AR)", type: "text", rtl: true, nullable: true, column: true, span: 1, max },
  { key: "nameEn", label: "Nom (EN)", type: "text", nullable: true, column: true, span: 1, max },
];

export default async function AttributesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await adminPage("categories.manage");
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "colors";

  let content: React.ReactNode = null;
  if (tab === "colors") {
    const items = await prisma.color.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { variants: true } } } });
    content = (
      <SimpleCrud
        title="Couleurs"
        description="Utilisées pour les variantes, les filtres de la boutique et les galeries par couleur."
        entityLabel="couleur"
        endpoint="/api/admin/colors"
        deleteConfirm="Supprimer cette couleur ? Impossible si des variantes l'utilisent."
        defaults={{ name: "", nameAr: "", nameEn: "", hex: "#000000", sortOrder: (items.length + 1) * 10 }}
        items={items.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr, nameEn: c.nameEn, hex: c.hex, sortOrder: c.sortOrder, usage: `${c._count.variants} variante(s)` }))}
        fields={[...names(40), { key: "hex", label: "Couleur *", type: "color", column: true, span: 2 }, { key: "sortOrder", label: "Ordre", type: "number", column: true, span: 1 }]}
      />
    );
  } else if (tab === "sizes") {
    const items = await prisma.size.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
    content = (
      <SimpleCrud
        title="Tailles"
        description="Regroupées par système (vêtements, pointures, âge enfant, taille unique). L'ordre détermine l'affichage sur la fiche produit."
        entityLabel="taille"
        endpoint="/api/admin/sizes"
        deleteConfirm="Supprimer cette taille ? Impossible si des variantes l'utilisent."
        defaults={{ label: "", type: "CLOTHING", sortOrder: 0 }}
        items={items.map((s) => ({ id: s.id, label: s.label, type: s.type, sortOrder: s.sortOrder }))}
        fields={[
          { key: "label", label: "Libellé *", type: "text", column: true, span: 1, max: 20 },
          { key: "type", label: "Système", type: "select", options: SIZE_TYPES.map((t) => ({ value: t, label: SIZE_TYPE_LABELS[t] })), column: true, span: 1 },
          { key: "sortOrder", label: "Ordre", type: "number", column: true, span: 1 },
        ]}
      />
    );
  } else if (tab === "materials") {
    const items = await prisma.material.findMany({ orderBy: { name: "asc" } });
    content = (
      <SimpleCrud
        title="Matières"
        description="Proposées dans la composition des produits (les nouvelles matières saisies sur un produit sont aussi ajoutées ici)."
        entityLabel="matière"
        endpoint="/api/admin/materials"
        defaults={{ name: "", nameAr: "", nameEn: "" }}
        items={items.map((m) => ({ id: m.id, name: m.name, nameAr: m.nameAr, nameEn: m.nameEn }))}
        fields={names(60)}
      />
    );
  } else {
    const items = await prisma.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
    content = (
      <SimpleCrud
        title="Collections"
        description="Regroupements saisonniers ou thématiques (ex. Été 2026), avec leur propre page /collections/…"
        entityLabel="collection"
        endpoint="/api/admin/collections"
        defaults={{ name: "", nameAr: "", nameEn: "", slug: "", description: "", season: "ALL", imageUrl: "", isFeatured: false, isActive: true, sortOrder: (items.length + 1) * 10 }}
        items={items.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          slug: c.slug,
          description: c.description,
          season: c.season,
          imageUrl: c.imageUrl,
          isFeatured: c.isFeatured,
          isActive: c.isActive,
          sortOrder: c.sortOrder,
          products: c._count.products,
        }))}
        fields={[
          ...names(80),
          { key: "slug", label: "Adresse (slug)", type: "text", hint: "Vide = générée", span: 1 },
          { key: "season", label: "Saison", type: "select", options: SEASONS.map((s) => ({ value: s, label: SEASON_LABELS[s] })), column: true, span: 1 },
          { key: "sortOrder", label: "Ordre", type: "number", span: 1 },
          { key: "description", label: "Description", type: "textarea", nullable: true, span: 3, max: 1000 },
          { key: "imageUrl", label: "Image", type: "image", folder: "collections", nullable: true, column: true, span: 3 },
          { key: "isFeatured", label: "Mise en avant sur l'accueil", type: "toggle", column: true, span: 1 },
          { key: "isActive", label: "Active", type: "toggle", column: true, span: 1 },
        ]}
      />
    );
  }

  return (
    <>
      <PageHeader title="Couleurs, tailles, matières et collections" description="Attributs partagés par tous les produits du catalogue." />
      <div className="mb-4 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/attributes?tab=${t.key}`} className={cn("-mb-px border-b-2 px-3 py-2 text-[13px]", tab === t.key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}>
            {t.label}
          </Link>
        ))}
      </div>
      {content}
    </>
  );
}
