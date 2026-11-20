import { cn } from "@/lib/utils";

type Point = { label: string; value: number; secondary?: number };

/** Responsive SVG bar chart (no client JS); native tooltips via <title>. */
export function BarChart({ data, format = String, height = 220, secondaryLabel, primaryLabel }: { data: Point[]; format?: (n: number) => string; height?: number; primaryLabel?: string; secondaryLabel?: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const W = 100 / Math.max(1, data.length);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const every = Math.ceil(data.length / 12);
  return (
    <div>
      {(primaryLabel || secondaryLabel) && (
        <div className="mb-2 flex gap-4 text-[12px] text-neutral-500">
          {primaryLabel && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-neutral-900" /> {primaryLabel}
            </span>
          )}
          {secondaryLabel && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-neutral-300" /> {secondaryLabel}
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-neutral-400" style={{ height }}>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{format(Math.round(max * t))}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height: height - 20 }} role="img">
            {ticks.map((t) => (
              <line key={t} x1="0" x2="100" y1={(height - 20) * (1 - t)} y2={(height - 20) * (1 - t)} stroke="#e5e5e5" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
            ))}
            {data.map((d, i) => {
              const h = ((height - 20) * d.value) / max;
              const h2 = d.secondary != null ? ((height - 20) * d.secondary) / max : 0;
              const x = i * W;
              return (
                <g key={d.label}>
                  {d.secondary != null && (
                    <rect x={x + W * 0.15} width={W * 0.7} y={height - 20 - h2} height={h2} fill="#d4d4d4">
                      <title>{`${d.label} — ${secondaryLabel ?? ""} ${d.secondary}`}</title>
                    </rect>
                  )}
                  <rect x={x + W * 0.28} width={W * 0.44} y={height - 20 - h} height={h} fill="#171717" rx="0.4">
                    <title>{`${d.label} — ${format(d.value)}`}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div className="flex h-5 text-[10px] text-neutral-400">
            {data.map((d, i) => (
              <span key={d.label} className="truncate text-center" style={{ width: `${W}%` }}>
                {i % every === 0 ? shortLabel(d.label) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortLabel(l: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(l)) return `${l.slice(8, 10)}/${l.slice(5, 7)}`;
  if (/^\d{4}-\d{2}$/.test(l)) return `${l.slice(5, 7)}/${l.slice(2, 4)}`;
  return l;
}

/** Horizontal bars for rankings (top products, sizes, colours...). */
export function HBars({ rows, format = String, className }: { rows: { label: React.ReactNode; value: number; key: string }[]; format?: (n: number) => string; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-neutral-500">Aucune donnée sur la période.</p>;
  return (
    <ul className={cn("space-y-2.5", className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums text-neutral-600">{format(r.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100">
            <div className="h-1.5 rounded-full bg-neutral-800" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
