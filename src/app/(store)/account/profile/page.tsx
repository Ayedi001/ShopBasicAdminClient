import { requireCustomer } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { formatPhone } from "@/lib/phone";
import { ProfileForm, PasswordForm } from "@/components/store/profile-forms";

export default async function ProfilePage() {
  const user = await requireCustomer();
  const [profile, regions] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { userId: user.id } }),
    prisma.deliveryRegion.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameAr: true } }),
  ]);
  return (
    <div className="grid gap-12 xl:grid-cols-[1.4fr_1fr]">
      <ProfileForm
        regions={regions}
        initial={{
          fullName: user.fullName,
          phone: formatPhone(user.phone),
          email: user.email,
          address: profile?.address ?? "",
          city: profile?.city ?? "",
          regionId: profile?.regionId ?? "",
          postalCode: profile?.postalCode ?? "",
          deliveryInstructions: profile?.deliveryInstructions ?? "",
        }}
      />
      <PasswordForm />
    </div>
  );
}
