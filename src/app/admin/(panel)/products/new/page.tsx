import { adminPage } from "@/server/admin-guard";
import { productEditorOptions } from "@/server/admin-product-data";
import { PageHeader } from "@/components/admin/parts";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await adminPage("products.manage");
  const options = await productEditorOptions();
  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "Produits" }} title="Nouveau produit" description="Enregistrez d'abord les informations générales, puis ajoutez variantes (couleurs × tailles), stock et photos." />
      <ProductForm options={options} />
    </>
  );
}
