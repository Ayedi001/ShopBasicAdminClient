import { api } from "@/server/http";
import { requireStaff } from "@/server/auth/session";
import { getSetting, updateSetting } from "@/server/settings";
import { badRequest } from "@/server/errors";
import { audit } from "@/server/audit";

const GROUPS = ["store", "general", "delivery"] as const;
type Group = (typeof GROUPS)[number];

export const GET = api<{ group: string }>(async (_req, ctx) => {
  await requireStaff("settings.manage");
  const { group } = await ctx.params;
  if (!GROUPS.includes(group as Group)) throw badRequest("INVALID_GROUP", "Groupe inconnu");
  return { settings: await getSetting(group as Group) };
});

export const PUT = api<{ group: string }>(async (req, ctx) => {
  const user = await requireStaff("settings.manage");
  const { group } = await ctx.params;
  if (!GROUPS.includes(group as Group)) throw badRequest("INVALID_GROUP", "Groupe inconnu");
  const body = await req.json().catch(() => {
    throw badRequest("INVALID_JSON", "Corps invalide");
  });
  const saved = await updateSetting(group as Group, body);
  await audit(user, "settings.update", "Setting", group, body as Record<string, unknown>);
  return { ok: true, settings: saved };
});
