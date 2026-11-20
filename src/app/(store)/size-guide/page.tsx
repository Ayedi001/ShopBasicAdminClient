import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { localized } from "@/i18n";
import { safeJson } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/catalog-view";
import { SizeChartTable } from "@/components/store/size-guide";

export const metadata: Metadata = { title: "Guide des tailles", alternates: { canonical: "/size-guide" } };

export default async function SizeGuidePage() {
  const { t, locale } = await getI18n();
  const charts = await prisma.sizeChart.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="container-x py-8 lg:py-12">
      <Breadcrumbs items={[{ href: "/", label: t("common.home") }, { label: t("pages.sizeGuideTitle") }]} />
      <h1 className="h-display mb-3 mt-6 text-4xl lg:text-5xl">{t("pages.sizeGuideTitle")}</h1>
      <p className="mb-10 max-w-2xl text-ink-muted">{t("pages.sizeGuideIntro")}</p>
      <nav className="mb-10 flex flex-wrap gap-2">
        {charts.map((c) => (
          <a key={c.id} href={`#chart-${c.id}`} className="chip">
            {localized(c, locale)}
          </a>
        ))}
      </nav>
      <div className="space-y-12">
        {charts.map((c) => (
          <section key={c.id} id={`chart-${c.id}`} className="scroll-mt-24">
            <h2 className="h-display mb-4 text-2xl">{localized(c, locale)}</h2>
            <SizeChartTable chart={{ name: localized(c, locale), description: c.description, unit: c.unit, columns: safeJson(c.columns, []), rows: safeJson(c.rows, []) }} />
            {c.description && <p className="mt-3 text-sm text-ink-muted">{c.description}</p>}
          </section>
        ))}
      </div>
      <section className="mt-14 bg-paper p-6 lg:p-8">
        <h2 className="h-display mb-3 text-2xl">{t("pages.howToMeasure")}</h2>
        <ul className="grid gap-3 text-[15px] text-neutral-700 sm:grid-cols-2">
          <li>
            <strong>Poitrine :</strong> mesurez horizontalement à l&apos;endroit le plus fort de la poitrine.
          </li>
          <li>
            <strong>Taille :</strong> mesurez au creux de la taille, sans serrer.
          </li>
          <li>
            <strong>Hanches :</strong> mesurez à l&apos;endroit le plus fort des hanches, pieds joints.
          </li>
          <li>
            <strong>Pied :</strong> mesurez du talon au bout du plus long orteil, en fin de journée.
          </li>
        </ul>
      </section>
    </div>
  );
}
