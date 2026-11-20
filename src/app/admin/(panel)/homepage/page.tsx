import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/admin/parts";
import { HomeSectionsEditor } from "@/components/admin/home-sections-editor";
import { SimpleCrud } from "@/components/admin/simple-crud";

export default async function HomepageAdminPage() {
  await adminPage("content.manage");
  const [sections, banners] = await Promise.all([
    prisma.homeSection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader title="Page d'accueil" description="Réordonnez les sections, masquez-les, et gérez les bannières du carrousel." />
      <HomeSectionsEditor
        sections={sections.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          titleAr: s.titleAr,
          titleEn: s.titleEn,
          subtitle: s.subtitle,
          subtitleAr: s.subtitleAr,
          subtitleEn: s.subtitleEn,
          isVisible: s.isVisible,
          sortOrder: s.sortOrder,
          config: (() => {
            try {
              return JSON.parse(s.config) as Record<string, string | number | boolean | null>;
            } catch {
              return {};
            }
          })(),
        }))}
      />
      <div className="mt-4">
        <SimpleCrud
          title="Bannières"
          description="Images du carrousel HERO, bandeaux PROMO et tuiles CATEGORY."
          entityLabel="bannière"
          endpoint="/api/admin/banners"
          defaults={{
            placement: "HERO",
            title: "",
            titleAr: "",
            titleEn: "",
            subtitle: "",
            subtitleAr: "",
            subtitleEn: "",
            ctaLabel: "Découvrir",
            ctaLabelAr: "",
            ctaLabelEn: "",
            linkUrl: "/shop",
            imageUrl: "",
            sortOrder: (banners.length + 1) * 10,
            isActive: true,
            startsAt: null,
            endsAt: null,
          }}
          items={banners.map((b) => ({
            id: b.id,
            placement: b.placement,
            title: b.title,
            titleAr: b.titleAr,
            titleEn: b.titleEn,
            subtitle: b.subtitle,
            subtitleAr: b.subtitleAr,
            subtitleEn: b.subtitleEn,
            ctaLabel: b.ctaLabel,
            ctaLabelAr: b.ctaLabelAr,
            ctaLabelEn: b.ctaLabelEn,
            linkUrl: b.linkUrl,
            imageUrl: b.imageUrl,
            sortOrder: b.sortOrder,
            isActive: b.isActive,
            startsAt: b.startsAt?.toISOString() ?? null,
            endsAt: b.endsAt?.toISOString() ?? null,
          }))}
          fields={[
            { key: "imageUrl", label: "Image *", type: "image", folder: "banners", column: true, span: 3 },
            { key: "placement", label: "Emplacement", type: "select", options: [
              { value: "HERO", label: "Hero (carrousel)" },
              { value: "PROMO", label: "Promo" },
              { value: "CATEGORY", label: "Catégorie" },
            ], column: true, span: 1 },
            { key: "title", label: "Titre (FR) *", type: "text", column: true, span: 2, max: 120 },
            { key: "titleAr", label: "Titre (AR)", type: "text", rtl: true, nullable: true, span: 1, max: 120 },
            { key: "titleEn", label: "Titre (EN)", type: "text", nullable: true, span: 1, max: 120 },
            { key: "subtitle", label: "Sous-titre (FR)", type: "textarea", nullable: true, span: 3, max: 300 },
            { key: "subtitleAr", label: "Sous-titre (AR)", type: "textarea", rtl: true, nullable: true, span: 3, max: 300 },
            { key: "subtitleEn", label: "Sous-titre (EN)", type: "textarea", nullable: true, span: 3, max: 300 },
            { key: "ctaLabel", label: "Bouton (FR)", type: "text", nullable: true, span: 1, max: 40 },
            { key: "ctaLabelAr", label: "Bouton (AR)", type: "text", rtl: true, nullable: true, span: 1, max: 40 },
            { key: "ctaLabelEn", label: "Bouton (EN)", type: "text", nullable: true, span: 1, max: 40 },
            { key: "linkUrl", label: "Lien", type: "text", nullable: true, span: 2, max: 500 },
            { key: "sortOrder", label: "Ordre", type: "number", column: true, span: 1 },
            { key: "isActive", label: "Active", type: "toggle", column: true, span: 1 },
            { key: "startsAt", label: "Début", type: "datetime", nullable: true, span: 1 },
            { key: "endsAt", label: "Fin", type: "datetime", nullable: true, span: 1 },
          ]}
        />
      </div>
    </>
  );
}
