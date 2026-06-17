/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Always serve fresh HTML documents so a new deploy shows up immediately
  // (no stale UI from a cached page). Hashed assets under /_next/static keep
  // their long-lived immutable caching, so this doesn't hurt performance.
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store, must-revalidate" },
    ];
    return [
      { source: "/", headers: noStore },
      { source: "/room/:code*", headers: noStore },
    ];
  },
};

export default nextConfig;
