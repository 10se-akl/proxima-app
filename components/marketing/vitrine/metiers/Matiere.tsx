import type { CSSProperties } from "react";

// ============================================================
// La matière de chaque métier (24/09) — ce que la carte montre tant qu'il
// n'y a pas de photo exclusive (voir ../photos.ts).
//
// Une matière plutôt qu'une icône : la tuile du couvreur, la brique du
// maçon, le fil de cuivre de l'électricien, l'eau du pisciniste. Un
// artisan reconnaît sa matière avant de lire son nom. Tout est dessiné ici,
// en CSS et en SVG, sans aucun fichier image : les textures au grain
// (bois, enduit, eau) sont des filtres SVG calculés une fois par le
// navigateur, jamais animés.
//
// Les couleurs restent dans la famille de Compyo — terres, sables,
// cuivres, ardoises, un vert et un bleu très éteints — pour que les
// dix-sept cartes côte à côte forment une seule palette.
// ============================================================

function svg(contenu: string, largeur: number, hauteur: number): string {
  const source = `<svg xmlns='http://www.w3.org/2000/svg' width='${largeur}' height='${hauteur}' viewBox='0 0 ${largeur} ${hauteur}'>${contenu}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(source)}")`;
}

const BRIQUES = svg(
  "<rect width='96' height='48' fill='#d4c1ab'/>" +
    "<rect x='1' y='1' width='45' height='21' rx='1.5' fill='#a9563b'/>" +
    "<rect x='49' y='1' width='46' height='21' rx='1.5' fill='#b66345'/>" +
    "<rect x='-23' y='25' width='45' height='21' rx='1.5' fill='#9c4a33'/>" +
    "<rect x='25' y='25' width='46' height='21' rx='1.5' fill='#b05b3e'/>" +
    "<rect x='73' y='25' width='46' height='21' rx='1.5' fill='#9c4a33'/>" +
    "<rect x='1' y='1' width='45' height='3' fill='#fff' opacity='0.08'/>" +
    "<rect x='49' y='1' width='46' height='3' fill='#fff' opacity='0.08'/>",
  96,
  48
);

const bois = (base: string, graine: string, lames: number) =>
  svg(
    `<filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.22 0.009' numOctaves='3' seed='${lames}'/>` +
      `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.62'/></filter>` +
      `<rect width='400' height='500' fill='${base}'/>` +
      `<rect width='400' height='500' fill='${graine}' filter='url(#f)'/>` +
      Array.from({ length: lames }, (_, i) => `<rect x='${(i + 1) * (400 / (lames + 1))}' width='1.5' height='500' fill='#000' opacity='0.22'/>`).join(""),
    400,
    500
  );

const CARRELAGE = svg(
  "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ece8e1'/><stop offset='1' stop-color='#d4cdc2'/></linearGradient></defs>" +
    "<rect width='120' height='120' fill='#bdb4a7'/>" +
    "<rect x='1.5' y='1.5' width='117' height='117' rx='1' fill='url(#g)'/>" +
    "<path d='M8 90 C 40 70 60 96 112 60' stroke='#b9afa2' stroke-width='0.8' fill='none' opacity='0.7'/>",
  120,
  120
);

const STRATES = svg(
  "<rect width='400' height='500' fill='#5a3d2a'/>" +
    "<path d='M0 0H400V110C330 125 250 95 170 112S40 118 0 104Z' fill='#c9ab87'/>" +
    "<path d='M0 104C40 118 110 110 170 112S330 125 400 110V200C320 214 260 186 180 204S50 206 0 194Z' fill='#a8835f'/>" +
    "<path d='M0 194C50 206 120 196 180 204S320 214 400 200V300C330 316 240 288 160 304S40 300 0 292Z' fill='#8a6446'/>" +
    "<path d='M0 292C40 300 90 296 160 304S330 316 400 300V400C320 410 250 392 170 404S50 404 0 396Z' fill='#6f4c34'/>" +
    Array.from({ length: 70 }, (_, i) => {
      const x = (i * 97) % 400;
      const y = 120 + ((i * 53) % 370);
      return `<ellipse cx='${x}' cy='${y}' rx='${2 + (i % 4)}' ry='${1.5 + (i % 3)}' fill='#d8c2a4' opacity='0.35'/>`;
    }).join(""),
  400,
  500
);

const ENDUIT = svg(
  "<filter id='r' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' seed='7'/>" +
    "<feDiffuseLighting lighting-color='#efe3d1' surfaceScale='2.2'><feDistantLight azimuth='225' elevation='38'/></feDiffuseLighting></filter>" +
    "<rect width='300' height='375' filter='url(#r)'/>",
  300,
  375
);

const AIR = svg(
  "<rect width='400' height='500' fill='#d5dfe3'/>" +
    Array.from({ length: 9 }, (_, i) => {
      const y = 40 + i * 52;
      return `<path d='M-20 ${y} C 90 ${y - 40} 170 ${y + 40} 260 ${y} S 380 ${y - 30} 440 ${y}' stroke='#fff' stroke-width='${i % 3 === 0 ? 3 : 1.5}' fill='none' opacity='${0.35 + (i % 3) * 0.15}'/>`;
    }).join(""),
  400,
  500
);

const EAU = svg(
  "<filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.018 0.028' numOctaves='2' seed='3'/>" +
    "<feColorMatrix type='luminanceToAlpha'/><feComponentTransfer><feFuncA type='table' tableValues='1 0.1 0 0 0'/></feComponentTransfer>" +
    "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.75 0'/></filter>" +
    "<defs><linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7fb3b8'/><stop offset='1' stop-color='#3d7580'/></linearGradient></defs>" +
    "<rect width='400' height='500' fill='url(#p)'/>" +
    "<rect width='400' height='500' filter='url(#c)'/>",
  400,
  500
);

