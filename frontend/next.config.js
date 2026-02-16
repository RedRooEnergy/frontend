/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/__audit/:path*",
        destination: "/audit/:path*",
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid filesystem cache corruption causing missing chunks in dev.
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
