/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare-friendly: emit standalone server + let CDN cache static assets.
  output: 'standalone',
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

module.exports = nextConfig;
