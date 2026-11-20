import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getDeliveryOptions } from "@/server/shipping";
import { formatPhone } from "@/lib/phone";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");
  if (user.isStaff) {
    return (
      <div className="container-x py-24 text-center">
        <p className="h-display text-3xl">Compte équipe</p>
        <p className="mt-3 text-ink-muted">Les commandes doivent être passées avec un compte client.</p>
        <Link href="/admin" className="btn-primary mt-6">
          Tableau de bord
        </Link>
      </div>
    );
  }
  const [profile, options] = await Promise.all([prisma.customerProfile.findUnique({ where: { userId: user.id } }), getDeliveryOptions()]);
  return (
    <div className="container-x py-10">
      <CheckoutForm
        initial={{
          fullName: user.fullName,
          phone: formatPhone(user.phone).replace(/^\+216\s/, ""),
          address: profile?.address ?? "",
          city: profile?.city ?? "",
          regionId: profile?.regionId ?? "",
          postalCode: profile?.postalCode ?? "",
          deliveryInstructions: profile?.deliveryInstructions ?? "",
        }}
        regions={options.regions}
        pickupEnabled={options.pickupEnabled}
        pickupAddress={options.pickupAddress}
        pickupHours={options.pickupHours}
        paymentNote={options.paymentNote}
      />
    </div>
  );
}
