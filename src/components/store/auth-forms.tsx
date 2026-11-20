"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useStore } from "./store-provider";
import { Field, FormAlert, PasswordField } from "./form-field";
import { post, ApiError, errorMessage, resolveFieldErrors } from "@/lib/client-api";

function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function LoginForm({ next }: { next?: string }) {
  const { t } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await post<{ user: { isStaff: boolean } }>("/api/auth/login", {
        identifier: String(fd.get("identifier") ?? ""),
        password: String(fd.get("password") ?? ""),
        remember: fd.get("remember") === "on",
      });
      // full reload so every server component picks up the new session
      window.location.assign(safeNext(next, r.user.isStaff ? "/admin" : "/account"));
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(resolveFieldErrors(err.fields, t));
      setError(errorMessage(err, t));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormAlert message={error} />
      <Field name="identifier" label={t("auth.identifier")} autoComplete="username" required error={fields.identifier} />
      <PasswordField name="password" label={t("auth.password")} autoComplete="current-password" required showLabel={t("auth.showPassword")} error={fields.password} />
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="remember" className="h-4 w-4 accent-[rgb(var(--brand))]" /> {t("auth.remember")}
      </label>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.signingIn")}
          </>
        ) : (
          t("auth.signIn")
        )}
      </button>
      <p className="text-center text-[14px] text-ink-muted">
        {t("auth.noAccount")}{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
          {t("auth.createAccount")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { t } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(["fullName", "phone", "email", "password", "confirmPassword"].map((k) => [k, String(fd.get(k) ?? "")]));
    if (body.password !== body.confirmPassword) {
      setFields({ confirmPassword: t("err.passwordMismatch") });
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await post("/api/auth/register", body);
      window.location.assign(safeNext(next, "/account"));
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(resolveFieldErrors(err.fields, t));
      setError(errorMessage(err, t));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <FormAlert message={error} />
      <Field name="fullName" label={t("auth.fullName")} autoComplete="name" required error={fields.fullName} />
      <Field name="phone" type="tel" inputMode="tel" label={t("auth.phone")} autoComplete="tel" placeholder="98 123 456" hint={t("auth.phoneHint")} required error={fields.phone} />
      <Field name="email" type="email" label={t("auth.email")} autoComplete="email" required error={fields.email} />
      <PasswordField name="password" label={t("auth.password")} autoComplete="new-password" hint={t("auth.passwordHint")} required showLabel={t("auth.showPassword")} error={fields.password} />
      <PasswordField name="confirmPassword" label={t("auth.confirmPassword")} autoComplete="new-password" required showLabel={t("auth.showPassword")} error={fields.confirmPassword} />
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.creating")}
          </>
        ) : (
          t("auth.createAccount")
        )}
      </button>
      <p className="text-center text-[14px] text-ink-muted">
        {t("auth.haveAccount")}{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
