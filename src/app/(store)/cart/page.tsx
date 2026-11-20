import type { Metadata } from "next";
import { CartPage } from "@/components/store/cart-page";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function Cart() {
  return (
    <div className="container-x py-10">
      <CartPage />
    </div>
  );
}
