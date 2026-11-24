/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "node:crypto";
import { getSupabaseAdmin } from "./supabase";
import { DB_SCHEMA, type ModelMeta } from "./db-schema";
import type * as T from "./db-types";

/**
 * Pure Supabase (@supabase/supabase-js) database engine.
 * Zero Prisma runtime or binary dependencies.
 */

export const isSqlite = () => false;

export function icontains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function cuid(): string {
  return "c" + Date.now().toString(36) + crypto.randomBytes(8).toString("hex").slice(0, 16);
}

class DbError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

function mapPgError(err: { code?: string; message?: string; details?: string }): Error {
  if (err.code === "23505") {
    const targetMatch = err.details?.match(/\(([^)]+)\)/);
    return new DbError("P2002", err.message ?? "Unique constraint failed", {
      target: targetMatch ? targetMatch[1].split(",").map((s) => s.trim().replace(/"/g, "")) : [],
    });
  }
  if (err.code === "23503") return new DbError("P2003", err.message ?? "Foreign key constraint failed");
  return new Error(err.message ?? "Supabase database error");
}

function hydrateRow(meta: ModelMeta, row: Record<string, any>): Record<string, any> {
  const out = { ...row };
  for (const d of meta.dates) {
    if (out[d] != null && !(out[d] instanceof Date)) {
      const parsed = new Date(out[d]);
      if (!Number.isNaN(parsed.getTime())) out[d] = parsed;
    }
  }
  return out;
}

function serializeVal(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function expandUniqueWhere(meta: ModelMeta, where: Record<string, any> | undefined): Record<string, any> {
  if (!where) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (meta.uniques[k] && v && typeof v === "object" && !(v instanceof Date)) {
      for (const [ck, cv] of Object.entries(v)) out[ck] = cv;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return Boolean(v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date));
}

function compareScalar(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

function matchScalarFilter(val: unknown, cond: any): boolean {
  if (cond === undefined) return true;
  if (cond === null) return val === null || val === undefined;
  if (!isPlainObject(cond)) {
    if (val instanceof Date && cond instanceof Date) return val.getTime() === cond.getTime();
    if (val instanceof Date && typeof cond === "string") return val.getTime() === new Date(cond).getTime();
    return val === cond;
  }
  const insensitive = cond.mode === "insensitive";
  const norm = (x: unknown) => (insensitive && typeof x === "string" ? x.toLowerCase() : x);
  const nv = norm(val);

  if ("equals" in cond && !matchScalarFilter(val, cond.equals)) return false;
  if ("not" in cond) {
    if (cond.not === null) {
      if (val === null || val === undefined) return false;
    } else if (matchScalarFilter(val, cond.not)) {
      return false;
    }
  }
  if ("in" in cond) {
    const arr = (cond.in as unknown[]) ?? [];
    if (!arr.some((x) => norm(x) === nv)) return false;
  }
  if ("notIn" in cond) {
    const arr = (cond.notIn as unknown[]) ?? [];
    if (arr.some((x) => norm(x) === nv)) return false;
  }
  if ("lt" in cond && !(val != null && compareScalar(val, cond.lt) < 0)) return false;
  if ("lte" in cond && !(val != null && compareScalar(val, cond.lte) <= 0)) return false;
  if ("gt" in cond && !(val != null && compareScalar(val, cond.gt) > 0)) return false;
  if ("gte" in cond && !(val != null && compareScalar(val, cond.gte) >= 0)) return false;
  if ("contains" in cond) {
    if (typeof val !== "string") return false;
    if (!String(nv).includes(String(norm(cond.contains)))) return false;
  }
  if ("startsWith" in cond) {
    if (typeof val !== "string") return false;
    if (!String(nv).startsWith(String(norm(cond.startsWith)))) return false;
  }
  if ("endsWith" in cond) {
    if (typeof val !== "string") return false;
    if (!String(nv).endsWith(String(norm(cond.endsWith)))) return false;
  }
  return true;
}

/** Push simple top-level scalar filters down to PostgREST for speed. */
function applySimpleFilters(query: any, meta: ModelMeta, where: Record<string, any>) {
  let q = query;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined || k === "AND" || k === "OR" || k === "NOT" || !(k in meta.fields)) continue;
    if (v === null) {
      q = q.is(k, null);
    } else if (!isPlainObject(v)) {
      q = q.eq(k, serializeVal(v));
    } else {
      if ("equals" in v && v.equals !== undefined) q = v.equals === null ? q.is(k, null) : q.eq(k, serializeVal(v.equals));
      if ("in" in v && Array.isArray(v.in)) q = q.in(k, v.in.map(serializeVal));
      if ("gt" in v && v.gt !== undefined) q = q.gt(k, serializeVal(v.gt));
      if ("gte" in v && v.gte !== undefined) q = q.gte(k, serializeVal(v.gte));
      if ("lt" in v && v.lt !== undefined) q = q.lt(k, serializeVal(v.lt));
      if ("lte" in v && v.lte !== undefined) q = q.lte(k, serializeVal(v.lte));
      if ("not" in v && v.not === null) q = q.not(k, "is", null);
    }
  }
  return q;
}

async function fetchRawRows(meta: ModelMeta, where?: Record<string, any>): Promise<Record<string, any>[]> {
  const sb = getSupabaseAdmin();
  const expanded = expandUniqueWhere(meta, where);
  let q = sb.from(meta.table).select("*");
  q = applySimpleFilters(q, meta, expanded);
  const { data, error } = await q;
  if (error) throw mapPgError(error);
  const rows = (data ?? []).map((r: any) => hydrateRow(meta, r));
  if (!expanded || Object.keys(expanded).length === 0) return rows;
  return filterRows(meta, rows, expanded);
}

async function filterRows(meta: ModelMeta, rows: Record<string, any>[], where: Record<string, any>): Promise<Record<string, any>[]> {
  if (!rows.length) return [];
  const expanded = expandUniqueWhere(meta, where);
  const relCache = new Map<string, Record<string, any>[]>();

  const loadRelAll = async (relName: string) => {
    if (relCache.has(relName)) return relCache.get(relName)!;
    const rel = meta.relations[relName];
    const target = DB_SCHEMA[rel.target];
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from(target.table).select("*");
    if (error) throw mapPgError(error);
    const hydrated = (data ?? []).map((r: any) => hydrateRow(target, r));
    relCache.set(relName, hydrated);
    return hydrated;
  };

  const evalWhere = async (row: Record<string, any>, w: Record<string, any>): Promise<boolean> => {
    const ex = expandUniqueWhere(meta, w);
    for (const [k, v] of Object.entries(ex)) {
      if (v === undefined) continue;
      if (k === "AND") {
        const list = Array.isArray(v) ? v : [v];
        for (const sub of list) if (!(await evalWhere(row, sub))) return false;
      } else if (k === "OR") {
        const list = Array.isArray(v) ? v : [v];
        let anyOk = false;
        for (const sub of list) {
          if (await evalWhere(row, sub)) {
            anyOk = true;
            break;
          }
        }
        if (!anyOk) return false;
      } else if (k === "NOT") {
        const list = Array.isArray(v) ? v : [v];
        for (const sub of list) if (await evalWhere(row, sub)) return false;
      } else if (k in meta.fields) {
        if (!matchScalarFilter(row[k], v)) return false;
      } else if (k in meta.relations) {
        const rel = meta.relations[k];
        const target = DB_SCHEMA[rel.target];
        const allTarget = await loadRelAll(k);
        if (rel.fk) {
          const parentVal = row[rel.fk];
          const refKey = rel.ref || "id";
          const related = parentVal == null ? null : allTarget.find((t) => t[refKey] === parentVal) ?? null;
          if (v === null || v?.is === null) {
            if (related !== null) return false;
          } else if (v?.isNot === null) {
            if (related === null) return false;
          } else {
            if (!related) return false;
            const inner = "is" in v ? v.is : v;
            const ok = (await filterRows(target, [related], inner)).length > 0;
            if (!ok) return false;
          }
        } else {
          const invFk = rel.inverseFk!;
          const invRef = rel.inverseRef || "id";
          const children = allTarget.filter((t) => t[invFk] === row[invRef]);
          if (rel.isList) {
            if ("some" in v) {
              const matched = await filterRows(target, children, v.some);
              if (matched.length === 0) return false;
            }
            if ("every" in v) {
              const matched = await filterRows(target, children, v.every);
              if (matched.length !== children.length) return false;
            }
            if ("none" in v) {
              const matched = await filterRows(target, children, v.none);
              if (matched.length > 0) return false;
            }
          } else {
            const child = children[0] ?? null;
            if (v === null || v?.is === null) {
              if (child !== null) return false;
            } else if (!child) {
              return false;
            } else {
              const inner = "is" in v ? v.is : v;
              if ((await filterRows(target, [child], inner)).length === 0) return false;
            }
          }
        }
      }
    }
    return true;
  };

  const out: Record<string, any>[] = [];
  for (const row of rows) {
    if (await evalWhere(row, expanded)) out.push(row);
  }
  return out;
}

function sortRows(rows: Record<string, any>[], orderBy: any): Record<string, any>[] {
  if (!orderBy || rows.length <= 1) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      for (const [k, dir] of Object.entries(spec)) {
        if (dir === "asc" || dir === "desc") {
          const c = compareScalar(a[k], b[k]);
          if (c !== 0) return dir === "desc" ? -c : c;
        } else if (isPlainObject(dir)) {
          // nested relation orderBy (if already loaded)
          for (const [nk, ndir] of Object.entries(dir)) {
            const c = compareScalar(a[k]?.[nk], b[k]?.[nk]);
            if (c !== 0) return ndir === "desc" ? -c : c;
          }
        }
      }
    }
    return 0;
  });
}

