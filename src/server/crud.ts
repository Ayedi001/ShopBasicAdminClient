import type { ZodTypeAny, z } from "zod";
import type { NextRequest } from "next/server";
import { api, parseBody, type RouteCtx } from "./http";
import { requireStaff, type SessionUser } from "./auth/session";
import { prisma } from "./db";
import { audit } from "./audit";
import type { Permission } from "@/lib/constants";

type Delegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  create: (args: { data: unknown }) => Promise<{ id: string }>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<{ id: string }>;
};

type Options<S extends ZodTypeAny> = {
  model: "color" | "size" | "material" | "collection" | "sizeChart" | "deliveryRegion" | "banner" | "category" | "subcategory";
  entity: string;
  permission: Permission;
  schema: S;
  orderBy?: unknown;
  include?: unknown;
  /** Transform validated input into Prisma data (slug generation, JSON serialisation...) */
  toData?: (input: z.output<S>, id?: string) => Promise<Record<string, unknown>> | Record<string, unknown>;
  afterChange?: (id: string, user: SessionUser) => Promise<void>;
  beforeDelete?: (id: string) => Promise<void>;
};

/** Generic admin CRUD route handlers with permission checks, validation and audit logging. */
export function crud<S extends ZodTypeAny>(o: Options<S>) {
  const delegate = () => (prisma as unknown as Record<string, Delegate>)[o.model];
  return {
    list: api(async () => {
      await requireStaff(o.permission);
      return { items: await delegate().findMany({ orderBy: o.orderBy, include: o.include }) };
    }),
    create: api(async (req: NextRequest) => {
      const user = await requireStaff(o.permission);
      const input = await parseBody(req, o.schema);
      const data = o.toData ? await o.toData(input) : input;
      const created = await delegate().create({ data });
      await audit(user, `${o.entity}.create`, o.entity, created.id, data as Record<string, unknown>);
      await o.afterChange?.(created.id, user);
      return { ok: true, item: created };
    }),
    update: api<{ id: string }>(async (req: NextRequest, ctx: RouteCtx<{ id: string }>) => {
      const user = await requireStaff(o.permission);
      const { id } = await ctx.params;
      const input = await parseBody(req, o.schema);
      const data = o.toData ? await o.toData(input, id) : input;
      const updated = await delegate().update({ where: { id }, data });
      await audit(user, `${o.entity}.update`, o.entity, id, data as Record<string, unknown>);
      await o.afterChange?.(id, user);
      return { ok: true, item: updated };
    }),
    remove: api<{ id: string }>(async (_req: NextRequest, ctx: RouteCtx<{ id: string }>) => {
      const user = await requireStaff(o.permission);
      const { id } = await ctx.params;
      await o.beforeDelete?.(id);
      await delegate().delete({ where: { id } });
      await audit(user, `${o.entity}.delete`, o.entity, id);
      return { ok: true };
    }),
  };
}
