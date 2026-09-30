import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer'],
  turbopack: {
    root: resolve(__dirname, '..'),
  },
};

export default nextConfig;
