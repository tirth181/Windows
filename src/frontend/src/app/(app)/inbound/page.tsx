"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Mail,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { apiFetch, apiFetchOrDemo } from "@/lib/api";
import { DEMO_INBOUND } from "@/lib/mock-data";
import {
  getDemoItem,
  loadDemoCollection,
  saveDemoCollection,
} from "@/lib/demo-store";
import { printInboundReceipt } from "@/lib/print-document";
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
import { InboundReceiptPreview } from "@/features/inbound/InboundReceiptPreview";
import { EmailReceiptModal } from "@/features/inbound/EmailReceiptModal";

export default function InboundPage() {
  const router = useRouter();
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
  const [selectedLoad, setSelectedLoad] = useState<InboundLoad | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InboundLoad | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewLoad, setPreviewLoad] = useState<InboundLoad | null>(null);
  const [emailLoad, setEmailLoad] = useState<InboundLoad | null>(null);
  const [busyAction, setBusyAction] = useState(false);

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

  function canEditRow(row: InboundLoad) {
    if (!canEdit && !isAdmin) return false;
    if (row.status === "Draft") return canEdit || isAdmin;
    if (row.status === "Received") return isAdmin;
    return false;
  }

  function canDeleteRow(row: InboundLoad) {
    if (!canDelete) return false;
    if (isAdmin) return true;
    return row.status === "Draft";
  }

  async function resolveFullLoad(row: InboundLoad): Promise<InboundLoad> {
    try {
      const full = await apiFetch<InboundLoad>(`/inbound/${row.id}`);
      return {
        ...row,
        ...full,
        attachment: full.attachment || row.attachment,
        lines: full.lines?.length ? full.lines : row.lines,
      };
    } catch {
      return getDemoItem("inbound", DEMO_INBOUND, row.id) || row;
    }
  }

  async function openLoad(row: InboundLoad) {
    setBusyAction(true);
    try {
      const full = await resolveFullLoad(row);
      setSelectedLoad(full);
    } finally {
      setBusyAction(false);
    }
  }

  async function handlePrint(row: InboundLoad) {
    setBusyAction(true);
    try {
      const full = await resolveFullLoad(row);
      printInboundReceipt(full);
    } finally {
      setBusyAction(false);
    }
  }

  async function handlePreview(row: InboundLoad) {
    setBusyAction(true);
    try {
      const full = await resolveFullLoad(row);
      setSelectedLoad(null);
      setPreviewLoad(full);
    } finally {
      setBusyAction(false);
    }
  }

  async function handleEmail(row: InboundLoad) {
    setBusyAction(true);
    try {
      const full = await resolveFullLoad(row);
      setSelectedLoad(null);
      setEmailLoad(full);
    } finally {
      setBusyAction(false);
    }
  }

  function handleEdit(row: InboundLoad) {
    setSelectedLoad(null);
    router.push(`/inbound/${row.id}`);
  }

  function requestDelete(row: InboundLoad) {
    setSelectedLoad(null);
    setConfirmDelete(row);
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
        description="Click a load to Print, Preview, Email, Edit, or Delete."
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
              <th className="px-4 py-3 font-semibold">Doc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-steel)]/10">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-[var(--accent)]/5"
                onClick={() => void openLoad(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void openLoad(row);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open actions for ${row.loadNumber}`}
              >
                <td className="px-4 py-3">
                  <span className="font-[family-name:var(--font-mono)] font-medium text-[var(--accent)]">
                    {row.loadNumber}
                  </span>
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
                <td className="px-4 py-3 text-xs text-[var(--muted)]">
                  {row.attachment?.name ? (
                    <span className="truncate" title={row.attachment.name}>
                      Yes
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 text-xs text-[var(--muted)]">
        <Badge tone="steel">{rows.length} loads</Badge>
        <span>Click any load for Print, Preview, Email, Edit, or Delete.</span>
      </div>

      <Modal
        open={Boolean(selectedLoad)}
        title={selectedLoad?.loadNumber || "Inbound load"}
        description="Choose an action for this inbound receipt."
        onClose={() => {
          if (!busyAction) setSelectedLoad(null);
        }}
        className="max-w-lg"
        footer={
          <Button
            type="button"
            variant="outline"
            disabled={busyAction}
            onClick={() => setSelectedLoad(null)}
          >
            Close
          </Button>
        }
      >
        {selectedLoad ? (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface)]/70 px-3 py-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={selectedLoad.status} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Storage plant
                </p>
                <p className="mt-1 font-[family-name:var(--font-mono)] font-medium">
                  {selectedLoad.storageLocationCode || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Supplier
                </p>
                <p className="mt-1 font-medium">
                  {selectedLoad.supplierName || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  Weight
                </p>
                <p className="mt-1 font-medium tabular-nums">
                  {selectedLoad.totalWeight != null
                    ? formatWeight(selectedLoad.totalWeight)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busyAction}
                onClick={() => void handlePrint(selectedLoad)}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busyAction}
                onClick={() => void handlePreview(selectedLoad)}
              >
                <FileText className="h-4 w-4" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busyAction}
                onClick={() => void handleEmail(selectedLoad)}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={busyAction || !canEditRow(selectedLoad)}
                title={
                  canEditRow(selectedLoad)
                    ? "Edit this inbound load"
                    : "Editing is not available for this load"
                }
                onClick={() => handleEdit(selectedLoad)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="text-[var(--danger)] hover:bg-[var(--danger)]/5 sm:col-span-2"
                disabled={busyAction || !canDeleteRow(selectedLoad)}
                title={
                  canDeleteRow(selectedLoad)
                    ? "Delete this inbound load"
                    : "Delete is not available for this load"
                }
                onClick={() => requestDelete(selectedLoad)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

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

      <InboundReceiptPreview
        open={Boolean(previewLoad)}
        load={previewLoad}
        onClose={() => setPreviewLoad(null)}
        onEmail={(load) => {
          setPreviewLoad(null);
          setEmailLoad(load);
        }}
      />

      <EmailReceiptModal
        open={Boolean(emailLoad)}
        load={emailLoad}
        onClose={() => setEmailLoad(null)}
        onSent={(to) => {
          setMessage(`Receipt emailed to ${to.join(", ")}.`);
        }}
      />
    </div>
  );
}
