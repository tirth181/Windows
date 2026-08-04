"use client";

import { use } from "react";
import { ReceivingForm } from "@/features/inbound/ReceivingForm";

export default function EditInboundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReceivingForm loadId={id} />;
}
