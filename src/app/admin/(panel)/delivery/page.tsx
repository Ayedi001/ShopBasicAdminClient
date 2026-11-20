import { adminPage } from "@/server/admin-guard";
import { getSetting } from "@/server/settings";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/admin/parts";
import { DeliverySettingsForm } from "@/components/admin/delivery-form";
import { SimpleCrud } from "@/components/admin/simple-crud";

export default async function DeliveryPage() {
  await adminPage("settings.manage");
  const [delivery, regions] = await Promise.all([
    getSetting("delivery"),
    prisma.deliveryRegion.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader
        title="Livraison"
        description="Frais par région, seuil de livraison gratuite et option de retrait en magasin. Aucune API transporteur — vous contactez le livreur vous-même."
      />
      <DeliverySettingsForm initial={delivery} />
      <div className="mt-4">
        <SimpleCrud
          title="Régions de livraison"
          description="Chaque région a son propre tarif. Les clients choisissent leur région au checkout."
          entityLabel="région"
          endpoint="/api/admin/regions"
          deleteConfirm="Supprimer cette région ? Les profils clients qui l'utilisent garderont l'ancienne valeur en texte libre."
          defaults={{ name: "", nameAr: "", fee: 7000, estimatedDays: "2-3 jours", sortOrder: (regions.length + 1) * 10, isActive: true }}
          items={regions.map((r) => ({
            id: r.id,
            name: r.name,
            nameAr: r.nameAr,
            fee: r.fee,
            estimatedDays: r.estimatedDays,
            sortOrder: r.sortOrder,
            isActive: r.isActive,
          }))}
          fields={[
            { key: "name", label: "Nom (FR) *", type: "text", column: true, span: 1, max: 80 },
            { key: "nameAr", label: "Nom (AR)", type: "text", rtl: true, nullable: true, column: true, span: 1, max: 80 },
            { key: "fee", label: "Frais *", type: "money", column: true, span: 1 },
            { key: "estimatedDays", label: "Délai estimé", type: "text", nullable: true, column: true, span: 1, max: 40 },
            { key: "sortOrder", label: "Ordre", type: "number", span: 1 },
            { key: "isActive", label: "Active", type: "toggle", column: true, span: 1 },
          ]}
        />
      </div>
    </>
  );
}
