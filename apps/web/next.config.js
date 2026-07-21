/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  // Cloudflare-friendly: emit standalone server + let CDN cache static assets.
  output: 'standalone',
  // Monorepo: trace deps from the repo root so the standalone bundle keeps the
  // apps/web/server.js layout the Dockerfile expects and includes workspace pkgs.
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

module.exports = nextConfig;
