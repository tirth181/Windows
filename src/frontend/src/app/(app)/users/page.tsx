"use client";

import { useEffect, useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { apiFetch, apiFetchOrDemo } from "@/lib/api";
import { DEMO_USERS } from "@/lib/mock-data";
import { loadDemoCollection, upsertDemoItem } from "@/lib/demo-store";
import type { AppUser } from "@/types";
import {
  Badge,
  Button,
  DemoBanner,
  FormattedDate,
  Input,
  Modal,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

type UserForm = {
  email: string;
  displayName: string;
  password: string;
  isActive: boolean;
};

const emptyForm = (): UserForm => ({
  email: "",
  displayName: "",
  password: "",
  isActive: true,
});

export default function UsersPage() {
  const canCreate = useAuthStore(
    (s) => s.hasPermission("users.create") || s.hasPermission("admin.full"),
  );
  const canEdit = useAuthStore(
    (s) => s.hasPermission("users.edit") || s.hasPermission("admin.full"),
  );
  const [users, setUsers] = useState<AppUser[]>(DEMO_USERS);
  const [demo, setDemo] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadDemoCollection("users", DEMO_USERS);
      const result = await apiFetchOrDemo<{ items: AppUser[] } | AppUser[]>(
        "/users",
        local,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
      setUsers(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openInvite() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function openEdit(user: AppUser) {
    setEditing(user);
    setForm({
      email: user.email,
      displayName: user.displayName,
      password: "",
      isActive: user.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!editing && (!form.email.trim() || !form.password.trim())) {
      setError("Email and password are required to invite a user.");
      return;
    }
    setSaving(true);
    setError(null);

    if (editing) {
      const payload = {
        displayName: form.displayName.trim(),
        isActive: form.isActive,
      };
      const record: AppUser = {
        ...editing,
        ...payload,
      };
      try {
        await apiFetch(`/users/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === record.id ? record : u)),
        );
      } catch {
        const next = upsertDemoItem("users", DEMO_USERS, record);
        setUsers(next);
        setDemo(true);
      }
    } else {
      const payload = {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        password: form.password,
        isActive: form.isActive,
      };
      const record: AppUser = {
        id: crypto.randomUUID(),
        email: payload.email,
        displayName: payload.displayName,
        isActive: payload.isActive,
        roles: ["Operator"],
      };
      try {
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setUsers((prev) => [record, ...prev]);
      } catch {
        const next = upsertDemoItem("users", DEMO_USERS, record);
        setUsers(next);
        setDemo(true);
      }
    }

    setSaving(false);
    setModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="3PL company operators and administrators with role-based access."
        actions={
          canCreate ? (
            <Button variant="outline" type="button" onClick={openInvite}>
              <UserPlus className="h-4 w-4" />
              Invite user
            </Button>
          ) : null
        }
      />
      <DemoBanner show={demo} />

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Roles</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3 font-medium text-[var(--brand-ink)]">
                  {user.displayName}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} tone="steel">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                  {user.lastLoginAt ? (
                    <FormattedDate date={user.lastLoginAt} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.isActive ? "Active" : "Suspended"} />
                </td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modify
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Modify user" : "Invite user"}
        description={
          editing
            ? "Update display name and active status."
            : "Create a local user account for the 3PL company."
        }
        onClose={() => !saving && setModalOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : editing ? "Save" : "Invite"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="user@example.com"
            disabled={Boolean(editing)}
            readOnly={Boolean(editing)}
          />
          <Input
            label="Display name"
            value={form.displayName}
            onChange={(e) =>
              setForm((f) => ({ ...f, displayName: e.target.value }))
            }
            placeholder="Full name"
          />
          {!editing ? (
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Temporary password"
            />
          ) : null}
          <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-[var(--brand-steel)]/30"
            />
            Active
          </label>
        </div>
      </Modal>
    </div>
  );
}
