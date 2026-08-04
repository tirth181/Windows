"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ReceivingForm } from "@/features/inbound/ReceivingForm";

function InboundDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const viewOnly = searchParams.get("view") === "1";
  return <ReceivingForm loadId={id} viewOnly={viewOnly} />;
}

export default function EditInboundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Loading inbound…</p>}
    >
      <InboundDetail id={id} />
    </Suspense>
  );
}
