export type UseCase = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  outcome: string;
  videoSrc: string;
  posterSrc: string;
  atmosphereSrc: string;
};

export const USE_CASES: UseCase[] = [
  {
    id: "ai-command",
    title: "AI operations command",
    eyebrow: "Best for supervisors",
    summary:
      "See live inbound, outbound, and utilization — then ask LogiForge what needs attention in plain language.",
    outcome: "Floor briefings in seconds, not spreadsheets.",
    videoSrc: "/videos/usecase-ai-dashboard.mp4",
    posterSrc: "/marketing/poster-dashboard.png",
    atmosphereSrc: "/marketing/hero-warehouse.jpg",
  },
  {
    id: "inbound",
    title: "Inbound receiving that sticks",
    eyebrow: "Best for dock teams",
    summary:
      "Capture carrier, plant, material lines, batches, and weights — then post straight into on-hand inventory.",
    outcome: "Every pallet lands with a traceable home.",
    videoSrc: "/videos/usecase-inbound.mp4",
    posterSrc: "/marketing/poster-inbound.png",
    atmosphereSrc: "/marketing/use-inbound.jpg",
  },
  {
    id: "ship",
    title: "Pick, ship, and prove it",
    eyebrow: "Best for fulfillment leads",
    summary:
      "Locate inventory by bin, confirm outbound, attach packing docs, and keep a ship log customers can trust.",
    outcome: "OTIF with receipts — not hope.",
    videoSrc: "/videos/usecase-ship.mp4",
    posterSrc: "/marketing/poster-outbound.png",
    atmosphereSrc: "/marketing/use-outbound.jpg",
  },
];

export const BEST_USE_CASES = [
  {
    title: "Multi-client 3PL control tower",
    body: "Run Harborline, Summit, and every customer brand under one platform — with row-level tenant isolation.",
  },
  {
    title: "Permission-aware AI",
    body: "Operators only hear what their role can see. The assistant never leaks another warehouse’s truth.",
  },
  {
    title: "Receive-to-ship traceability",
    body: "Batch, pallet, bin, and document history from dock door to outbound trailer.",
  },
  {
    title: "Ops reports on demand",
    body: "Ship logs, inventory snapshots, inbound receipts, and zone utilization — ready to print or email.",
  },
] as const;
