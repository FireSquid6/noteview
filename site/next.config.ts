import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
