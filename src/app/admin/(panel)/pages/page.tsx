import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { CONTENT_PAGES, LOCALES } from "@/lib/constants";
import { PageHeader } from "@/components/admin/parts";
import { ContentPagesEditor } from "@/components/admin/content-pages-editor";
import { CONTENT_PAGE_LABELS, LOCALE_LABELS_FR } from "@/components/admin/labels";

export default async function ContentPagesAdmin({ searchParams }: { searchParams: Promise<{ slug?: string; locale?: string }> }) {
  await adminPage("content.manage");
  const sp = await searchParams;
  const slug = (CONTENT_PAGES as readonly string[]).includes(sp.slug ?? "") ? sp.slug! : "about";
  const locale = (LOCALES as readonly string[]).includes(sp.locale ?? "") ? sp.locale! : "fr";
  const pages = await prisma.contentPage.findMany();
  const map: Record<string, { title: string; body: string }> = {};
  for (const p of pages) map[`${p.slug}:${p.locale}`] = { title: p.title, body: p.body };

  return (
    <>
      <PageHeader title="Pages de contenu" description="À propos, FAQ, politiques… éditables en français, arabe et anglais. Markdown simple supporté." />
      <ContentPagesEditor
        slug={slug}
        locale={locale}
        labels={{ pages: CONTENT_PAGE_LABELS, locales: LOCALE_LABELS_FR }}
        slugs={[...CONTENT_PAGES]}
        locales={[...LOCALES]}
        initial={map[`${slug}:${locale}`] ?? { title: CONTENT_PAGE_LABELS[slug] ?? slug, body: "" }}
      />
    </>
  );
}
