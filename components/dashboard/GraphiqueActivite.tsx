import { memeMois, nomCourt, libelle, type Mois } from "@/lib/moisParis";

// ============================================================
// Six mois d'activité, en barres (21/09).
//
// En HTML/CSS, pas en SVG : dans un SVG, les textes (montants, mois)
// rétrécissent avec le dessin. Sur un téléphone de 390 px, ils tombaient à
// 5 px — illisibles. Ici, chaque barre est une boîte dont la hauteur est
// un pourcentage, et les textes gardent leur taille réelle à toutes les
// largeurs. Rendu côté serveur, sans bibliothèque, sans JavaScript.
//
// Deux séries seulement, toujours les mêmes couleurs : signé (anthracite)
// et encaissé (terracotta). Au-delà, un graphique ne se lit plus en deux
// secondes — c'est tout le temps qu'un artisan lui donnera.
//
// Pour les lecteurs d'écran, le graphique est décrit par un vrai tableau
// (masqué à l'écran), pas par une phrase approximative.
// ============================================================

type Point = { mois: Mois; signe: number; encaisse: number };

function euros(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
}

// Graduation "ronde" au-dessus du maximum : 1 000, 2 000, 2 500, 5 000…
// Un axe qui s'arrête à 3 847 € se lit mal.
function plafondRond(max: number): number {
  if (max <= 0) return 1000;
  const puissance = Math.pow(10, Math.floor(Math.log10(max)));
  for (const pas of [1, 2, 2.5, 5, 10]) {
    if (pas * puissance >= max) return pas * puissance;
  }
  return 10 * puissance;
}

function Barre({ valeur, max, couleur }: { valeur: number; max: number; couleur: string }) {
  // Une valeur non nulle garde toujours 2 % de hauteur : un petit montant
  // doit se voir, pas disparaître dans la ligne de base.
  const hauteur = valeur <= 0 ? 0 : Math.max(2, (valeur / max) * 100);
  return (
    <div
      aria-hidden
      className={`w-full max-w-[1.4rem] rounded-t-[4px] ${couleur}`}
      style={{ height: `${hauteur}%` }}
    />
  );
}

export function GraphiqueActivite({ points, moisActif }: { points: Point[]; moisActif: Mois }) {
  const max = plafondRond(Math.max(...points.flatMap((p) => [p.signe, p.encaisse])));
  const vide = points.every((p) => p.signe === 0 && p.encaisse === 0);

  return (
    <figure>
      <div className="flex gap-3">
        {/* Graduations, en vrais textes */}
        <div
          aria-hidden
          className="flex h-44 shrink-0 flex-col justify-between text-right font-mono text-[10px] leading-none text-steel sm:h-52"
        >
          <span>{euros(max)}</span>
          <span>{euros(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Lignes de repère : haut, milieu, base */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 sm:h-52">
            <div className="absolute inset-x-0 top-[5px] border-t border-dashed border-ink/10" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink/10" />
            <div className="absolute inset-x-0 bottom-0 border-t border-ink/15" />
          </div>

          <div className="relative flex h-44 items-end sm:h-52">
            {points.map((p) => {
              const actif = memeMois(p.mois, moisActif);
              return (
                <div
                  key={`${p.mois.annee}-${p.mois.mois}`}
                  // Le mois regardé en plein, les autres en retrait : l'œil
                  // sait tout de suite où il est.
                  className={`flex h-full flex-1 items-end justify-center gap-[3px] px-1 ${actif ? "" : "opacity-40"}`}
                >
                  <Barre valeur={p.signe} max={max} couleur="bg-ink/80" />
                  <Barre valeur={p.encaisse} max={max} couleur="bg-signal" />
                </div>
              );
            })}
            {vide && (
              <p className="absolute inset-x-0 top-1/3 px-4 text-center text-[13px] text-steel">
                Rien de signé ni d&apos;encaissé sur ces six mois pour l&apos;instant.
              </p>
            )}
          </div>

          <div aria-hidden className="mt-2 flex">
            {points.map((p) => (
              <span
                key={`l-${p.mois.annee}-${p.mois.mois}`}
                className={`flex-1 text-center font-mono text-[11px] ${
                  memeMois(p.mois, moisActif) ? "font-semibold text-ink" : "text-steel"
                }`}
              >
                {nomCourt(p.mois)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/60">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-ink/80" /> Signé (devis acceptés)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-signal" /> Encaissé (factures payées)
        </span>
      </figcaption>

      {/* 27/09 — « sr-only » sur un <div> et non sur le <table> : un tableau
          refuse de rétrécir à 1 px, et celui-ci élargissait toute la page
          Bilan sur téléphone (barre du bas coupée, défilement de côté). */}
      <div className="sr-only">
        <table>
          <caption>Montants signés et encaissés, TTC, sur les six derniers mois</caption>
          <thead>
            <tr>
              <th scope="col">Mois</th>
              <th scope="col">Signé</th>
              <th scope="col">Encaissé</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={`t-${p.mois.annee}-${p.mois.mois}`}>
                <th scope="row">{libelle(p.mois)}</th>
                <td>{euros(p.signe)}</td>
                <td>{euros(p.encaisse)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
