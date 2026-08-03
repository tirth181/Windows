'use client';

import { useEffect, useRef, useState } from 'react';
import { api, apiUpload, API_URL, getToken } from '@/lib/api';

interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ entityType, entityId, compact }: { entityType: string; entityId: string; compact?: boolean }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setItems(await api<Attachment[]>(`/api/attachments?entityType=${entityType}&entityId=${entityId}`));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (entityId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('entityType', entityType);
        form.append('entityId', entityId);
        form.append('file', file);
        await apiUpload('/api/attachments', form);
      }
      await load();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function download(a: Attachment) {
    // Fetch with auth then open as a blob so the Authorization header is applied.
    const res = await fetch(`${API_URL}/api/attachments/${a.id}/download`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function remove(id: string) {
    await api(`/api/attachments/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className={compact ? '' : 'card p-4'}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Documents {items.length > 0 && <span className="text-slate-400">({items.length})</span>}</p>
        <button type="button" className="btn-ghost text-xs" disabled={busy || !entityId} onClick={() => inputRef.current?.click()}>
          {busy ? 'Uploading…' : '+ Attach document'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      <ul className="mt-2 space-y-1">
        {items.length === 0 && <li className="text-xs text-slate-400">No documents yet. Attach POs, BOLs, packing lists, or photos.</li>}
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            <button className="truncate text-left text-brand-700 hover:underline" onClick={() => download(a)}>📄 {a.originalName}</button>
            <span className="ml-2 flex items-center gap-2 text-xs text-slate-400">
              {humanSize(a.size)}
              <button className="text-red-400 hover:text-red-600" onClick={() => remove(a.id)}>✕</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
