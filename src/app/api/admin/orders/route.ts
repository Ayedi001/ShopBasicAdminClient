import { api, intParam } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { listOrders } from "@/server/admin-orders";

export const GET = api(async (req) => {
  await requireStaff("orders.view");
  const sp = req.nextUrl.searchParams;
  return listOrders({
    q: sp.get("q"),
    status: sp.get("status"),
    from: sp.get("from"),
    to: sp.get("to"),
    userId: sp.get("customer"),
    page: intParam(sp.get("page"), 1),
    pageSize: intParam(sp.get("pageSize"), 20, 1, 100),
  });
});
