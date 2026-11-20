import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/server/db";
import { getI18n } from "@/server/i18n";
import { getSetting } from "@/server/settings";
import { CONTENT_PAGES } from "@/lib/constants";
import { formatPhone, whatsappDigits } from "@/lib/phone";
import { safeHref } from "@/lib/utils";
import { Markdown } from "@/components/store/markdown";
import { Breadcrumbs } from "@/components/store/catalog-view";
import { ContactForm } from "@/components/store/contact-form";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!(CONTENT_PAGES as readonly string[]).includes(slug)) return null;
  const { locale } = await getI18n();
  const pages = await prisma.contentPage.findMany({ where: { slug } });
  return pages.find((p) => p.locale === locale) ?? pages.find((p) => p.locale === "fr") ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page) return {};
  return { title: page.title, description: page.body.replace(/[#*\n]/g, " ").slice(0, 160), alternates: { canonical: `/pages/${page.slug}` } };
}

export default async function ContentPageView({ params }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();
  const { t } = await getI18n();
  const store = page.slug === "contact" ? await getSetting("store") : null;
  return (
    <div className="container-x py-8 lg:py-12">
      <Breadcrumbs items={[{ href: "/", label: t("common.home") }, { label: page.title }]} />
      <div className={store ? "mt-6 grid gap-12 lg:grid-cols-[1fr_1fr]" : "mx-auto mt-6 max-w-3xl"}>
        <article>
          <h1 className="h-display mb-6 text-4xl lg:text-5xl">{page.title}</h1>
          <div className="prose-store">
            <Markdown source={page.body} />
          </div>
          {store && (
            <ul className="mt-8 space-y-4 text-[15px]">
              {store.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-brand-accent" />
                  <a href={`tel:${store.phone}`} className="hover:underline" dir="ltr">
                    {formatPhone(store.phone)}
                  </a>
                </li>
              )}
              {store.whatsapp && (
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-brand-accent" />
                  <a href={`https://wa.me/${whatsappDigits(store.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    WhatsApp <span dir="ltr">{formatPhone(store.whatsapp)}</span>
                  </a>
                </li>
              )}
              {store.email && (
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-brand-accent" />
                  <a href={`mailto:${store.email}`} className="hover:underline">
                    {store.email}
                  </a>
                </li>
              )}
              {store.address && (
                <li className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-brand-accent" />
                  {store.mapUrl ? (
                    <a href={safeHref(store.mapUrl)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {store.address}
                    </a>
                  ) : (
                    store.address
                  )}
                </li>
              )}
              {store.openingHours && (
                <li className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-brand-accent" /> {store.openingHours}
                </li>
              )}
            </ul>
          )}
        </article>
        {store && (
          <div className="bg-paper p-6 lg:p-8">
            <h2 className="h-display mb-5 text-2xl">{t("pages.contactForm")}</h2>
            <ContactForm />
          </div>
        )}
      </div>
    </div>
  );
}
