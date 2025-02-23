import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
                    { key: "Service-Worker-Allowed", value: "/" }
                ],
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
