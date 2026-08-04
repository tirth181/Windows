import type { Metadata } from "next";
import { ReceivingForm } from "@/features/inbound/ReceivingForm";

export const metadata: Metadata = {
  title: "New receiving",
};

export default function NewInboundPage() {
  return <ReceivingForm />;
}
