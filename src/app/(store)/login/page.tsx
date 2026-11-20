import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.isStaff ? "/admin" : "/account");
  return (
    <div className="container-x flex justify-center py-14 lg:py-20">
      <div className="w-full max-w-md">
        <h1 className="h-display text-center text-4xl">{t("auth.loginTitle")}</h1>
        <p className="mb-8 mt-2 text-center text-ink-muted">{next === "/checkout" ? t("checkout.loginRequired") : t("auth.loginSubtitle")}</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