const MATIERES: Record<string, CSSProperties> = {
  electricien: {
    background:
      "repeating-linear-gradient(118deg, transparent 0 22px, #d68452 22px 25px, #7a3e20 25px 26px, transparent 26px 34px, #5c7080 34px 36px, transparent 36px 58px), linear-gradient(160deg, #2c3139, #14171b)",
  },
  chauffagiste: {
    background:
      "radial-gradient(90% 55% at 50% 110%, rgb(201 107 74 / 0.55), transparent 70%), repeating-linear-gradient(90deg, #d9d0c3 0 3px, #f6f2ec 9px, #e4dccf 17px, #b9ad9d 22px, #cfc5b7 26px)",
  },
  peintre: {
    background:
      "linear-gradient(104deg, transparent 0 30%, #c96b4a 30.3% 47%, transparent 47.3%), linear-gradient(104deg, transparent 0 46%, #e8c5b6 46.3% 64%, transparent 64.3%), linear-gradient(104deg, transparent 0 63%, #4f5f6c 63.3% 82%, transparent 82.3%), linear-gradient(180deg, #f1ebe3, #e2d9cd)",
  },
  couvreur: {
    background:
      "radial-gradient(circle at 50% 0, #bd6242 0 55%, #7c3520 57% 61%, transparent 62%) 0 0 / 44px 30px, radial-gradient(circle at 50% 0, #c9714f 0 55%, #7c3520 57% 61%, transparent 62%) 22px 15px / 44px 30px, #8c3f26",
  },
  plombier: {
    background:
      "linear-gradient(180deg, transparent 0 28%, #7e4224 28%, #e8a97c 30.5%, #b86a40 33.5%, #6f3a1f 36%, transparent 36%), linear-gradient(180deg, transparent 0 58%, #7e4224 58%, #e8a97c 60.5%, #b86a40 63.5%, #6f3a1f 66%, transparent 66%), linear-gradient(90deg, transparent 0 70%, #7e4224 70%, #e8a97c 72.5%, #b86a40 75.5%, #6f3a1f 78%, transparent 78%), repeating-linear-gradient(0deg, #ebe6de 0 46px, #d3cbc0 46px 48px), repeating-linear-gradient(90deg, #ebe6de 0 46px, #d3cbc0 46px 48px)",
    backgroundBlendMode: "normal, normal, normal, multiply, normal",
  },
  macon: { background: `${BRIQUES} 0 0 / 96px 48px, #a9563b` },
  menuisier: { background: `${bois("#c79c6c", "#6d4524", 6)} center / cover` },
  carreleur: {
    background: `linear-gradient(125deg, rgb(255 255 255 / 0.35), transparent 40%), ${CARRELAGE} 0 0 / 72px 72px`,
  },
  serrurier: {
    background:
      "radial-gradient(80% 60% at 30% 20%, rgb(255 255 255 / 0.35), transparent 60%), repeating-linear-gradient(90deg, #aeb4ba 0 1px, #9ba2a9 1px 2px, #c0c6cb 2px 3px, #a7adb3 3px 5px), #a8aeb4",
  },
  paysagiste: {
    background:
      "linear-gradient(180deg, rgb(255 255 255 / 0.18), transparent 45%), repeating-linear-gradient(98deg, #5d7550 0 46px, #6c8660 46px 92px), #62795a",
  },
  terrassier: { background: `${STRATES} center / cover` },
  facadier: {
    background: `linear-gradient(90deg, rgb(0 0 0 / 0.12), transparent 30%), ${ENDUIT} center / 300px 375px, #e6d8c4`,
  },
  climaticien: { background: `${AIR} center / cover` },
  vitrier: {
    background:
      "linear-gradient(118deg, rgb(255 255 255 / 0.55) 0 7%, transparent 7% 26%, rgb(255 255 255 / 0.28) 26% 29%, transparent 29% 62%, rgb(255 255 255 / 0.18) 62% 72%, transparent 72%), linear-gradient(90deg, transparent 0 48.5%, #3a4148 48.5% 51.5%, transparent 51.5%), linear-gradient(180deg, #a9bcc8, #dde6eb 60%, #c7d3da)",
  },
  charpentier: { background: `${bois("#9a6440", "#3f2412", 3)} center / cover` },
  plaquiste: {
    background:
      "radial-gradient(circle, #a5a099 0 1.3px, transparent 1.8px) 12px 18px / 36px 44px, linear-gradient(90deg, transparent 0 46%, #f4f2ee 46% 54%, transparent 54%) 0 0 / 50% 100%, #e5e2dc",
  },
  pisciniste: {
    background: `linear-gradient(0deg, #e9e4dc 0 7%, #c7bfb2 7% 7.6%, transparent 7.6%), ${EAU} center / cover`,
  },
};

/** Les métiers aux matières claires : leur dessin et leur texte passent en
 *  foncé pour rester lisibles. */
export const MATIERES_CLAIRES = new Set(["chauffagiste", "peintre", "carreleur", "serrurier", "facadier", "climaticien", "vitrier", "plaquiste"]);

export function Matiere({ id, className = "" }: { id: string; className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 ${className}`}>
      <div className="absolute inset-0 dark:brightness-[0.86]" style={MATIERES[id] ?? { background: "#8a8178" }} />
      {/* La lumière : un reflet en haut à gauche, une ombre douce en bas. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_12%_0%,rgb(255_255_255/0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(20_14_10/0.55),transparent_48%)]" />
    </div>
  );
}
