import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pas de Cache-Control global : Next.js sert déjà /_next/static en "immutable", et les pages
  // comme les réponses /api/* ne doivent pas être mises en cache par le navigateur.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Service-Worker-Allowed", value: "/" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*", // Capture toutes les requêtes vers /api/*
        destination: process.env.API_URL + "/api/:path*",
      },
    ];
  },
  output: "standalone",
};

export default nextConfig;
