import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getI18n } from "@/server/i18n";
import { AccountNav } from "@/components/store/account-nav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (user.isStaff) redirect("/admin");
  const { t } = await getI18n();
  return (
    <div className="container-x py-8 lg:py-12">
      <p className="eyebrow">{t("common.account")}</p>
      <h1 className="h-display mb-8 mt-1 text-4xl">{t("account.hello", { name: user.fullName.split(" ")[0] })}</h1>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
