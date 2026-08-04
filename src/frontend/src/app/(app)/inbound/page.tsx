"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, apiFetchOrDemo } from "@/lib/api";
import { DEMO_INBOUND } from "@/lib/mock-data";
import {
  loadDemoCollection,
  saveDemoCollection,
} from "@/lib/demo-store";
import type { InboundLoad } from "@/types";
import {
  Badge,
  Button,
  DemoBanner,
  FormattedDate,
  Modal,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { formatWeight } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function InboundPage() {
  const canCreate = useAuthStore((s) => s.hasPermission("inbound.create"));
  const canEdit = useAuthStore(
    (s) => s.hasPermission("inbound.edit") || s.hasPermission("admin.full"),
  );
  const isAdmin = useAuthStore(
    (s) => s.hasPermission("admin.full") || s.hasPermission("platform.admin"),
  );
  const canDelete = useAuthStore(
    (s) =>
      s.hasPermission("inbound.delete") ||
      s.hasPermission("admin.full") ||
      s.hasPermission("platform.admin"),
  );
  const myCompanyId = useAuthStore((s) => s.selectedWarehouseId);
  const [rows, setRows] = useState<InboundLoad[]>(DEMO_INBOUND);
  const [demo, setDemo] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<InboundLoad | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const local = loadDemoCollection("inbound", DEMO_INBOUND);
    const result = await apiFetchOrDemo<{ items: InboundLoad[] } | InboundLoad[]>(
      "/inbound",
      local,
    );
    const data = Array.isArray(result.data)
      ? result.data
      : result.data.items ?? local;
    const scoped = myCompanyId
      ? data.filter((r) => r.warehouseId === myCompanyId)
      : data;
    setRows(scoped);
    setDemo(result.demo);
  }, [myCompanyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  function canDeleteRow(row: InboundLoad) {
    if (!canDelete) return false;
    if (isAdmin) return true;
    return row.status === "Draft";
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setDeleting(true);
    setMessage(null);
    try {
      await apiFetch(`/inbound/${target.id}`, { method: "DELETE" });
      const filtered = rows.filter((r) => r.id !== target.id);
      setRows(filtered);
      setDemo(false);
    } catch {
      const filtered = rows.filter((r) => r.id !== target.id);
      saveDemoCollection("inbound", filtered);
      setRows(filtered);
      setDemo(true);
    } finally {
      setDeleting(false);
      setMessage(`Deleted ${target.loadNumber}.`);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbound"
        description="Receiving queue and load history. View, edit, or delete — admins can edit/delete received loads too."
        actions={
          canCreate ? (
            <Link href="/inbound/new">
              <Button size="md">
                <Plus className="h-4 w-4" />
                New receiving
              </Button>
            </Link>
          ) : null
        }
      />
      <DemoBanner show={demo} />
      {message ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#eef3f8] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Load</th>
              <th className="px-4 py-3 font-semibold">Storage Plant</th>
              <th className="px-4 py-3 font-semibold">3PL company</th>
              <th className="px-4 py-3 font-semibold">Arrival</th>
              <th className="px-4 py-3 font-semibold">Lines</th>
              <th className="px-4 py-3 font-semibold">Weight (lbs)</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--surface)]/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/inbound/${row.id}`}
                    className="font-[family-name:var(--font-mono)] font-medium text-[var(--brand-ink)] hover:text-[var(--accent)]"
                  >
                    {row.loadNumber}
                  </Link>
                  {row.carrier ? (
                    <p className="text-xs text-[var(--muted)]">{row.carrier}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--brand-ink)]">
                  {row.storageLocationCode ||
                    row.lines?.find((l) => l.locationCode)?.locationCode ||
                    "—"}
                </td>
                <td className="px-4 py-3">{row.warehouseName}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                  <FormattedDate date={row.arrivalDate} />
                </td>
                <td className="px-4 py-3 tabular-nums">{row.lineCount ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.totalWeight != null ? formatWeight(row.totalWeight) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/inbound/${row.id}?view=1`}>
                      <Button variant="outline" size="sm" type="button">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </Link>
                    {(row.status === "Draft" && canEdit) ||
                    (isAdmin && row.status === "Received") ? (
                      <Link href={`/inbound/${row.id}`}>
                        <Button size="sm" type="button">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </Link>
                    ) : null}
                    {canDeleteRow(row) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="text-[var(--danger)] hover:bg-[var(--danger)]/5"
                        onClick={() => setConfirmDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 text-xs text-[var(--muted)]">
        <Badge tone="steel">{rows.length} loads</Badge>
      </div>

      <Modal
        open={Boolean(confirmDelete)}
        title="Delete inbound shipment?"
        description="This permanently removes the load from the active queue. Admins can delete received loads as well."
        onClose={() => {
          if (!deleting) setConfirmDelete(null);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="bg-[var(--danger)] hover:opacity-90"
            >
              {deleting ? "Deleting…" : "Delete shipment"}
            </Button>
          </>
        }
      >
        Delete <strong>{confirmDelete?.loadNumber}</strong>
        {confirmDelete?.status === "Received"
          ? " (received — admin delete)."
          : "."}
      </Modal>
    </div>
  );
}
