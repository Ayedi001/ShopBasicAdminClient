"use client";

import { useState } from "react";
import { put } from "@/lib/client-api";
import type { DeliverySettings } from "@/server/settings";
import { Card } from "./parts";
import { MoneyInput, Spinner, TextArea, TextInput, Toggle, useAction } from "./ui";

export function DeliverySettingsForm({ initial }: { initial: DeliverySettings }) {
  const [f, setF] = useState(initial);
  const { run, busy, errors } = useAction();
  const set = <K extends keyof DeliverySettings>(k: K, v: DeliverySettings[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Card title="Paramètres généraux de livraison">
      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyInput
          label="Livraison gratuite à partir de"
          value={f.freeShippingThreshold}
          onChange={(m) => set("freeShippingThreshold", m ?? 0)}
          error={errors.freeShippingThreshold}
          hint="0 pour désactiver. Montant hors frais de port."
          wrapClass="sm:col-span-2"
        />
        <TextInput label="Délai estimé (texte)" value={f.estimatedDelivery} onChange={(e) => set("estimatedDelivery", e.target.value)} error={errors.estimatedDelivery} maxLength={100} />
        <TextInput label="Note de paiement" value={f.paymentNote} onChange={(e) => set("paymentNote", e.target.value)} error={errors.paymentNote} maxLength={300} hint="Ex. Paiement à la livraison." />
        <TextArea label="Instructions affichées au client" value={f.deliveryInstructions} onChange={(e) => set("deliveryInstructions", e.target.value)} error={errors.deliveryInstructions} wrapClass="sm:col-span-2" maxLength={2000} />
        <div className="sm:col-span-2">
          <Toggle label="Retrait en magasin disponible" checked={f.pickupEnabled} onChange={(v) => set("pickupEnabled", v)} />
        </div>
        {f.pickupEnabled && (
          <>
            <TextInput label="Adresse de retrait" value={f.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} error={errors.pickupAddress} maxLength={300} />
            <TextInput label="Horaires de retrait" value={f.pickupHours} onChange={(e) => set("pickupHours", e.target.value)} error={errors.pickupHours} maxLength={200} />
          </>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className="a-btn-primary" disabled={busy} onClick={() => run(() => put("/api/admin/settings/delivery", f), { success: "Paramètres livraison enregistrés" })}>
          {busy && <Spinner />} Enregistrer
        </button>
      </div>
    </Card>
  );
}
