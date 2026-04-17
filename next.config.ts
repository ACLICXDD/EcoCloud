import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the new top-level key
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
