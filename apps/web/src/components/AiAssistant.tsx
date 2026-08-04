'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  denied?: boolean;
  data?: any;
  action?: any;
  suggestions?: string[];
  trace?: string[];
  source?: string;
}

export function AiAssistant() {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi! I'm your AetherWMS assistant. Ask me about inventory, orders, or partial stock — I only answer within your permissions.",
      suggestions: ['How much inventory is available?', 'Show partial pallets', 'Which orders are delayed?'],
    },
  ]);

  if (!can('ai:use')) return null;

  async function send(question: string) {
    if (!question.trim() || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const res = await api('/api/ai/ask', { method: 'POST', body: JSON.stringify({ question }) });
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, denied: res.denied, data: res.data, action: res.action, suggestions: res.suggestions, trace: res.trace, source: res.source }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || 'Something went wrong.', denied: true }]);
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: any) {
    setBusy(true);
    try {
      const res = await api('/api/ai/execute', { method: 'POST', body: JSON.stringify({ action }) });
      setMessages((m) => [...m, { role: 'assistant', text: res.ok ? `✓ ${res.message}` : `✗ ${res.message}`, denied: !res.ok }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || 'Action failed.', denied: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700"
        aria-label="Open AI assistant"
      >
        <span className="text-xl">✨</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[560px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">AI Operations Assistant</p>
              <p className="text-xs text-brand-100">Permission-aware · reads live data</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-brand-100 hover:text-white">✕</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : m.denied
                        ? 'border border-red-200 bg-red-50 text-red-700'
                        : 'border border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.trace && m.trace.length > 0 && (
                    <div className="mt-1.5 border-l-2 border-slate-200 pl-2 text-[11px] italic text-slate-400">
                      {m.trace.map((t, ti) => <p key={ti}>· {t}</p>)}
                    </div>
                  )}
                  {m.data && (
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-white/70 p-2 text-[11px] text-slate-600">
                      {JSON.stringify(m.data, null, 2)}
                    </pre>
                  )}
                  {m.action && (
                    <button onClick={() => runAction(m.action)} disabled={busy} className="btn-primary mt-2 w-full text-xs">
                      Approve: {m.action.label}
                    </button>
                  )}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.suggestions.map((s) => (
                        <button key={s} onClick={() => send(s)} className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] text-brand-700 hover:bg-brand-100">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-slate-400">Thinking…</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-slate-200 p-3"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about inventory, orders…" className="input" />
            <button type="submit" disabled={busy} className="btn-primary">Send</button>
          </form>
        </div>
      )}
    </>
  );
}
