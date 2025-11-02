import type { NextConfig } from "next";

if (!process.env.LIGHTNINGCSS_FORCE_WASM) {
  process.env.LIGHTNINGCSS_FORCE_WASM = "1";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
