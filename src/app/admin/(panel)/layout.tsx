import type { Metadata } from "next";
import { adminPage } from "@/server/admin-guard";
import { adminAlerts } from "@/server/admin-alerts";
import { getSetting } from "@/server/settings";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await adminPage();
  const [alerts, store, general] = await Promise.all([adminAlerts(user), getSetting("store"), getSetting("general")]);
  return (
    <AdminShell user={{ fullName: user.fullName, role: user.role, permissions: user.permissions }} storeName={store.name} initialAlerts={alerts} maintenance={general.maintenanceMode}>
      {children}
    </AdminShell>
  );
}
