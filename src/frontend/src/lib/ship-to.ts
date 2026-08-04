import type { OutboundOrder } from "@/types";

/** Build a single-line ship-to summary from structured address fields. */
export function formatShipTo(
  order: Pick<
    OutboundOrder,
    "address" | "state" | "postalCode" | "country" | "destination"
  >,
): string {
  const locality = [order.state, order.postalCode].filter(Boolean).join(" ");
  const parts = [order.address, locality, order.country]
    .map((p) => p?.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  return order.destination?.trim() || "";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
