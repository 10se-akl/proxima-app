/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Requis sur Next.js 14.2 pour que instrumentation.ts (register()) soit
  // réellement exécuté — stabilisé par défaut seulement à partir de
  // Next.js 15. Sans ce flag, le fichier existe mais n'est jamais appelé,
  // silencieusement. Voir instrumentation.ts pour le correctif de fuseau
  // horaire que ça active (audit "vérification systématique", 10/09).
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
