import type { Metadata } from "next";
import { ShipmentForm } from "@/features/outbound/ShipmentForm";

export const metadata: Metadata = {
  title: "New shipment",
};

export default function NewOutboundPage() {
  return <ShipmentForm />;
}
