import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-sky-100 text-sky-900",
  PREPARING: "bg-indigo-100 text-indigo-900",
  SHIPPED: "bg-violet-100 text-violet-900",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-neutral-200 text-neutral-700",
  REQUESTED: "bg-amber-100 text-amber-900",
  APPROVED: "bg-sky-100 text-sky-900",
  RECEIVED: "bg-indigo-100 text-indigo-900",
  COMPLETED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
};

export function StatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap px-2 py-0.5 text-[12px] font-medium", STYLES[status] ?? "bg-neutral-100", className)}>{label}</span>;
}

const FLOW = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];

export function OrderTimeline({
  status,
  history,
  labels,
  formatDate,
}: {
  status: string;
  history: { toStatus: string; createdAt: Date | string }[];
  labels: Record<string, string>;
  formatDate: (d: Date | string) => string;
}) {
  if (status === "CANCELLED") {
    return (
      <ol className="space-y-3">
        {history.map((h, i) => (
          <li key={i} className="flex items-center gap-3 text-[14px]">
            <span className={cn("h-2.5 w-2.5 rounded-full", h.toStatus === "CANCELLED" ? "bg-sale" : "bg-neutral-400")} />
            <span className="font-medium">{labels[h.toStatus]}</span>
            <span className="text-ink-muted">{formatDate(h.createdAt)}</span>
          </li>
        ))}
      </ol>
    );
  }
  const reached = FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1">
      {FLOW.map((s, i) => {
        const h = [...history].reverse().find((x) => x.toStatus === s);
        const done = i <= reached;
        return (
          <li key={s} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-brand" : "bg-neutral-200")} />
              <span className={cn("flex h-3.5 w-3.5 shrink-0 rounded-full border-2", done ? "border-brand bg-brand" : "border-neutral-300 bg-white", i === reached && "ring-4 ring-brand/15")} />
              <span className={cn("h-0.5 flex-1", i === FLOW.length - 1 ? "bg-transparent" : i < reached ? "bg-brand" : "bg-neutral-200")} />
            </div>
            <span className={cn("mt-2 text-[11px] leading-tight sm:text-[12px]", done ? "font-medium text-ink" : "text-ink-faint")}>{labels[s]}</span>
            {h && <span className="mt-0.5 hidden text-[11px] text-ink-muted sm:block">{formatDate(h.createdAt)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
