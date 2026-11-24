"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderTree,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Palette,
  Percent,
  RotateCcw,
  Ruler,
  ScrollText,
  Settings,
  Shirt,
  Star,
  Truck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { post } from "@/lib/client-api";
import type { Permission } from "@/lib/constants";
import type { AdminAlerts } from "@/server/admin-alerts";
import { ROLE_LABELS } from "./labels";
import { AdminToaster } from "./ui";

type Item = { href: string; label: string; icon: typeof Home; perm: Permission; badge?: keyof AdminAlerts; exact?: boolean };

const CORE_NAV: Item[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, perm: "dashboard.view", exact: true },
  { href: "/admin/orders", label: "Commandes", icon: ClipboardList, perm: "orders.view", badge: "pendingOrders" },
  { href: "/admin/products", label: "Produits", icon: Shirt, perm: "products.manage" },
  { href: "/admin/inventory", label: "Stock", icon: Boxes, perm: "inventory.manage", badge: "lowStock" },
  { href: "/admin/customers", label: "Clients", icon: Users, perm: "customers.view" },
  { href: "/admin/returns", label: "Retours & échanges", icon: RotateCcw, perm: "returns.manage", badge: "pendingReturns" },
  { href: "/admin/messages", label: "Messages", icon: Mail, perm: "customers.view", badge: "unreadMessages" },
];

const MORE_NAV: Item[] = [
  { href: "/admin/categories", label: "Catégories", icon: FolderTree, perm: "categories.manage" },
  { href: "/admin/attributes", label: "Couleurs, tailles…", icon: Palette, perm: "categories.manage" },
  { href: "/admin/size-charts", label: "Guides des tailles", icon: Ruler, perm: "categories.manage" },
  { href: "/admin/reviews", label: "Avis clients", icon: Star, perm: "reviews.manage", badge: "pendingReviews" },
  { href: "/admin/promotions", label: "Promotions & coupons", icon: Percent, perm: "promotions.manage" },
  { href: "/admin/homepage", label: "Page d'accueil", icon: Home, perm: "content.manage" },
  { href: "/admin/pages", label: "Pages de contenu", icon: FileText, perm: "content.manage" },
  { href: "/admin/reports", label: "Rapports & exports", icon: BarChart3, perm: "reports.view" },
  { href: "/admin/delivery", label: "Livraison", icon: Truck, perm: "settings.manage" },
  { href: "/admin/settings", label: "Paramètres", icon: Settings, perm: "settings.manage" },
  { href: "/admin/staff", label: "Équipe & rôles", icon: UserCog, perm: "staff.manage" },
  { href: "/admin/audit", label: "Journal d'audit", icon: ScrollText, perm: "audit.view" },
];

const BELL_ITEMS: { key: keyof AdminAlerts; label: string; href: string }[] = [
  { key: "pendingOrders", label: "commande(s) à confirmer", href: "/admin/orders?status=PENDING" },
  { key: "pendingReturns", label: "demande(s) de retour/échange", href: "/admin/returns?status=REQUESTED" },
  { key: "pendingReviews", label: "avis à modérer", href: "/admin/reviews?status=PENDING" },
  { key: "unreadMessages", label: "message(s) non lu(s)", href: "/admin/messages" },
  { key: "lowStock", label: "variante(s) en stock faible", href: "/admin/inventory?filter=low" },
];

