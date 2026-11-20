import type { Metadata } from "next";
import { getI18n } from "@/server/i18n";
import { TrackOrderForm } from "@/components/store/track-order-form";

export const metadata: Metadata = { title: "Suivre une commande" };

export default async function TrackOrderPage() {
  const { t } = await getI18n();
  return (
    <div className="container-x flex justify-center py-14">
      <div className="w-full max-w-xl">
        <h1 className="h-display text-center text-4xl">{t("pages.trackTitle")}</h1>
        <p className="mb-8 mt-3 text-center text-ink-muted">{t("pages.trackText")}</p>
        <TrackOrderForm />
      </div>
    </div>
  );
}