async function applyIncludeAndSelect(
  meta: ModelMeta,
  rows: Record<string, any>[],
  include?: Record<string, any>,
  select?: Record<string, any>,
): Promise<Record<string, any>[]> {
  if (!rows.length) return [];
  const spec = select ?? include;
  if (!spec) return rows;

  const sb = getSupabaseAdmin();
  const result = rows.map((r) => ({ ...r }));

  // Handle _count
  if (spec._count) {
    const countSpec = spec._count === true ? {} : spec._count.select ?? spec._count;
    const relNames = Object.keys(countSpec).length ? Object.keys(countSpec) : Object.keys(meta.relations).filter((rn) => meta.relations[rn].isList);
    for (const r of result) r._count = {};
    for (const rn of relNames) {
      if (!countSpec[rn] && Object.keys(countSpec).length) continue;
      const rel = meta.relations[rn];
      if (!rel || !rel.inverseFk) continue;
      const target = DB_SCHEMA[rel.target];
      const invFk = rel.inverseFk;
      const invRef = rel.inverseRef || "id";
      const parentIds = [...new Set(result.map((r) => r[invRef]).filter((x) => x != null))];
      if (!parentIds.length) {
        for (const r of result) r._count[rn] = 0;
        continue;
      }
      const { data, error } = await sb.from(target.table).select(invFk).in(invFk, parentIds);
      if (error) throw mapPgError(error);
      const counts = new Map<any, number>();
      for (const child of data ?? []) {
        const pid = (child as any)[invFk];
        counts.set(pid, (counts.get(pid) ?? 0) + 1);
      }
      for (const r of result) r._count[rn] = counts.get(r[invRef]) ?? 0;
    }
  }

  // Handle relations
  for (const [k, v] of Object.entries(spec)) {
    if (!v || k === "_count" || !(k in meta.relations)) continue;
    const rel = meta.relations[k];
    const target = DB_SCHEMA[rel.target];
    const relOpts = isPlainObject(v) ? v : {};

    if (rel.fk) {
      const refKey = rel.ref || "id";
      const fkVals = [...new Set(result.map((r) => r[rel.fk!]).filter((x) => x != null))];
      let relatedRows: Record<string, any>[] = [];
      let refIds: any[] = [];
      if (fkVals.length) {
        const { data, error } = await sb.from(target.table).select("*").in(refKey, fkVals);
        if (error) throw mapPgError(error);
        relatedRows = (data ?? []).map((x: any) => hydrateRow(target, x));
        if (relOpts.where) relatedRows = await filterRows(target, relatedRows, relOpts.where);
        refIds = relatedRows.map((x) => x[refKey]);
        relatedRows = await applyIncludeAndSelect(target, relatedRows, relOpts.include, relOpts.select);
      }
      const byKey = new Map(relatedRows.map((x, idx) => [refIds[idx], x]));
      for (const r of result) {
        r[k] = r[rel.fk!] != null ? byKey.get(r[rel.fk!]) ?? null : null;
      }
    } else if (rel.inverseFk) {
      const invFk = rel.inverseFk;
      const invRef = rel.inverseRef || "id";
      const parentIds = [...new Set(result.map((r) => r[invRef]).filter((x) => x != null))];
      let childRows: Record<string, any>[] = [];
      let childPids: any[] = [];
      if (parentIds.length) {
        let q = sb.from(target.table).select("*").in(invFk, parentIds);
        if (relOpts.where) q = applySimpleFilters(q, target, expandUniqueWhere(target, relOpts.where));
        const { data, error } = await q;
        if (error) throw mapPgError(error);
        childRows = (data ?? []).map((x: any) => hydrateRow(target, x));
        if (relOpts.where) childRows = await filterRows(target, childRows, relOpts.where);
        if (relOpts.orderBy) childRows = sortRows(childRows, relOpts.orderBy);
        childPids = childRows.map((c) => c[invFk]);
        childRows = await applyIncludeAndSelect(target, childRows, relOpts.include, relOpts.select);
      }
      const grouped = new Map<any, Record<string, any>[]>();
      for (let idx = 0; idx < childRows.length; idx++) {
        const pid = childPids[idx];
        const arr = grouped.get(pid) ?? [];
        arr.push(childRows[idx]);
        grouped.set(pid, arr);
      }
      for (const r of result) {
        const list = grouped.get(r[invRef]) ?? [];
        r[k] = rel.isList ? (relOpts.take ? list.slice(0, relOpts.take) : list) : list[0] ?? null;
      }
    }
  }

  // If `select` was specified (not `include`), trim to requested keys
  if (select) {
    return result.map((r) => {
      const slim: Record<string, any> = {};
      for (const [k, v] of Object.entries(select)) {
        if (v) slim[k] = r[k];
      }
      return slim;
    });
  }
  return result;
}

