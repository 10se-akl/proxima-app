// ============================================================
// Ressources du PDF des devis (17/09), copiées de node_modules vers
// public/ avant chaque `npm run dev` et `npm run build` (Vercel compris).
//
// - pdf.js : affiche les pages du vrai PDF dans l'aperçu. Chargé par le
//   navigateur tel quel depuis /pdfjs/, sans passer par webpack — sa
//   version "legacy" embarque ce qu'il faut pour les navigateurs un peu
//   anciens (Safari des iPhone qui ne sont plus à jour).
// - Polices Inter et Manrope : celles de l'application, pour que le PDF
//   ait la même identité que l'écran. Format WOFF (le WOFF2 n'est pas lu
//   par le moteur PDF), jeu "latin" : accents français, €, espaces fines.
//
// Rien de tout cela n'est versionné (voir .gitignore) : la version
// installée par npm fait foi, sans copie à tenir à jour à la main.
// ============================================================
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(racine, "node_modules");
const pub = join(racine, "public");

const copies = [
  ["pdfjs-dist/legacy/build/pdf.min.mjs", "pdfjs/pdf.min.mjs"],
  ["pdfjs-dist/legacy/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs"],
  ["@fontsource/inter/files/inter-latin-400-normal.woff", "fonts/pdf/inter-400.woff"],
  ["@fontsource/inter/files/inter-latin-500-normal.woff", "fonts/pdf/inter-500.woff"],
  ["@fontsource/inter/files/inter-latin-600-normal.woff", "fonts/pdf/inter-600.woff"],
  ["@fontsource/inter/files/inter-latin-700-normal.woff", "fonts/pdf/inter-700.woff"],
  ["@fontsource/manrope/files/manrope-latin-700-normal.woff", "fonts/pdf/manrope-700.woff"],
  ["@fontsource/manrope/files/manrope-latin-800-normal.woff", "fonts/pdf/manrope-800.woff"],
];

for (const [source, cible] of copies) {
  const destination = join(pub, cible);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(nm, source), destination);
}

console.log(`Ressources PDF copiées (${copies.length} fichiers).`);
