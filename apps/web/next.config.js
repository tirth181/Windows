// The browser only reaches the forwarded web port (3000), not the API port (4000).
// So the client calls the API same-origin (empty base URL) and Next.js proxies
// /api/* and /health to the backend server-side via rewrites.
const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Empty => same-origin requests, resolved by the rewrites below.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_TARGET}/api/:path*` },
      { source: '/health', destination: `${API_TARGET}/health` },
    ];
  },
};

module.exports = nextConfig;
