import { adminPage } from "@/server/admin-guard";
import { getAllSettings } from "@/server/settings";
import { PageHeader } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  await adminPage("settings.manage");
  const { store, general } = await getAllSettings();
  return (
    <>
      <PageHeader title="Paramètres" description="Identité de la boutique, langues, devises, TVA, maintenance et politiques de retour." />
      <SettingsForm store={store} general={general} />
    </>
  );
}
