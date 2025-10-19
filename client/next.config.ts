import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "slemvconhlqgxarzfwzk.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/v0/b/**/o/**",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.app",
        port: "",
        pathname: "/o/**",
      },
    ],
  },
};

export default nextConfig;
