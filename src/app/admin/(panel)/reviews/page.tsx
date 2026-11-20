import Link from "next/link";
import { adminPage } from "@/server/admin-guard";
import { prisma, icontains } from "@/server/db";
import { REVIEW_STATUSES } from "@/lib/constants";
import { Badge, Card, Empty, PageHeader, Pagination, fdatetime } from "@/components/admin/parts";
import { REVIEW_STATUS_LABELS } from "@/components/admin/labels";
import { ReviewActions } from "@/components/admin/review-actions";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await adminPage("reviews.manage");
  const sp = await searchParams;
  const status = (REVIEW_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [{ body: icontains(q) }, { title: icontains(q) }, { product: { name: icontains(q) } }, { user: { fullName: icontains(q) } }],
        }
      : {}),
  };
  const [reviews, total, counts] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { product: { select: { id: true, name: true, slug: true } }, user: { select: { fullName: true, email: true } }, photos: true },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader title="Avis clients" description="Seuls les avis d'acheteurs vérifiés peuvent être soumis. Approuvez-les avant publication si la modération est activée." />
      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {[undefined, ...REVIEW_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/reviews?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/admin/reviews${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px]", status === s ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}
          >
            {s ? REVIEW_STATUS_LABELS[s] : "Tous"}
            <span className="rounded-full bg-neutral-200 px-1.5 text-[11px]">{s ? count(s) : counts.reduce((a, c) => a + c._count, 0)}</span>
          </Link>
        ))}
      </div>
      <Card bodyClass="p-0">
        <form className="flex flex-wrap items-end gap-2 border-b border-neutral-100 p-3" action="/admin/reviews">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="min-w-[220px] flex-1">
            <span className="a-label">Recherche</span>
            <input name="q" defaultValue={sp.q} className="a-input" placeholder="Produit, client, texte…" />
          </label>
          <button className="a-btn-primary">Rechercher</button>
        </form>
        {reviews.length ? (
          <ul className="divide-y divide-neutral-100">
            {reviews.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/p/${r.product.slug}`} className="font-medium hover:underline" target="_blank">
                        {r.product.name}
                      </Link>
                      <Badge status={r.status}>{REVIEW_STATUS_LABELS[r.status]}</Badge>
                      {r.isVerifiedPurchase && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Achat vérifié</span>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-neutral-500">
                      {r.user.fullName} · {r.user.email} · {fdatetime(r.createdAt)}
                    </p>
                    <p className="mt-1 text-[13px] text-amber-600">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                    {r.title && <p className="mt-1 text-[13px] font-medium">{r.title}</p>}
                    <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-neutral-700">{r.body}</p>
                    {r.adminReply && (
                      <p className="mt-2 rounded-md bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600">
                        <span className="font-semibold">Réponse boutique :</span> {r.adminReply}
                      </p>
                    )}
                    {r.photos.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {r.photos.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p.id} src={p.thumbUrl || p.url} alt="" className="h-14 w-14 rounded object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                  <ReviewActions id={r.id} status={r.status} adminReply={r.adminReply} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucun avis.</Empty>
        )}
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} base="/admin/reviews" params={{ status: sp.status, q: sp.q }} />
      </Card>
    </>
  );
}
