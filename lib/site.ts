// Source unique pour l'URL publique du site — utilisée par layout.tsx,
// robots.ts, sitemap.ts, mentions-legales et opengraph-image.tsx. Avant
// cette extraction, l'URL était dupliquée en dur dans plusieurs fichiers
// (relevé lors de l'audit du 12/08) : un changement de domaine (ex. passage
// à un .fr) obligeait à la modifier à plusieurs endroits, avec le risque
// d'en oublier un. NEXT_PUBLIC_SITE_URL est déjà utilisé ailleurs (voir
// lib/email.ts) ; on garde le même nom de variable pour rester cohérent.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://compyo.vercel.app";
