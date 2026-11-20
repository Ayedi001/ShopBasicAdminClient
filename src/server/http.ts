import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, badRequest, forbidden } from "./errors";
import { fieldErrors } from "@/lib/validation";
import { logger } from "./logger";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF protection: session cookies are SameSite=Lax and every state-changing
 * request must come from our own origin. Browsers always send Origin on
 * cross-site POST/PUT/PATCH/DELETE, so a mismatching Origin is rejected.
 */
function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw forbidden("Requête cross-site refusée");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Origine invalide");
  }
  const allowed = new Set<string>([host ?? ""]);
  if (process.env.APP_URL) {
    try {
      allowed.add(new URL(process.env.APP_URL).host);
    } catch {
      /* ignore */
    }
  }
  if (!allowed.has(originHost)) throw forbidden("Origine non autorisée");
}

export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, fields: e.fields, data: e.data } },
      { status: e.status },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Données invalides", fields: fieldErrors(e) } },
      { status: 400 },
    );
  }
  const code = (e as { code?: string })?.code;
  if (code === "P2002") {
    return NextResponse.json({ error: { code: "DUPLICATE", message: "Cette valeur existe déjà (doublon)." } }, { status: 409 });
  }
  if (code === "P2003" || code === "P2014") {
    return NextResponse.json(
      { error: { code: "IN_USE", message: "Impossible : cet élément est encore utilisé par d'autres données." } },
      { status: 409 },
    );
  }
  if (code === "P2025") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Ressource introuvable" } }, { status: 404 });
  }
  logger.error("Unhandled API error", { error: e });
  return NextResponse.json({ error: { code: "INTERNAL", message: "Une erreur inattendue est survenue." } }, { status: 500 });
}

export type RouteCtx<P = Record<string, string>> = { params: Promise<P> };

export function api<P = Record<string, string>>(fn: (req: NextRequest, ctx: RouteCtx<P>) => Promise<unknown>) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      if (!SAFE_METHODS.has(req.method)) checkOrigin(req);
      const result = await fn(req, ctx);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw badRequest("INVALID_JSON", "Corps de requête invalide");
  }
  return schema.parse(json);
}

export function searchParams(req: NextRequest) {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

export function intParam(v: string | null | undefined, def: number, min = 1, max = 1000) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
