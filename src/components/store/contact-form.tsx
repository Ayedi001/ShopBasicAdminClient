"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "./store-provider";
import { Field, FormAlert, TextArea } from "./form-field";
import { post, ApiError, errorMessage, resolveFieldErrors } from "@/lib/client-api";

export function ContactForm() {
  const { t, user } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    setBusy(true);
    setMsg(null);
    setFields({});
    try {
      await post("/api/contact", Object.fromEntries(["name", "email", "phone", "subject", "message"].map((k) => [k, String(fd.get(k) ?? "")])));
      setMsg({ text: t("pages.contactSent"), tone: "success" });
      formEl.reset();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFields(resolveFieldErrors(err.fields, t));
      setMsg({ text: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormAlert message={msg?.text ?? null} tone={msg?.tone} />
      <Field name="name" label={t("pages.name")} defaultValue={user?.fullName} required error={fields.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" type="email" label={t("auth.email")} defaultValue={user?.email} error={fields.email} />
        <Field name="phone" type="tel" label={t("auth.phone")} error={fields.phone} />
      </div>
      <Field name="subject" label={t("pages.subject")} required error={fields.subject} />
      <TextArea name="message" label={t("pages.message")} rows={5} required maxLength={3000} error={fields.message} />
      <button className="btn-primary" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.send")}
      </button>
    </form>
  );
}
