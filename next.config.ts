import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cursor cloud preview hosts during `next dev`.
  allowedDevOrigins: ["*.agent.cvm.dev", "*.cursor.sh", "localhost", "127.0.0.1"],
};

export default nextConfig;
