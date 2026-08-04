"use client";

import { use } from "react";
import { ShipmentForm } from "@/features/outbound/ShipmentForm";

export default function EditOutboundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ShipmentForm orderId={id} />;
}
