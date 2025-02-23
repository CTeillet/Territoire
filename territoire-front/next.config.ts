import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