export function AdminShell({
  user,
  storeName,
  initialAlerts,
  maintenance,
  children,
}: {
  user: { fullName: string; role: string; permissions: Permission[] };
  storeName: string;
  initialAlerts: AdminAlerts;
  maintenance: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [newOrder, setNewOrder] = useState(false);
  const latest = useRef(initialAlerts.latestOrderAt);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => setAlerts(initialAlerts), [initialAlerts]);
  useEffect(() => setOpen(false), [pathname]);

  // Poll counters so new orders show up without reloading the page
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/admin/alerts", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as AdminAlerts;
        if (data.latestOrderAt && latest.current && data.latestOrderAt > latest.current) setNewOrder(true);
        latest.current = data.latestOrderAt;
        setAlerts(data);
      } catch {
        /* offline: keep previous counters */
      }
    };
    const id = setInterval(tick, 45_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!bell) return;
    const close = (e: MouseEvent) => !bellRef.current?.contains(e.target as Node) && setBell(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [bell]);

  const logout = async () => {
    await post("/api/auth/logout").catch(() => undefined);
    window.location.assign("/admin/login");
  };

  const visible = (p: Permission) => user.permissions.includes(p);
  const totalAlerts = BELL_ITEMS.reduce((s, b) => s + (visible(permFor(b.key)) ? Number(alerts[b.key]) || 0 : 0), 0);

  const coreItems = CORE_NAV.filter((i) => visible(i.perm));
  const moreItems = MORE_NAV.filter((i) => visible(i.perm));
  const isMoreActive = moreItems.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const [moreOpen, setMoreOpen] = useState(isMoreActive);

  useEffect(() => {
    if (isMoreActive) setMoreOpen(true);
  }, [isMoreActive]);

  const renderItem = ({ href, label, icon: Icon, badge, exact }: Item) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    const count = badge ? Number(alerts[badge]) || 0 : 0;
    return (
      <li key={href}>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition",
            active ? "bg-white/10 font-medium text-white" : "text-neutral-300 hover:bg-white/5 hover:text-white",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{label}</span>
          {count > 0 && (
            <span className={cn("ml-auto rounded-full px-1.5 text-[10px] font-semibold", badge === "lowStock" ? "bg-amber-500/90 text-black" : "bg-red-500 text-white")}>{count}</span>
          )}
        </Link>
      </li>
    );
  };

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {coreItems.length > 0 && (
        <div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Principal</p>
          <ul className="space-y-0.5">{coreItems.map(renderItem)}</ul>
        </div>
      )}
      {moreItems.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 hover:text-white"
            aria-expanded={moreOpen}
          >
            <span>Configuration & plus</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition", moreOpen && "rotate-180")} />
          </button>
          {moreOpen && <ul className="space-y-0.5">{moreItems.map(renderItem)}</ul>}
        </div>
      )}
    </nav>
  );

  return (
    <AdminToaster>
      <div dir="ltr" lang="fr" className="min-h-screen bg-neutral-100 font-sans text-neutral-900">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-neutral-950 text-white transition-transform print:hidden lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <Link href="/admin" className="truncate text-[15px] font-semibold tracking-tight">
              {storeName} <span className="font-normal text-neutral-400">· Admin</span>
            </Link>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          {nav}
          <div className="border-t border-white/10 p-3">
            <p className="truncate text-[13px] font-medium">{user.fullName}</p>
            <p className="text-[11px] text-neutral-400">{ROLE_LABELS[user.role] ?? user.role}</p>
            <div className="mt-2 flex gap-1.5">
              <a href="/" target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-[12px] hover:bg-white/15">
                <ExternalLink className="h-3.5 w-3.5" /> Boutique
              </a>
              <button type="button" onClick={logout} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-[12px] hover:bg-white/15">
                <LogOut className="h-3.5 w-3.5" /> Déconnexion
              </button>
            </div>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

        <div className="lg:pl-60 print:pl-0">
          <header className="sticky top-0 z-20 flex print:hidden h-14 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur sm:px-6">
            <button type="button" className="rounded p-1.5 hover:bg-neutral-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </button>
            {maintenance && (
              <Link href="/admin/settings" className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-medium text-amber-900">
                Mode maintenance actif
              </Link>
            )}
            {newOrder && (
              <button
                type="button"
                onClick={() => {
                  setNewOrder(false);
                  router.push("/admin/orders?status=PENDING");
                  router.refresh();
                }}
                className="animate-fadeIn rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-medium text-white"
              >
                Nouvelle commande reçue — voir
              </button>
            )}
            <div className="ml-auto" ref={bellRef}>
              <button type="button" onClick={() => setBell((b) => !b)} className="relative rounded-full p-2 hover:bg-neutral-100" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {totalAlerts > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
              </button>
              {bell && (
                <div className="absolute right-4 mt-1 w-80 animate-fadeIn rounded-lg border border-neutral-200 bg-white p-2 shadow-xl">
                  <p className="px-2 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">À traiter</p>
                  {totalAlerts === 0 && <p className="px-2 py-3 text-[13px] text-neutral-500">Rien en attente.</p>}
                  {BELL_ITEMS.filter((b) => visible(permFor(b.key)) && Number(alerts[b.key]) > 0).map((b) => (
                    <Link key={b.key} href={b.href} onClick={() => setBell(false)} className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] hover:bg-neutral-50">
                      <span className="min-w-[1.75rem] rounded-full bg-neutral-900 px-1.5 text-center text-[11px] font-semibold text-white">{alerts[b.key]}</span>
                      {b.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminToaster>
  );
}

function permFor(key: keyof AdminAlerts): Permission {
  switch (key) {
    case "pendingReturns":
      return "returns.manage";
    case "pendingReviews":
      return "reviews.manage";
    case "unreadMessages":
      return "customers.view";
    case "lowStock":
      return "inventory.manage";
    default:
      return "orders.view";
  }
}
