"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Heart, LayoutGrid, LogOut, Package, RefreshCw, UserRound } from "lucide-react";
import { useStore } from "./store-provider";
import { post } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const { t } = useStore();
  return (
    <button
      onClick={async () => {
        await post("/api/auth/logout").catch(() => null);
        window.location.assign("/");
      }}
      className={className}
    >
      <LogOut className="h-4 w-4" /> {t("common.logout")}
    </button>
  );
}

export function AccountNav() {
  const { t, unread } = useStore();
  const pathname = usePathname();
  const links = [
    { href: "/account", label: t("account.overview"), icon: LayoutGrid, exact: true },
    { href: "/account/orders", label: t("account.orders"), icon: Package },
    { href: "/account/returns", label: t("account.returns"), icon: RefreshCw },
    { href: "/account/wishlist", label: t("account.wishlist"), icon: Heart },
    { href: "/account/notifications", label: t("account.notifications"), icon: Bell, badge: unread },
    { href: "/account/profile", label: t("account.profile"), icon: UserRound },
  ];
  return (
    <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:px-0">
      {links.map(({ href, label, icon: Icon, exact, badge }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-3 px-3 py-2.5 text-[14px] transition",
              active ? "bg-brand text-white" : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.6} />
            {label}
            {!!badge && <span className={cn("ms-auto rounded-full px-1.5 text-[11px]", active ? "bg-white text-ink" : "bg-sale text-white")}>{badge}</span>}
          </Link>
        );
      })}
      <LogoutButton className="flex shrink-0 items-center gap-3 px-3 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-100 lg:mt-4 lg:border-t lg:border-neutral-200 lg:pt-4" />
    </nav>
  );
}
