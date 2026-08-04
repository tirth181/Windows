import type { Metadata } from "next";
import { InventoryGrid } from "@/features/inventory/InventoryGrid";

export const metadata: Metadata = {
  title: "Inventory",
};

export default function InventoryPage() {
  return <InventoryGrid />;
}
