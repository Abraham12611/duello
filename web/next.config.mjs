import path from "path";
import { fileURLToPath } from "url";

// __dirname is not defined in ESM; reconstruct it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@farcaster/miniapp-wagmi-connector": path.resolve(__dirname, "shims/empty.js"),
      "@getpara/cosmos-wallet-connectors": path.resolve(__dirname, "shims/empty.js"),
      "@getpara/solana-wallet-connectors": path.resolve(__dirname, "shims/empty.js"),
    };
    return config;
  },
};

export default nextConfig;
