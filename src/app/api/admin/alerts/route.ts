import { api } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { adminAlerts } from "@/server/admin-alerts";

export const GET = api(async () => {
  const user = await requireStaff();
  return adminAlerts(user);
});
