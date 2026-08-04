"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { Button, PageHeader } from "@/components/ui";
import { DEMO_AI_SUGGESTIONS, DEMO_AI_WELCOME } from "@/lib/mock-data";
import type { AiMessage } from "@/types";
import { cn } from "@/lib/utils";

function buildReply(prompt: string): AiMessage {
  const lower = prompt.toLowerCase();
  let content =
    "Based on current warehouse activity, I recommend reviewing partial pallets in Zone A and confirming outbound OUT-2026-2201 before the 15:00 dock window.";
  const actions: AiMessage["actions"] = [];

  if (lower.includes("inbound") || lower.includes("received")) {
    content =
      "Today: 6 inbound loads staged. INB-2026-0841 (Acme) is still Draft at Dallas Hub — ready for receiving when dock 2 opens.";
    actions.push({ label: "Open inbound", href: "/inbound" });
  } else if (lower.includes("delay") || lower.includes("outbound")) {
    content =
      "2 delayed outbound orders need attention. OUT-2026-2198 is in Picking at Atlanta Crossdock with film roll inventory reserved.";
    actions.push({ label: "Open outbound", href: "/outbound" });
  } else if (lower.includes("hold") || lower.includes("partial") || lower.includes("sku")) {
    content =
      "14 partial pallets and 3 on-hold items. Highest impact: RES-PELLET-A (PLT-100318) at 42% remaining and BRG-HSG-90 on Hold.";
    actions.push({ label: "View inventory", href: "/inventory" });
  } else if (lower.includes("util")) {
    content =
      "Dallas Hub utilization is 78%. Zone A is saturated; Zone B has open slots that can absorb putaway from INB-2026-0841.";
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    actions,
  };
}

export function AiChat() {
  const [messages, setMessages] = useState<AiMessage[]>([DEMO_AI_WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    setMessages((prev) => [...prev, buildReply(trimmed)]);
    setBusy(false);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader
        title="AI Assistant"
        description="Ask operational questions. Suggested prompts adapt to your role."
      />

      <div className="flex flex-wrap gap-2">
        {DEMO_AI_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => send(prompt)}
            className="rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)] px-3 py-1.5 text-left text-xs text-[var(--brand-ink)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[var(--brand-steel)]/15 bg-[var(--surface-raised)]">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-md px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[var(--brand-steel)] text-white"
                    : "bg-[var(--surface)] text-[var(--text)]",
                )}
              >
                <p>{msg.content}</p>
                {msg.actions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.actions.map((action) => (
                      <Link
                        key={action.href + action.label}
                        href={action.href}
                        className="inline-flex rounded border border-[var(--brand-steel)]/20 bg-[var(--surface-raised)] px-2 py-1 text-xs font-medium text-[var(--brand-ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex items-end gap-2 border-t border-[var(--brand-steel)]/10 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label className="sr-only" htmlFor="ai-input">
            Message
          </label>
          <textarea
            id="ai-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about inventory, inbound, or shipments…"
            className="min-h-[44px] flex-1 resize-none rounded-md border border-[var(--brand-steel)]/20 bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <Button type="submit" disabled={busy || !input.trim()} className="h-11">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
