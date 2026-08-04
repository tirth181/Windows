"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_USERS } from "@/lib/mock-data";
import type { AppUser } from "@/types";
import { Badge, Button, DemoBanner, PageHeader, StatusBadge } from "@/components/ui";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>(DEMO_USERS);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<{ items: AppUser[] } | AppUser[]>(
        "/users",
        DEMO_USERS,
      );
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? DEMO_USERS;
      setUsers(data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Warehouse operators and administrators with role-based access."
        actions={<Button variant="outline">Invite user</Button>}
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
                  {user.lastLoginAt
                    ? format(new Date(user.lastLoginAt), "MMM d, HH:mm")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.isActive ? "Active" : "Suspended"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
