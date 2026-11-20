"use client";

import { useState } from "react";
import { ApiError, post, resolveFieldErrors } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { tFr } from "./labels";
import { Spinner } from "./ui";

export function AdminLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const r = await post<{ user: { isStaff: boolean } }>("/api/auth/login", { identifier, password, remember });
      if (!r.user.isStaff) {
        await post("/api/auth/logout").catch(() => undefined);
        setError("Ce compte n'a pas accès à l'administration.");
        return;
      }
      window.location.assign("/admin");
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(resolveFieldErrors(err.fields, tFr));
        setError(err.message.startsWith("err.") ? tFr(err.message) : err.message);
      } else setError(tFr("err.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">{error}</p>}
      <label className="block">
        <span className="a-label">E-mail ou téléphone</span>
        <input className={cn("a-input", fields.identifier && "a-input-error")} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus />
        {fields.identifier && <span className="mt-1 block text-[12px] text-red-600">{fields.identifier}</span>}
      </label>
      <label className="block">
        <span className="a-label">Mot de passe</span>
        <input type="password" className={cn("a-input", fields.password && "a-input-error")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {fields.password && <span className="mt-1 block text-[12px] text-red-600">{fields.password}</span>}
      </label>
      <label className="flex items-center gap-2 text-[13px] text-neutral-700">
        <input type="checkbox" className="h-4 w-4 accent-neutral-900" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Rester connecté sur cet appareil
      </label>
      <button type="submit" className="a-btn-primary w-full py-2" disabled={busy}>
        {busy && <Spinner />} Se connecter
      </button>
    </form>
  );
}
