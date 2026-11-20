import { api } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { unreadCount } from "@/server/notifications";
import { prisma } from "@/server/db";

export const GET = api(async () => {
  const user = await getCurrentUser();
  if (!user) return { user: null };
  const [unread, wishlist] = await Promise.all([
    unreadCount(user.id),
    prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } }),
  ]);
  return {
    user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, isStaff: user.isStaff },
    unread,
    wishlist: wishlist.map((w) => w.productId),
  };
});