function buildInsertPayload(meta: ModelMeta, data: Record<string, any>): { scalar: Record<string, any>; nested: [string, any][] } {
  const scalar: Record<string, any> = {};
  const nested: [string, any][] = [];
  const now = new Date();

  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (k in meta.fields) {
      scalar[k] = serializeVal(v);
    } else if (k in meta.relations) {
      const rel = meta.relations[k];
      if (rel.fk && v?.connect) {
        scalar[rel.fk] = v.connect[rel.ref || "id"];
      } else {
        nested.push([k, v]);
      }
    }
  }

  for (const [field, def] of Object.entries(meta.defaults)) {
    if (scalar[field] === undefined) {
      if (def === "CUID") scalar[field] = cuid();
      else if (def === "NOW" || def === "NOW_UPDATED") scalar[field] = now.toISOString();
      else scalar[field] = def;
    }
  }

  return { scalar, nested };
}

function createDelegate(meta: ModelMeta) {
  const sb = () => getSupabaseAdmin();

  const delegate: Record<string, any> = {
    async findMany(args: any = {}) {
      let rows = await fetchRawRows(meta, args.where);
      if (args.orderBy) {
        // Check if orderBy references a relation
        const specs = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        const needsRelSort = specs.some((s: any) => Object.values(s).some((v) => isPlainObject(v)));
        if (needsRelSort && args.include) {
          rows = await applyIncludeAndSelect(meta, rows, args.include, undefined);
          rows = sortRows(rows, args.orderBy);
          if (args.skip) rows = rows.slice(args.skip);
          if (args.take != null) rows = rows.slice(0, args.take);
          return args.select ? applyIncludeAndSelect(meta, rows, undefined, args.select) : rows;
        }
        rows = sortRows(rows, args.orderBy);
      }
      if (args.distinct) {
        const keys = Array.isArray(args.distinct) ? args.distinct : [args.distinct];
        const seen = new Set<string>();
        rows = rows.filter((r) => {
          const sig = keys.map((k: string) => String(r[k])).join("\0");
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        });
      }
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take != null) rows = rows.slice(0, args.take);
      return applyIncludeAndSelect(meta, rows, args.include, args.select);
    },

    async findFirst(args: any = {}) {
      const rows = await delegate.findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },

    async findFirstOrThrow(args: any = {}) {
      const row = await delegate.findFirst(args);
      if (!row) throw new DbError("P2025", `${meta.table} not found`);
      return row;
    },

    async findUnique(args: any) {
      const rows = await delegate.findMany({ where: args.where, include: args.include, select: args.select, take: 1 });
      return rows[0] ?? null;
    },

    async findUniqueOrThrow(args: any) {
      const row = await delegate.findUnique(args);
      if (!row) throw new DbError("P2025", `${meta.table} not found`);
      return row;
    },

    async count(args: any = {}) {
      const rows = await fetchRawRows(meta, args.where);
      return rows.length;
    },

    async aggregate(args: any = {}) {
      const rows = await fetchRawRows(meta, args.where);
      const out: Record<string, any> = {};
      if (args._count === true) out._count = rows.length;
      else if (isPlainObject(args._count)) {
        out._count = {};
        for (const k of Object.keys(args._count)) out._count[k] = k === "_all" ? rows.length : rows.filter((r) => r[k] != null).length;
      }
      for (const agg of ["_sum", "_avg", "_min", "_max"] as const) {
        if (!isPlainObject(args[agg])) continue;
        out[agg] = {};
        for (const k of Object.keys(args[agg])) {
          const vals = rows.map((r) => r[k]).filter((v) => v != null);
          if (!vals.length) {
            out[agg][k] = null;
          } else if (agg === "_sum") {
            out[agg][k] = vals.reduce((s, v) => s + Number(v), 0);
          } else if (agg === "_avg") {
            out[agg][k] = vals.reduce((s, v) => s + Number(v), 0) / vals.length;
          } else if (agg === "_min") {
            out[agg][k] = vals.reduce((m, v) => (compareScalar(v, m) < 0 ? v : m), vals[0]);
          } else if (agg === "_max") {
            out[agg][k] = vals.reduce((m, v) => (compareScalar(v, m) > 0 ? v : m), vals[0]);
          }
        }
      }
      return out;
    },

    async groupBy(args: any) {
      const rows = await fetchRawRows(meta, args.where);
      const by: string[] = Array.isArray(args.by) ? args.by : [args.by];
      const groups = new Map<string, Record<string, any>[]>();
      for (const r of rows) {
        const key = by.map((k) => String(r[k] ?? "")).join("\0");
        const arr = groups.get(key) ?? [];
        arr.push(r);
        groups.set(key, arr);
      }
      const res: Record<string, any>[] = [];
      for (const list of groups.values()) {
        const entry: Record<string, any> = {};
        for (const k of by) entry[k] = list[0][k];
        if (args._count === true) entry._count = list.length;
        else if (isPlainObject(args._count)) {
          entry._count = {};
          for (const k of Object.keys(args._count)) entry._count[k] = k === "_all" ? list.length : list.filter((r) => r[k] != null).length;
        }
        for (const agg of ["_sum", "_avg", "_min", "_max"] as const) {
          if (!isPlainObject(args[agg])) continue;
          entry[agg] = {};
          for (const k of Object.keys(args[agg])) {
            const vals = list.map((r) => r[k]).filter((v) => v != null);
            if (!vals.length) entry[agg][k] = null;
            else if (agg === "_sum") entry[agg][k] = vals.reduce((s, v) => s + Number(v), 0);
            else if (agg === "_avg") entry[agg][k] = vals.reduce((s, v) => s + Number(v), 0) / vals.length;
            else if (agg === "_min") entry[agg][k] = vals.reduce((m, v) => (compareScalar(v, m) < 0 ? v : m), vals[0]);
            else if (agg === "_max") entry[agg][k] = vals.reduce((m, v) => (compareScalar(v, m) > 0 ? v : m), vals[0]);
          }
        }
        res.push(entry);
      }
      return args.orderBy ? sortRows(res, args.orderBy) : res;
    },

    async create(args: any) {
      const { scalar, nested } = buildInsertPayload(meta, args.data ?? {});
      const { data, error } = await sb().from(meta.table).insert(scalar).select("*").single();
      if (error) throw mapPgError(error);
      const created = hydrateRow(meta, data);

      for (const [relName, relOp] of nested) {
        const rel = meta.relations[relName];
        if (!rel?.inverseFk) continue;
        const targetMeta = DB_SCHEMA[rel.target];
        const targetDelegate = createDelegate(targetMeta);
        const parentId = created[rel.inverseRef || "id"];
        if (relOp?.create) {
          const list = Array.isArray(relOp.create) ? relOp.create : [relOp.create];
          for (const item of list) {
            await targetDelegate.create({ data: { ...item, [rel.inverseFk]: parentId } });
          }
        }
      }

      if (args.include || args.select) {
        const [hydrated] = await applyIncludeAndSelect(meta, [created], args.include, args.select);
        return hydrated;
      }
      return created;
    },

    async createMany(args: any) {
      const list = Array.isArray(args.data) ? args.data : [args.data];
      if (!list.length) return { count: 0 };
      const payloads = list.map((item: any) => buildInsertPayload(meta, item).scalar);
      const { data, error } = await sb().from(meta.table).insert(payloads).select("*");
      if (error) throw mapPgError(error);
      return { count: (data ?? []).length };
    },

    async update(args: any) {
      const existing = await delegate.findUnique({ where: args.where });
      if (!existing) throw new DbError("P2025", `${meta.table} not found`);

      const patch: Record<string, any> = {};
      const nested: [string, any][] = [];
      for (const [k, v] of Object.entries(args.data ?? {})) {
        if (v === undefined) continue;
        if (k in meta.fields) {
          if (isPlainObject(v) && ("increment" in v || "decrement" in v || "set" in v)) {
            if ("increment" in v) patch[k] = Number(existing[k] ?? 0) + Number(v.increment);
            else if ("decrement" in v) patch[k] = Number(existing[k] ?? 0) - Number(v.decrement);
            else if ("set" in v) patch[k] = serializeVal(v.set);
          } else {
            patch[k] = serializeVal(v);
          }
        } else if (k in meta.relations) {
          const rel = meta.relations[k];
          if (rel.fk && isPlainObject(v)) {
            if ("connect" in v) patch[rel.fk] = v.connect[rel.ref || "id"];
            else if ("disconnect" in v) patch[rel.fk] = null;
          } else {
            nested.push([k, v]);
          }
        }
      }
      if (meta.defaults.updatedAt === "NOW_UPDATED" && patch.updatedAt === undefined) {
        patch.updatedAt = new Date().toISOString();
      }

      let updated = existing;
      if (Object.keys(patch).length) {
        let q = sb().from(meta.table).update(patch);
        for (const pkCol of meta.pk) q = q.eq(pkCol, serializeVal(existing[pkCol]));
        const { data, error } = await q.select("*").single();
        if (error) throw mapPgError(error);
        updated = hydrateRow(meta, data);
      }

      for (const [relName, relOp] of nested) {
        const rel = meta.relations[relName];
        if (!rel?.inverseFk) continue;
        const targetMeta = DB_SCHEMA[rel.target];
        const targetDelegate = createDelegate(targetMeta);
        const parentId = updated[rel.inverseRef || "id"];
        if (relOp?.deleteMany !== undefined) {
          await targetDelegate.deleteMany({ where: { ...(isPlainObject(relOp.deleteMany) ? relOp.deleteMany : {}), [rel.inverseFk]: parentId } });
        }
        if (relOp?.create) {
          const list = Array.isArray(relOp.create) ? relOp.create : [relOp.create];
          for (const item of list) {
            await targetDelegate.create({ data: { ...item, [rel.inverseFk]: parentId } });
          }
        }
      }

      if (args.include || args.select) {
        const [hydrated] = await applyIncludeAndSelect(meta, [updated], args.include, args.select);
        return hydrated;
      }
      return updated;
    },

    async updateMany(args: any) {
      const targets = await fetchRawRows(meta, args.where);
      if (!targets.length) return { count: 0 };
      let count = 0;
      for (const row of targets) {
        const patch: Record<string, any> = {};
        for (const [k, v] of Object.entries(args.data ?? {})) {
          if (v === undefined || !(k in meta.fields)) continue;
          if (isPlainObject(v) && ("increment" in v || "decrement" in v || "set" in v)) {
            if ("increment" in v) patch[k] = Number(row[k] ?? 0) + Number(v.increment);
            else if ("decrement" in v) patch[k] = Number(row[k] ?? 0) - Number(v.decrement);
            else if ("set" in v) patch[k] = serializeVal(v.set);
          } else {
            patch[k] = serializeVal(v);
          }
        }
        if (meta.defaults.updatedAt === "NOW_UPDATED" && patch.updatedAt === undefined) {
          patch.updatedAt = new Date().toISOString();
        }
        let q = sb().from(meta.table).update(patch);
        for (const pkCol of meta.pk) q = q.eq(pkCol, serializeVal(row[pkCol]));
        // Preserve optimistic concurrency checks if simple scalar equality was passed in where
        const ex = expandUniqueWhere(meta, args.where);
        for (const [wk, wv] of Object.entries(ex)) {
          if (wk in meta.fields && !meta.pk.includes(wk) && !isPlainObject(wv) && wv !== undefined) {
            q = wv === null ? q.is(wk, null) : q.eq(wk, serializeVal(wv));
          }
        }
        const { data, error } = await q.select("*");
        if (error) throw mapPgError(error);
        count += (data ?? []).length;
      }
      return { count };
    },

    async upsert(args: any) {
      const existing = await delegate.findUnique({ where: args.where });
      if (existing) {
        return delegate.update({ where: args.where, data: args.update, include: args.include, select: args.select });
      }
      return delegate.create({ data: args.create, include: args.include, select: args.select });
    },

    async delete(args: any) {
      const existing = await delegate.findUnique({ where: args.where, include: args.include, select: args.select });
      if (!existing) throw new DbError("P2025", `${meta.table} not found`);
      let q = sb().from(meta.table).delete();
      const rawExisting = await delegate.findUnique({ where: args.where });
      for (const pkCol of meta.pk) q = q.eq(pkCol, serializeVal(rawExisting[pkCol]));
      const { error } = await q;
      if (error) throw mapPgError(error);
      return existing;
    },

    async deleteMany(args: any = {}) {
      const targets = await fetchRawRows(meta, args.where);
      if (!targets.length) return { count: 0 };
      if (meta.pk.length === 1) {
        const pkCol = meta.pk[0];
        const ids = targets.map((r) => r[pkCol]);
        const { error } = await sb().from(meta.table).delete().in(pkCol, ids);
        if (error) throw mapPgError(error);
        return { count: ids.length };
      }
      let count = 0;
      for (const row of targets) {
        let q = sb().from(meta.table).delete();
        for (const pkCol of meta.pk) q = q.eq(pkCol, serializeVal(row[pkCol]));
        const { error } = await q;
        if (error) throw mapPgError(error);
        count++;
      }
      return { count };
    },
  };

  return delegate;
}

