"use client";

import { useState } from "react";
import { put } from "@/lib/client-api";
import type { GeneralSettings, StoreSettings } from "@/server/settings";
import { LOCALES } from "@/lib/constants";
import { LOCALE_LABELS_FR } from "./labels";
import { ImageField } from "./image-field";
import { Card } from "./parts";
import { Select, Spinner, TextArea, TextInput, Toggle, useAction } from "./ui";
import { cn } from "@/lib/utils";

type Tab = "store" | "general";

export function SettingsForm({ store: storeInit, general: generalInit }: { store: StoreSettings; general: GeneralSettings }) {
  const [tab, setTab] = useState<Tab>("store");
  const [store, setStore] = useState(storeInit);
  const [general, setGeneral] = useState(generalInit);
  const { run, busy, errors } = useAction();

  const setS = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setStore((x) => ({ ...x, [k]: v }));
  const setG = <K extends keyof GeneralSettings>(k: K, v: GeneralSettings[K]) => setGeneral((x) => ({ ...x, [k]: v }));
  const setSocial = (k: keyof StoreSettings["social"], v: string) => setStore((x) => ({ ...x, social: { ...x.social, [k]: v } }));

  const toggleLocale = (loc: (typeof LOCALES)[number]) => {
    const enabled = general.enabledLocales.includes(loc);
    if (enabled && general.enabledLocales.length === 1) return;
    const next = enabled ? general.enabledLocales.filter((l) => l !== loc) : [...general.enabledLocales, loc];
    setG("enabledLocales", next);
    if (!next.includes(general.defaultLocale)) setG("defaultLocale", next[0]);
  };

  return (
    <>
      <div className="mb-3 flex gap-1 border-b border-neutral-200">
        {(
          [
            { key: "store", label: "Identité" },
            { key: "general", label: "Général" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[13px]", tab === t.key ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <Card title="Identité de la boutique">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Nom *" value={store.name} onChange={(e) => setS("name", e.target.value)} error={errors.name} maxLength={80} />
            <TextInput label="Slogan" value={store.tagline} onChange={(e) => setS("tagline", e.target.value)} error={errors.tagline} maxLength={160} />
            <ImageField label="Logo" value={store.logoUrl} onChange={(url) => setS("logoUrl", url)} folder="store" />
            <ImageField label="Favicon" value={store.faviconUrl} onChange={(url) => setS("faviconUrl", url)} folder="store" />
            <label>
              <span className="a-label">Couleur principale</span>
              <div className="flex gap-2">
                <input type="color" className="h-9 w-12 rounded border border-neutral-300" value={store.primaryColor} onChange={(e) => setS("primaryColor", e.target.value)} />
                <input className="a-input" value={store.primaryColor} onChange={(e) => setS("primaryColor", e.target.value)} maxLength={7} />
              </div>
            </label>
            <label>
              <span className="a-label">Couleur d&apos;accent</span>
              <div className="flex gap-2">
                <input type="color" className="h-9 w-12 rounded border border-neutral-300" value={store.accentColor} onChange={(e) => setS("accentColor", e.target.value)} />
                <input className="a-input" value={store.accentColor} onChange={(e) => setS("accentColor", e.target.value)} maxLength={7} />
              </div>
            </label>
            <TextInput label="Téléphone boutique" value={store.phone} onChange={(e) => setS("phone", e.target.value)} error={errors.phone} />
            <TextInput label="WhatsApp" value={store.whatsapp} onChange={(e) => setS("whatsapp", e.target.value)} error={errors.whatsapp} />
            <TextInput label="E-mail" value={store.email} onChange={(e) => setS("email", e.target.value)} error={errors.email} />
            <TextInput label="Adresse physique" value={store.address} onChange={(e) => setS("address", e.target.value)} error={errors.address} wrapClass="sm:col-span-2" />
            <TextInput label="Lien carte (Google Maps…)" value={store.mapUrl} onChange={(e) => setS("mapUrl", e.target.value)} error={errors.mapUrl} />
            <TextInput label="Horaires d'ouverture" value={store.openingHours} onChange={(e) => setS("openingHours", e.target.value)} error={errors.openingHours} />
            <TextInput label="Facebook" value={store.social.facebook} onChange={(e) => setSocial("facebook", e.target.value)} />
            <TextInput label="Instagram" value={store.social.instagram} onChange={(e) => setSocial("instagram", e.target.value)} />
            <TextInput label="TikTok" value={store.social.tiktok} onChange={(e) => setSocial("tiktok", e.target.value)} />
            <TextInput label="YouTube" value={store.social.youtube} onChange={(e) => setSocial("youtube", e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" className="a-btn-primary" disabled={busy} onClick={() => run(() => put("/api/admin/settings/store", store), { success: "Identité enregistrée" })}>
              {busy && <Spinner />} Enregistrer
            </button>
          </div>
        </Card>
      )}

      {tab === "general" && (
        <Card title="Paramètres généraux">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Langue par défaut"
              value={general.defaultLocale}
              onChange={(e) => setG("defaultLocale", e.target.value as GeneralSettings["defaultLocale"])}
              options={general.enabledLocales.map((l) => ({ value: l, label: LOCALE_LABELS_FR[l] }))}
            />
            <div>
              <span className="a-label">Langues activées</span>
              <div className="mt-1 flex flex-wrap gap-3">
                {LOCALES.map((l) => (
                  <label key={l} className="flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" className="accent-neutral-900" checked={general.enabledLocales.includes(l)} onChange={() => toggleLocale(l)} />
                    {LOCALE_LABELS_FR[l]}
                  </label>
                ))}
              </div>
            </div>
            <Select
              label="Devise par défaut"
              value={general.defaultCurrency}
              onChange={(e) => setG("defaultCurrency", e.target.value)}
              options={general.currencies.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
            />
            <TextInput label="Indicatif téléphonique" value={general.phoneCountryCode} onChange={(e) => setG("phoneCountryCode", e.target.value.replace(/\D/g, "").slice(0, 4))} />
            <TextInput
              label="Chiffres nationaux"
              type="number"
              min={6}
              max={12}
              value={general.phoneDigits}
              onChange={(e) => setG("phoneDigits", Math.min(12, Math.max(6, Number(e.target.value) || 8)))}
            />
            <TextInput label="Seuil stock faible" type="number" min={0} value={general.lowStockThreshold} onChange={(e) => setG("lowStockThreshold", Math.max(0, Number(e.target.value) || 0))} />
            <TextInput label="Délai retour (jours)" type="number" min={0} value={general.returnPeriodDays} onChange={(e) => setG("returnPeriodDays", Math.max(0, Number(e.target.value) || 0))} />
            <TextInput label="Délai échange (jours)" type="number" min={0} value={general.exchangePeriodDays} onChange={(e) => setG("exchangePeriodDays", Math.max(0, Number(e.target.value) || 0))} />
            <TextInput label="Produits par page catalogue" type="number" min={8} max={60} value={general.catalogPageSize} onChange={(e) => setG("catalogPageSize", Math.min(60, Math.max(8, Number(e.target.value) || 24)))} />
            <TextInput label="Libellé taxe" value={general.taxLabel} onChange={(e) => setG("taxLabel", e.target.value)} />
            <TextInput label="Taux de taxe (%)" type="number" min={0} max={50} value={general.taxRate} onChange={(e) => setG("taxRate", Math.min(50, Math.max(0, Number(e.target.value) || 0)))} />
            <div className="sm:col-span-2 space-y-2">
              <Toggle label="Prix TTC (taxe incluse)" checked={general.pricesIncludeTax} onChange={(v) => setG("pricesIncludeTax", v)} />
              <Toggle label="Avis clients activés" checked={general.reviewsEnabled} onChange={(v) => setG("reviewsEnabled", v)} />
              <Toggle label="Modération des avis avant publication" checked={general.reviewsRequireApproval} onChange={(v) => setG("reviewsRequireApproval", v)} />
              <Toggle label="Mode maintenance" checked={general.maintenanceMode} onChange={(v) => setG("maintenanceMode", v)} hint="Seuls les administrateurs peuvent naviguer la boutique." />
            </div>
            {general.maintenanceMode && (
              <TextArea label="Message de maintenance" value={general.maintenanceMessage} onChange={(e) => setG("maintenanceMessage", e.target.value)} wrapClass="sm:col-span-2" />
            )}
            <TextArea label="Résumé politique de retour" value={general.returnPolicySummary} onChange={(e) => setG("returnPolicySummary", e.target.value)} wrapClass="sm:col-span-2" />
            <TextArea label="Résumé politique d'échange" value={general.exchangePolicySummary} onChange={(e) => setG("exchangePolicySummary", e.target.value)} wrapClass="sm:col-span-2" />

            <div className="sm:col-span-2">
              <p className="a-label mb-2">Devises (taux relatif à 1 TND)</p>
              <div className="space-y-2">
                {general.currencies.map((c, i) => (
                  <div key={c.code} className="grid grid-cols-4 gap-2">
                    <TextInput label="Code" value={c.code} disabled />
                    <TextInput
                      label="Symbole"
                      value={c.symbol}
                      onChange={(e) => {
                        const currencies = [...general.currencies];
                        currencies[i] = { ...c, symbol: e.target.value };
                        setG("currencies", currencies);
                      }}
                    />
                    <TextInput
                      label="Taux"
                      type="number"
                      step="0.001"
                      value={c.rate}
                      onChange={(e) => {
                        const currencies = [...general.currencies];
                        currencies[i] = { ...c, rate: Math.max(0.0001, Number(e.target.value) || 1) };
                        setG("currencies", currencies);
                      }}
                    />
                    <TextInput
                      label="Décimales"
                      type="number"
                      min={0}
                      max={3}
                      value={c.decimals}
                      onChange={(e) => {
                        const currencies = [...general.currencies];
                        currencies[i] = { ...c, decimals: Math.min(3, Math.max(0, Number(e.target.value) || 0)) };
                        setG("currencies", currencies);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" className="a-btn-primary" disabled={busy} onClick={() => run(() => put("/api/admin/settings/general", general), { success: "Paramètres généraux enregistrés" })}>
              {busy && <Spinner />} Enregistrer
            </button>
          </div>
        </Card>
      )}
    </>
  );
}
