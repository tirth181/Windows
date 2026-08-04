const STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  available: { label: 'Available', className: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  empty: { label: 'Empty', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  reserved: { label: 'Reserved', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  damaged: { label: 'Damaged', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  blocked: { label: 'Blocked', className: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-500' },
  quality_hold: { label: 'Quality Hold', className: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
