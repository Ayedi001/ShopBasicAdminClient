"use client";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

/** JSON fetch helper for our own API. Throws ApiError with the server message/field errors. */
export async function apiFetch<T = unknown>(url: string, opts: Options = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      credentials: "same-origin",
      headers: { ...(isForm || opts.body === undefined ? {} : { "Content-Type": "application/json" }), ...(opts.headers ?? {}) },
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "err.network");
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; fields?: Record<string, string>; data?: Record<string, unknown> } })?.error;
    throw new ApiError(res.status, err?.code ?? "HTTP_" + res.status, err?.message ?? "err.generic", err?.fields, err?.data);
  }
  return json as T;
}

export const post = <T = unknown>(url: string, body?: unknown) => apiFetch<T>(url, { method: "POST", body: body ?? {} });
export const put = <T = unknown>(url: string, body?: unknown) => apiFetch<T>(url, { method: "PUT", body: body ?? {} });
export const patch = <T = unknown>(url: string, body?: unknown) => apiFetch<T>(url, { method: "PATCH", body: body ?? {} });
export const del = <T = unknown>(url: string) => apiFetch<T>(url, { method: "DELETE" });

/** Translate field errors that are translation keys ("err.phone") and keep plain messages. */
export function resolveFieldErrors(fields: Record<string, string> | undefined, t: (k: string) => string) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields ?? {})) out[k] = v.startsWith("err.") ? t(v) : v;
  return out;
}

export function errorMessage(e: unknown, t: (k: string) => string) {
  if (e instanceof ApiError) return e.message.startsWith("err.") ? t(e.message) : e.message;
  return t("err.generic");
}
