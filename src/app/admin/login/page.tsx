import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getSetting } from "@/server/settings";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Connexion administration", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.isStaff) redirect("/admin");
  const store = await getSetting("store");
  return (
    <div dir="ltr" lang="fr" className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-[13px] font-medium uppercase tracking-[0.2em] text-neutral-400">{store.name}</p>
        <div className="rounded-xl bg-white p-6 shadow-2xl">
          <h1 className="text-[18px] font-semibold">Espace administration</h1>
          <p className="mb-5 mt-1 text-[13px] text-neutral-500">Réservé à l&apos;équipe de la boutique.</p>
          {user && !user.isStaff && (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Vous êtes connecté avec un compte client qui n&apos;a pas accès à l&apos;administration. Connectez-vous avec un compte de l&apos;équipe.
            </p>
          )}
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-[12px] text-neutral-500">
          <a href="/" className="hover:text-neutral-300">
            ← Retour à la boutique
          </a>
        </p>
      </div>
    </div>
  );
}
