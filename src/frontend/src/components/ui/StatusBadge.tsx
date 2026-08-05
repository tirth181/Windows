import { AlertTriangle, Ban, CheckCircle2, Clock, PauseCircle, Package } from "lucide-react";
import { Badge } from "./Badge";
import type { InboundStatus, InventoryStatus, OutboundStatus } from "@/types";

type AnyStatus = InventoryStatus | InboundStatus | OutboundStatus | string;

function config(status: AnyStatus) {
  switch (status) {
    case "Available":
    case "Received":
    case "Shipped":
    case "Connected":
    case "Active":
      return {
        tone: "success" as const,
        icon: CheckCircle2,
      };
    case "Partial":
    case "Picking":
    case "Pending":
    case "Trial":
      return {
        tone: "warning" as const,
        icon: AlertTriangle,
      };
    case "Hold":
    case "Damaged":
    case "Error":
    case "Suspended":
      return {
        tone: "danger" as const,
        icon: Ban,
      };
    case "Reserved":
    case "Draft":
      return {
        tone: "steel" as const,
        icon: Clock,
      };
    case "Cancelled":
    case "Disconnected":
      return {
        tone: "neutral" as const,
        icon: PauseCircle,
      };
    default:
      return {
        tone: "neutral" as const,
        icon: Package,
      };
  }
}

export function StatusBadge({ status }: { status: AnyStatus }) {
  const { tone, icon: Icon } = config(status);
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden />
      <span>{status}</span>
    </Badge>
  );
}
