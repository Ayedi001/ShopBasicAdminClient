"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "./store-provider";
import { Field, FormAlert, PasswordField, TextArea } from "./form-field";
import { put, post, ApiError, errorMessage, resolveFieldErrors } from "@/lib/client-api";

type Profile = { fullName: string; phone: string; email: string; address: string; city: string; regionId: string; postalCode: string; deliveryInstructions: string };

export function ProfileForm({ initial, regions }: { initial: Profile; regions: { id: string; name: string; nameAr: string | null }[] }) {
  const { t, locale, refreshMe } = useStore();
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setFields({});
    try {
      await put("/api/account/profile", { ...form, regionId: form.regionId || null, postalCode: form.postalCode || null });
      setMsg({ text: t("account.saved"), tone: "success" });
      await refreshMe();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(resolveFieldErrors(err.fields, t));
      setMsg({ text: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.personalInfo")}</h2>
      <FormAlert message={msg?.text ?? null} tone={msg?.tone} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="fullName" label={t("auth.fullName")} value={form.fullName} onChange={set("fullName")} required error={fields.fullName} />
        <Field name="phone" type="tel" label={t("auth.phone")} value={form.phone} onChange={set("phone")} required error={fields.phone} />
        <Field name="email" type="email" className="sm:col-span-2" label={t("auth.email")} value={form.email} onChange={set("email")} required error={fields.email} />
      </div>
      <h2 className="pt-4 text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.deliveryAddress")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="address" className="sm:col-span-2" label={t("checkout.address")} value={form.address} onChange={set("address")} error={fields.address} />
        <Field name="city" label={t("checkout.city")} value={form.city} onChange={set("city")} error={fields.city} />
        <div>
          <label htmlFor="f-region" className="label">
            {t("checkout.region")}
          </label>
          <select id="f-region" value={form.regionId} onChange={set("regionId")} className="input">
            <option value="">{t("checkout.selectRegion")}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {locale === "ar" && r.nameAr ? r.nameAr : r.name}
              </option>
            ))}
          </select>
        </div>
        <Field name="postalCode" label={t("checkout.postalCode")} value={form.postalCode} onChange={set("postalCode")} maxLength={10} />
        <TextArea name="deliveryInstructions" className="sm:col-span-2" rows={2} label={t("checkout.instructions")} value={form.deliveryInstructions} onChange={set("deliveryInstructions")} maxLength={500} />
      </div>
      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const body = { currentPassword: String(fd.get("currentPassword")), newPassword: String(fd.get("newPassword")), confirmPassword: String(fd.get("confirmPassword")) };
    if (body.newPassword !== body.confirmPassword) {
      setFields({ confirmPassword: t("err.passwordMismatch") });
      return;
    }
    setBusy(true);
    setMsg(null);
    setFields({});
    try {
      await post("/api/account/password", body);
      setMsg({ text: t("account.passwordChanged"), tone: "success" });
      formEl.reset();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(resolveFieldErrors(err.fields, t));
      setMsg({ text: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <h2 className="text-[13px] font-medium uppercase tracking-[0.14em]">{t("account.changePassword")}</h2>
      <FormAlert message={msg?.text ?? null} tone={msg?.tone} />
      <PasswordField name="currentPassword" label={t("account.currentPassword")} autoComplete="current-password" showLabel={t("auth.showPassword")} error={fields.currentPassword} required />
      <PasswordField name="newPassword" label={t("account.newPassword")} autoComplete="new-password" hint={t("auth.passwordHint")} showLabel={t("auth.showPassword")} error={fields.newPassword} required />
      <PasswordField name="confirmPassword" label={t("auth.confirmPassword")} autoComplete="new-password" showLabel={t("auth.showPassword")} error={fields.confirmPassword} required />
      <button className="btn-outline" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("account.changePassword")}
      </button>
    </form>
  );
}
