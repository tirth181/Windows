import type { Metadata } from "next";
import { AiChat } from "@/features/ai/AiChat";

export const metadata: Metadata = {
  title: "AI Assistant",
};

export default function AiPage() {
  return <AiChat />;
}
