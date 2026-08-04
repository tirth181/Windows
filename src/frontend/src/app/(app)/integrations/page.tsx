"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plug, RefreshCw, FlaskConical } from "lucide-react";
import { apiFetchOrDemo } from "@/lib/api";
import { DEMO_FIELD_MAPPINGS, DEMO_INTEGRATIONS } from "@/lib/mock-data";
import type { FieldMapping, IntegrationConnection } from "@/types";
import {
  Badge,
  Button,
  DemoBanner,
  PageHeader,
  RelativeTime,
  StatusBadge,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  const [connections, setConnections] =
    useState<IntegrationConnection[]>(DEMO_INTEGRATIONS);
  const [mappings, setMappings] =
    useState<FieldMapping[]>(DEMO_FIELD_MAPPINGS);
  const [selectedId, setSelectedId] = useState(DEMO_INTEGRATIONS[0]?.id || "");
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetchOrDemo<IntegrationConnection[]>(
        "/integrations",
        DEMO_INTEGRATIONS,
      );
      if (cancelled) return;
      setConnections(result.data);
      setDemo(result.demo);
      if (result.data[0] && !selectedId) {
        setSelectedId(result.data[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = connections.find((c) => c.id === selectedId) || connections[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connection health and visual field mapping for ERP, EDI, and file feeds."
      />
      <DemoBanner show={demo} />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Connections
          </h2>
          <ul className="space-y-2">
            {connections.map((conn) => {
              const active = conn.id === selected?.id;
              return (
                <li key={conn.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conn.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-all duration-200",
                      active
                        ? "border-[var(--accent)]/50 bg-[var(--surface-raised)] shadow-sm"
                        : "border-[var(--brand-steel)]/15 bg-transparent hover:border-[var(--brand-steel)]/30 hover:bg-[var(--surface-raised)]/70",
                    )}
                  >
                    <Plug
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[var(--brand-ink)]">
                          {conn.name}
                        </span>
                        <StatusBadge status={conn.status} />
                      </span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {conn.type}
                        {conn.lastSyncAt ? (
                          <>
                            {" · synced "}
                            <RelativeTime date={conn.lastSyncAt} />
                          </>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--brand-ink)]">
                Field mapper
              </h2>
              <p className="text-sm text-[var(--muted)]">
                {selected?.name || "Select a connection"} — map source fields to
                LogiForge targets
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!selected || busy === "test"}
                onClick={async () => {
                  setBusy("test");
                  await new Promise((r) => setTimeout(r, 500));
                  setBusy(null);
                }}
              >
                <FlaskConical className="h-4 w-4" />
                {busy === "test" ? "Testing…" : "Test"}
              </Button>
              <Button
                size="sm"
                disabled={!selected || busy === "sync"}
                onClick={async () => {
                  setBusy("sync");
                  await new Promise((r) => setTimeout(r, 700));
                  if (selected) {
                    setConnections((prev) =>
                      prev.map((c) =>
                        c.id === selected.id
                          ? {
                              ...c,
                              status: "Connected",
                              lastSyncAt: new Date().toISOString(),
                            }
                          : c,
                      ),
                    );
                  }
                  setBusy(null);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {busy === "sync" ? "Syncing…" : "Sync"}
              </Button>
            </div>
          </div>

          {selected?.endpoint ? (
            <p className="truncate font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
              {selected.endpoint}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 border-b border-[var(--brand-steel)]/10 bg-[#eef3f8] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <span>Source</span>
              <span />
              <span>Target</span>
              <span>Transform</span>
            </div>
            <ul className="divide-y divide-[var(--brand-steel)]/10">
              {mappings.map((map, idx) => (
                <li
                  key={map.id}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-3 py-3 text-sm"
                >
                  <input
                    value={map.sourceField}
                    onChange={(e) =>
                      setMappings((prev) =>
                        prev.map((m, i) =>
                          i === idx ? { ...m, sourceField: e.target.value } : m,
                        ),
                      )
                    }
                    className="h-9 rounded border border-[var(--brand-steel)]/15 bg-[var(--surface)] px-2 font-[family-name:var(--font-mono)] text-xs focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                  />
                  <ArrowRight className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  <input
                    value={map.targetField}
                    onChange={(e) =>
                      setMappings((prev) =>
                        prev.map((m, i) =>
                          i === idx ? { ...m, targetField: e.target.value } : m,
                        ),
                      )
                    }
                    className="h-9 rounded border border-[var(--brand-steel)]/15 bg-[var(--surface)] px-2 font-[family-name:var(--font-mono)] text-xs focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                  />
                  <Badge tone={map.transform ? "accent" : "neutral"}>
                    {map.transform || "none"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setMappings((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  sourceField: "",
                  targetField: "",
                },
              ])
            }
          >
            Add mapping row
          </Button>
        </section>
      </div>
    </div>
  );
}
