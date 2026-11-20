"use client";

import { useRouter } from "next/navigation";
import { useStore } from "./store-provider";
import { post } from "@/lib/client-api";

export function MarkAllRead() {
  const { t, refreshMe } = useStore();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await post("/api/notifications", {}).catch(() => null);
        await refreshMe();
        router.refresh();
      }}
      className="text-[13px] underline underline-offset-4"
    >
      {t("account.markAllRead")}
    </button>
  );
}
