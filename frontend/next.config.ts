import type { NextConfig } from "next";

// API proxying is handled by src/proxy.ts (Next.js 16 proxy file convention).
// The rewrites() approach caused ECONNRESET with Turbopack dev servers.

const nextConfig: NextConfig = {};

export default nextConfig;
