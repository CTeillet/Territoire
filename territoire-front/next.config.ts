import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Fonds de carte Leaflet : seul domaine externe chargé par le navigateur (les liens Google Maps, Plans
// ou Waze sont des navigations, non concernées). Next.js insère des scripts et des styles inline sans
// nonce : 'unsafe-inline' reste nécessaire, mais un script injecté ne peut ni charger de code d'un
// autre domaine ni y envoyer de données (connect-src, img-src, form-action).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Les liens personnels /m/<jeton> ne doivent jamais partir dans le Referer : seule l'origine est envoyée
  // aux autres domaines (les tuiles OpenStreetMap en demandent une)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Géolocalisation : position de l'utilisateur sur la carte de ses territoires
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
  // Ignoré par les navigateurs en HTTP (développement local)
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // Pas de Cache-Control global : Next.js sert déjà /_next/static en "immutable", et les pages
  // comme les réponses /api/* ne doivent pas être mises en cache par le navigateur.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          ...securityHeaders,
        ],
      },
    ];
  },
  // En production, nginx envoie /api/ directement au back : cette réécriture ne sert qu'en développement
  // (npm run dev, back local) et aux accès directs au conteneur (API_URL de .env.production, réseau Docker).
  // L'adresse est lue au build et figée dans l'image : la changer demande de reconstruire le front.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
  output: "standalone",
};

export default nextConfig;
