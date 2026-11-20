import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export const dt = (millimes: number) => formatMoney(millimes);
export const fdate = (d: Date | string) => formatDate(d, "fr");
export const fdatetime = (d: Date | string) => formatDate(d, "fr", true);

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[13px] text-neutral-500 hover:text-neutral-900">
          <ChevronLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description && <p className="mt-1 text-[13px] text-neutral-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClass }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("a-card", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <h2 className="text-[14px] font-semibold text-neutral-900">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string; tone?: "warn" | "ok" | "danger" }) {
  const body = (
    <div className={cn("a-card h-full p-4 transition", href && "hover:border-neutral-400")}>
      <p className="text-[12px] font-medium text-neutral-500">{label}</p>
      <p className={cn("mt-1 text-[22px] font-semibold tabular-nums", tone === "warn" && "text-amber-600", tone === "danger" && "text-red-600", tone === "ok" && "text-emerald-700")}>{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-neutral-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  REQUESTED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-sky-100 text-sky-800",
  APPROVED: "bg-sky-100 text-sky-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  RECEIVED: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-neutral-200 text-neutral-700",
  ARCHIVED: "bg-neutral-200 text-neutral-700",
  INACTIVE: "bg-neutral-200 text-neutral-700",
  DRAFT: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200",
  REJECTED: "bg-red-100 text-red-800",
  DANGER: "bg-red-100 text-red-800",
  SCHEDULED: "bg-sky-100 text-sky-800",
  EXPIRED: "bg-neutral-200 text-neutral-700",
};

export function Badge({ status, children, className }: { status: string; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", BADGE[status] ?? "bg-neutral-100 text-neutral-700", className)}>{children}</span>;
}

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-12 text-center text-[13px] text-neutral-500">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Link-based pagination preserving the current filters. */
export function Pagination({ page, pages, total, base, params }: { page: number; pages: number; total: number; base: string; params: Record<string, string | undefined> }) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 text-[13px] text-neutral-500">
      <span>
        {total} résultat{total > 1 ? "s" : ""} · page {page}/{pages}
      </span>
      <div className="flex gap-1">
        {page > 1 ? (
          <Link className="a-btn a-btn-sm" href={href(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Link>
        ) : (
          <span className="a-btn a-btn-sm pointer-events-none opacity-40">
            <ChevronLeft className="h-4 w-4" /> Précédent
          </span>
        )}
        {page < pages ? (
          <Link className="a-btn a-btn-sm" href={href(page + 1)}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="a-btn a-btn-sm pointer-events-none opacity-40">
            Suivant <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

export function Denied() {
  return (
    <div className="a-card p-8 text-center">
      <h1 className="text-lg font-semibold">Accès refusé</h1>
      <p className="mt-2 text-[13px] text-neutral-500">Votre rôle ne permet pas d&apos;accéder à cette section. Contactez le propriétaire de la boutique.</p>
    </div>
  );
}

export function ColorDot({ hex, className }: { hex?: string | null; className?: string }) {
  if (!hex) return null;
  return <span className={cn("inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/15", className)} style={{ background: hex }} />;
}
