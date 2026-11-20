import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth/session";
import { RegisterForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="container-x flex justify-center py-14 lg:py-20">
      <div className="w-full max-w-md">
        <h1 className="h-display text-center text-4xl">{t("auth.registerTitle")}</h1>
        <p className="mb-8 mt-2 text-center text-ink-muted">{next === "/checkout" ? t("checkout.loginRequired") : t("auth.registerSubtitle")}</p>
        <RegisterForm next={next} />
      </div>
    </div>
  );
}
