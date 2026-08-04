"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ReceivingForm } from "@/features/inbound/ReceivingForm";

export default function EditInboundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const viewOnly = searchParams.get("view") === "1";
  return <ReceivingForm loadId={id} viewOnly={viewOnly} />;
}
