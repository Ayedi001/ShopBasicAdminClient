"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { post, put } from "@/lib/client-api";
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PERMISSIONS, STAFF_ROLES, type Permission, type StaffRole } from "@/lib/constants";
import { ROLE_LABELS } from "./labels";
import { Badge, Card, Empty } from "./parts";
import { Modal, Select, Spinner, TextInput, Toggle, useAction } from "./ui";
import { cn } from "@/lib/utils";

type StaffItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  permissions: Permission[];
  hasOverride: boolean;
};

const empty = (): Record<string, unknown> => ({
  fullName: "",
  email: "",
  phone: "",
  role: "EMPLOYEE",
  password: "",
  isActive: true,
  permissions: [...ROLE_PERMISSIONS.EMPLOYEE],
  customPerms: false,
});

export function StaffManager({ items, currentUserId }: { items: StaffItem[]; currentUserId: string }) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  return (
    <Card bodyClass="p-0">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <p className="text-[13px] text-neutral-500">{items.length} membre(s)</p>
        <button type="button" className="a-btn-primary a-btn-sm" onClick={() => setEditing(empty())}>
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </header>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-[12px] text-neutral-500">{u.email}</p>
                  </td>
                  <td>{u.phone}</td>
                  <td>
                    {ROLE_LABELS[u.role] ?? u.role}
                    {u.hasOverride && <span className="ml-1 text-[11px] text-amber-700">(personnalisé)</span>}
                  </td>
                  <td>
                    <Badge status={u.isActive ? "ACTIVE" : "INACTIVE"}>{u.isActive ? "Actif" : "Inactif"}</Badge>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="a-btn a-btn-sm"
                      onClick={() =>
                        setEditing({
                          id: u.id,
                          fullName: u.fullName,
                          email: u.email,
                          phone: u.phone,
                          role: u.role,
                          password: "",
                          isActive: u.isActive,
                          permissions: u.permissions,
                          customPerms: u.hasOverride,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Aucun membre d&apos;équipe.</Empty>
      )}
      {editing && <StaffModal value={editing} currentUserId={currentUserId} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function StaffModal({ value, currentUserId, onClose }: { value: Record<string, unknown>; currentUserId: string; onClose: () => void }) {
  const [f, setF] = useState(value);
  const { run, busy, errors } = useAction();
  const id = value.id as string | undefined;
  const role = f.role as StaffRole;
  const perms = (f.permissions as Permission[]) ?? [];
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const togglePerm = (p: Permission) => {
    const next = perms.includes(p) ? perms.filter((x) => x !== p) : [...perms, p];
    set("permissions", next);
  };

  const save = () => {
    const body = {
      fullName: f.fullName,
      email: f.email,
      phone: f.phone,
      role: f.role,
      isActive: f.isActive,
      password: f.password || undefined,
      permissions: role === "OWNER" || !f.customPerms ? null : perms.filter((p) => p !== "staff.manage"),
    };
    run(() => (id ? put(`/api/admin/staff/${id}`, body) : post("/api/admin/staff", body)), { success: "Membre enregistré", onDone: onClose });
  };

  const editablePerms = PERMISSIONS.filter((p) => p !== "staff.manage");

  return (
    <Modal
      open
      onClose={onClose}
      title={id ? "Modifier un membre" : "Ajouter un membre"}
      size="lg"
      footer={
        <>
          <button type="button" className="a-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="a-btn-primary" disabled={busy} onClick={save}>
            {busy && <Spinner />} Enregistrer
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Nom complet *" value={String(f.fullName ?? "")} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} />
        <TextInput label="E-mail *" value={String(f.email ?? "")} onChange={(e) => set("email", e.target.value)} error={errors.email} />
        <TextInput label="Téléphone *" value={String(f.phone ?? "")} onChange={(e) => set("phone", e.target.value)} error={errors.phone} hint="Ex. 98 123 456" />
        <Select
          label="Rôle *"
          value={role}
          onChange={(e) => {
            const r = e.target.value as StaffRole;
            set("role", r);
            if (!f.customPerms) set("permissions", [...ROLE_PERMISSIONS[r]]);
          }}
          options={STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          disabled={id === currentUserId}
        />
        <TextInput
          label={id ? "Nouveau mot de passe" : "Mot de passe *"}
          type="password"
          value={String(f.password ?? "")}
          onChange={(e) => set("password", e.target.value)}
          error={errors.password}
          hint="8 caractères min., lettres et chiffres."
          wrapClass="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <Toggle label="Compte actif" checked={!!f.isActive} onChange={(v) => set("isActive", v)} disabled={id === currentUserId} hint={id === currentUserId ? "Vous ne pouvez pas désactiver votre propre compte." : undefined} />
        </div>
        {role !== "OWNER" && (
          <div className="sm:col-span-2 space-y-2 rounded-lg border border-neutral-200 p-3">
            <Toggle
              label="Personnaliser les permissions"
              checked={!!f.customPerms}
              onChange={(v) => {
                set("customPerms", v);
                if (!v) set("permissions", [...ROLE_PERMISSIONS[role]]);
              }}
              hint="Sinon, les permissions du rôle sont utilisées."
            />
            {!!f.customPerms && (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {editablePerms.map((p) => (
                  <label key={p} className={cn("flex items-center gap-2 text-[13px]", !ROLE_PERMISSIONS[role].includes(p) && "text-neutral-600")}>
                    <input type="checkbox" className="accent-neutral-900" checked={perms.includes(p)} onChange={() => togglePerm(p)} />
                    {PERMISSION_LABELS[p]}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