function buildClient() {
  const client: Record<string, any> = {
    async $transaction(fnOrOps: any) {
      if (typeof fnOrOps === "function") {
        return fnOrOps(client);
      }
      if (Array.isArray(fnOrOps)) {
        const results = [];
        for (const op of fnOrOps) results.push(await op);
        return results;
      }
      throw new Error("Unsupported $transaction argument");
    },
    async $disconnect() {
      return;
    },
  };

  for (const [modelName, meta] of Object.entries(DB_SCHEMA)) {
    const delegateName = modelName[0].toLowerCase() + modelName.slice(1);
    client[delegateName] = createDelegate(meta);
  }
  return client;
}

export type ModelDelegate<R = any> = {
  findMany: (args?: any) => Promise<R[]>;
  findFirst: (args?: any) => Promise<R | null>;
  findFirstOrThrow: (args?: any) => Promise<R>;
  findUnique: (args: any) => Promise<R | null>;
  findUniqueOrThrow: (args: any) => Promise<R>;
  count: (args?: any) => Promise<number>;
  aggregate: (args?: any) => Promise<any>;
  groupBy: (args: any) => Promise<any[]>;
  create: (args: any) => Promise<R>;
  createMany: (args: any) => Promise<{ count: number }>;
  update: (args: any) => Promise<R>;
  updateMany: (args: any) => Promise<{ count: number }>;
  upsert: (args: any) => Promise<R>;
  delete: (args: any) => Promise<R>;
  deleteMany: (args?: any) => Promise<{ count: number }>;
};

