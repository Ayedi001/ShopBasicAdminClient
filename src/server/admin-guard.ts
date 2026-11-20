import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./auth/session";
import type { Permission } from "@/lib/constants";

/**
 * Server-side guard for admin pages. API routes enforce the same permissions
 * independently; this only decides what the page renders.
 */
export async function adminPage(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.isStaff) redirect("/");
  if (permission && !user.permissions.includes(permission)) redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  return user;
}
