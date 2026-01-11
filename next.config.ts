import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.ts is enabled by default in Next.js 16
  serverExternalPackages: ['dockerode', 'ssh2', 'docker-modem'],
};

export default nextConfig;
