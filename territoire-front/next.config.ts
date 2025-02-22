import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*", // Capture toutes les requêtes vers /api/*
                destination: "${process.env.API_URL}/api/:path*", // Redirige vers ton backend Spring Boot
            },
        ];
    },
};

export default nextConfig;