export type DbClient = {
  $transaction: {
    <R>(fn: (tx: DbClient) => Promise<R>, options?: any): Promise<R>;
    <R extends readonly Promise<any>[]>(ops: R): Promise<{ [K in keyof R]: Awaited<R[K]> }>;
  };
  $disconnect: () => Promise<void>;
  user: ModelDelegate<T.UserRecord>;
  customerProfile: ModelDelegate<T.CustomerProfileRecord>;
  session: ModelDelegate<T.SessionRecord>;
  category: ModelDelegate<T.CategoryRecord>;
  subcategory: ModelDelegate<T.SubcategoryRecord>;
  brand: ModelDelegate<T.BrandRecord>;
  collection: ModelDelegate<T.CollectionRecord>;
  material: ModelDelegate<T.MaterialRecord>;
  color: ModelDelegate<T.ColorRecord>;
  size: ModelDelegate<T.SizeRecord>;
  sizeChart: ModelDelegate<T.SizeChartRecord>;
  product: ModelDelegate<T.ProductRecord>;
  productTranslation: ModelDelegate<T.ProductTranslationRecord>;
  productMaterial: ModelDelegate<T.ProductMaterialRecord>;
  productImage: ModelDelegate<T.ProductImageRecord>;
  productVariant: ModelDelegate<T.ProductVariantRecord>;
  cart: ModelDelegate<T.CartRecord>;
  cartItem: ModelDelegate<T.CartItemRecord>;
  wishlistItem: ModelDelegate<T.WishlistItemRecord>;
  review: ModelDelegate<T.ReviewRecord>;
  reviewPhoto: ModelDelegate<T.ReviewPhotoRecord>;
  notification: ModelDelegate<T.NotificationRecord>;
  order: ModelDelegate<T.OrderRecord>;
  orderItem: ModelDelegate<T.OrderItemRecord>;
  orderStatusHistory: ModelDelegate<T.OrderStatusHistoryRecord>;
  orderNote: ModelDelegate<T.OrderNoteRecord>;
  returnRequest: ModelDelegate<T.ReturnRequestRecord>;
  returnItem: ModelDelegate<T.ReturnItemRecord>;
  promotion: ModelDelegate<T.PromotionRecord>;
  promotionProduct: ModelDelegate<T.PromotionProductRecord>;
  promotionCategory: ModelDelegate<T.PromotionCategoryRecord>;
  promotionSubcategory: ModelDelegate<T.PromotionSubcategoryRecord>;
  coupon: ModelDelegate<T.CouponRecord>;
  couponProduct: ModelDelegate<T.CouponProductRecord>;
  couponCategory: ModelDelegate<T.CouponCategoryRecord>;
  couponRedemption: ModelDelegate<T.CouponRedemptionRecord>;
  deliveryRegion: ModelDelegate<T.DeliveryRegionRecord>;
  setting: ModelDelegate<T.SettingRecord>;
  homeSection: ModelDelegate<T.HomeSectionRecord>;
  banner: ModelDelegate<T.BannerRecord>;
  contentPage: ModelDelegate<T.ContentPageRecord>;
  contactMessage: ModelDelegate<T.ContactMessageRecord>;
  stockMovement: ModelDelegate<T.StockMovementRecord>;
  auditLog: ModelDelegate<T.AuditLogRecord>;
  [key: string]: any;
};

export const prisma: DbClient = buildClient() as DbClient;
export type Tx = DbClient;

/** Minimal compatibility namespace for filter type annotations (zero Prisma dependency). */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Prisma {
  export type ProductWhereInput = Record<string, any>;
  export type ProductOrderByWithRelationInput = Record<string, any>;
  export type ProductSelect = Record<string, any>;
  export type ProductGetPayload<_T = any> = T.ProductRecord;
  export type OrderWhereInput = Record<string, any>;
  export type OrderUpdateManyMutationInput = Record<string, any>;
  export type UserWhereInput = Record<string, any>;
  export type ReturnRequestWhereInput = Record<string, any>;
  export type AuditLogWhereInput = Record<string, any>;
  export type ReviewWhereInput = Record<string, any>;
  export type ContactMessageWhereInput = Record<string, any>;
  export type StockMovementWhereInput = Record<string, any>;
  export type ProductVariantWhereInput = Record<string, any>;
  export type CustomerProfileWhereInput = Record<string, any>;
}
