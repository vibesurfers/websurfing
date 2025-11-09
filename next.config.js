/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  output: 'standalone',
  serverExternalPackages: [
    '@mastra/core',
    '@mastra/memory',
    '@mastra/loggers',
    '@mastra/pg',
    'pg-promise',
    'pg',
    'pg-query-stream',
    '@google/genai',
    'ws',
    'bufferutil',
    'utf-8-validate',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Ignore problematic file types
    config.module.rules.push({
      test: /\.(node|md|LICENSE|txt)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/[hash][ext]',
      },
    });

    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
