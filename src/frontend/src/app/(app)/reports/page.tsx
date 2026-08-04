"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, FileBarChart2, Mail, Play, Printer } from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_OUTBOUND, DEMO_REPORTS } from "@/lib/mock-data";
import { loadDemoCollection } from "@/lib/demo-store";
import {
  filterShipLogOrders,
  printShipLog,
  todayLocalDayKey,
} from "@/lib/ship-log";
import type { OutboundOrder, ReportDefinition } from "@/types";
import {
  Button,
  DemoBanner,
  FormattedDate,
  Input,
  PageHeader,
  Badge,
} from "@/components/ui";
import { EmailShipLogModal } from "@/features/reports/EmailShipLogModal";
import { ShipLogPreview } from "@/features/reports/ShipLogPreview";
import { useAuthStore } from "@/stores/auth-store";
import { companiesForUser } from "@/lib/companies-scope";

const SHIP_LOG_IDS = new Set(["rpt-ship-log", "ship_log", "shiplog"]);

function isShipLogReport(report: ReportDefinition): boolean {
  const id = (report.id || "").toLowerCase();
  const name = (report.name || "").toLowerCase();
  return (
    SHIP_LOG_IDS.has(id) ||
    name.includes("ship log") ||
    name.includes("shiplog") ||
    name.includes("shiplong")
  );
}

function normalizeReports(
  data: ReportDefinition[] | { code?: string; name: string; description?: string }[],
): ReportDefinition[] {
  if (!Array.isArray(data) || !data.length) return DEMO_REPORTS;
  return data.map((r, i) => {
    const anyR = r as ReportDefinition & { code?: string };
    return {
      id: anyR.id || anyR.code || `rpt-${i}`,
      name: anyR.name,
      category: anyR.category || "Operations",
      description: anyR.description || "",
      lastRunAt: anyR.lastRunAt,
    };
  });
}

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const warehouses = useAuthStore((s) => s.warehouses);
  const selectedWarehouseId = useAuthStore((s) => s.selectedWarehouseId);
  const myCompanies = warehouses.length ? warehouses : companiesForUser(user);
  const myCompany =
    myCompanies.find((c) => c.id === selectedWarehouseId) || myCompanies[0];

  const [reports, setReports] = useState<ReportDefinition[]>(DEMO_REPORTS);
  const [demo, setDemo] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [outbound, setOutbound] = useState<OutboundOrder[]>(DEMO_OUTBOUND);
  const [shipDay, setShipDay] = useState(todayLocalDayKey());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<
        ReportDefinition[] | { code: string; name: string; description: string }[]
      >("/reports", DEMO_REPORTS);
      if (cancelled) return;
      const normalized = normalizeReports(result.data);
      // Ensure Ship Log is always available even if API catalog is older
      const hasShipLog = normalized.some(isShipLogReport);
      setReports(
        hasShipLog
          ? normalized
          : [
              DEMO_REPORTS.find((r) => r.id === "rpt-ship-log")!,
              ...normalized,
            ].filter(Boolean),
      );
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadDemoCollection("outbound", DEMO_OUTBOUND);
      const result = await apiFetchOrDemo<
        { items: OutboundOrder[] } | OutboundOrder[]
      >("/outbound", local);
      if (cancelled) return;
      const data = Array.isArray(result.data)
        ? result.data
        : result.data.items ?? local;
      setOutbound(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shipLogOrders = useMemo(
    () => filterShipLogOrders(outbound, shipDay, myCompany?.id),
    [outbound, shipDay, myCompany?.id],
  );

  function markRan(reportId: string) {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, lastRunAt: new Date().toISOString() } : r,
      ),
    );
  }

  async function runReport(report: ReportDefinition) {
    setMessage(null);
    if (isShipLogReport(report)) {
      setRunningId(report.id);
      setPreviewOpen(true);
      markRan(report.id);
      setRunningId(null);
      return;
    }
    setRunningId(report.id);
    await new Promise((r) => setTimeout(r, 600));
    markRan(report.id);
    setRunningId(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Operational and inventory reports — run on demand or schedule later."
      />
      <DemoBanner show={demo} />

      {message ? (
        <p className="rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--brand-ink)]">
          {message}
        </p>
      ) : null}

      <ul className="divide-y divide-[var(--brand-steel)]/10 border-y border-[var(--brand-steel)]/10">
        {reports.map((report) => {
          const shipLog = isShipLogReport(report);
          return (
            <li
              key={report.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <FileBarChart2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]"
                  aria-hidden
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium text-[var(--brand-ink)]">
                      {report.name}
                    </h2>
                    <Badge tone="steel">{report.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {report.description}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Last run:{" "}
                    {report.lastRunAt ? (
                      <FormattedDate
                        date={report.lastRunAt}
                        pattern="MMM d, yyyy HH:mm"
                      />
                    ) : (
                      "Never"
                    )}
                  </p>
                </div>
              </div>
              {shipLog ? (
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <div className="w-full min-w-[160px] sm:w-44">
                    <Input
                      label="Ship day"
                      type="date"
                      value={shipDay}
                      onChange={(e) => setShipDay(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setPreviewOpen(true);
                        markRan(report.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setEmailOpen(true);
                        markRan(report.id);
                      }}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        printShipLog(shipLogOrders, shipDay, myCompany);
                        markRan(report.id);
                        setMessage(
                          `Printed Ship Log for ${shipDay} (${shipLogOrders.length} shipment${shipLogOrders.length === 1 ? "" : "s"}).`,
                        );
                      }}
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={runningId === report.id}
                  onClick={() => void runReport(report)}
                >
                  <Play className="h-4 w-4" />
                  {runningId === report.id ? "Running…" : "Run"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <ShipLogPreview
        open={previewOpen}
        dayKey={shipDay}
        onDayChange={setShipDay}
        orders={shipLogOrders}
        company={myCompany}
        onClose={() => setPreviewOpen(false)}
        onEmail={() => setEmailOpen(true)}
      />

      <EmailShipLogModal
        open={emailOpen}
        orders={shipLogOrders}
        dayKey={shipDay}
        company={myCompany}
        onClose={() => setEmailOpen(false)}
        onSent={(to) =>
          setMessage(
            `Ship Log email draft ready for ${to.join(", ")} — open the downloaded .eml for the table and attachments.`,
          )
        }
      />
    </div>
  );
}
