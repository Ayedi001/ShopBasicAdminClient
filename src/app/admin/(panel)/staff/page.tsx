import { adminPage } from "@/server/admin-guard";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/admin/parts";
import { StaffManager } from "@/components/admin/staff-manager";
import { isStaffRole, permissionsFor } from "@/lib/constants";

export default async function StaffPage() {
  const me = await adminPage("staff.manage");
  const staff = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "MANAGER", "EMPLOYEE"] } },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Équipe & rôles"
        description="Propriétaire : accès total. Gérant : catalogue, commandes, stock. Employé : commandes et clients. Les permissions sont aussi vérifiées côté API."
      />
      <StaffManager
        currentUserId={me.id}
        items={staff.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive,
          permissions: isStaffRole(u.role) ? [...permissionsFor(u.role, u.permissions)] : [],
          hasOverride: !!u.permissions,
        }))}
      />
    </>
  );
}
