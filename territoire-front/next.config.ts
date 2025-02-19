import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*", // Capture toutes les requêtes vers /api/*
                destination: "http://localhost:8080/api/:path*", // Redirige vers ton backend Spring Boot
            },
        ];
    },
};

export default nextConfig;
