"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileBarChart2, Play } from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_REPORTS } from "@/lib/mock-data";
import type { ReportDefinition } from "@/types";
import { Button, DemoBanner, PageHeader, Badge } from "@/components/ui";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDefinition[]>(DEMO_REPORTS);
  const [demo, setDemo] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<ReportDefinition[]>(
        "/reports",
        DEMO_REPORTS,
      );
      if (cancelled) return;
      setReports(result.data);
      setDemo(result.demo);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Operational and inventory reports — run on demand or schedule later."
      />
      <DemoBanner show={demo} />

      <ul className="divide-y divide-[var(--brand-steel)]/10 border-y border-[var(--brand-steel)]/10">
        {reports.map((report) => (
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
                  {report.lastRunAt
                    ? format(new Date(report.lastRunAt), "MMM d, yyyy HH:mm")
                    : "Never"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={runningId === report.id}
              onClick={async () => {
                setRunningId(report.id);
                await new Promise((r) => setTimeout(r, 600));
                setReports((prev) =>
                  prev.map((r) =>
                    r.id === report.id
                      ? { ...r, lastRunAt: new Date().toISOString() }
                      : r,
                  ),
                );
                setRunningId(null);
              }}
            >
              <Play className="h-4 w-4" />
              {runningId === report.id ? "Running…" : "Run"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
