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
  // Vérification du 22/10 : aucune page ne refusait d'être affichée dans le
  // cadre d'un autre site. La page de signature d'un devis pouvait donc être
  // glissée sous une fausse page (« clic piégé »). Compyo ne s'affiche
  // lui-même dans aucun cadre (le seul <iframe> du site montre une vidéo
  // extérieure), donc SAMEORIGIN ne casse rien.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
