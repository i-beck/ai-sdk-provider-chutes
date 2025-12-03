/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features if needed
  experimental: {
    // serverActions: true,
  },
  // Ensure environment variables are available
  env: {
    CHUTES_API_KEY: process.env.CHUTES_API_KEY,
  },
};

module.exports = nextConfig;

