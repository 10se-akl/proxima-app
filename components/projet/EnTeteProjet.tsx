"use client";

import { Cordeau } from "@/components/ui/Cordeau";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { revenir, useLibelleRetour } from "@/components/navigation/LienPrecedent";
import type { Priorite, StatutProjet } from "@/types";
import { IconeLieu, IconeLoupe, IconeMessage, IconePoints, IconeRetour, IconeTelephone } from "./icones";
import { Feuille } from "./Feuille";
import { Priorite as MarquePriorite } from "@/components/ui/Priorite";
import {
  BOUTON_ICONE,
  FOCUS,
  GROUPE,
  LIBELLE,
  TITRE_ECRAN,
  TUILE_ACTION,
  puce,
} from "@/components/ui/recettes";

// ============================================================
// L'en-tête de la fiche projet (24/09).
//
// Qui, quoi, où — et les deux gestes qu'on fait le plus depuis un
// chantier : appeler le client, lancer l'itinéraire. Tout le reste des
// actions « rares » (priorité, visite, infos, clôture…) vit dans le menu
// « … », au lieu d'une rangée de boutons et de liens de même poids.
//
// Refonte (03/10, duel D lot 1) — règles 3, 4, 9 et 17 de
// docs/langage-interface.md : le nom en 30 px, sans pastille de couleur
// (l'avatar et ses teintes hors palette partent) ; « Urgent » s'écrit en
// mot, en couleur d'alerte ; les icônes sont en encre (il y en avait
// trois en terracotta) ; chaque entrée du menu fait 48 px.
// ============================================================



const ETAPES: { libelle: string; statuts: StatutProjet[] }[] = [
  { libelle: "Demande", statuts: ["nouveau", "analyse"] },
  { libelle: "Devis", statuts: ["devis_genere", "devis_envoye"] },
  { libelle: "Signé", statuts: ["accepte"] },
  { libelle: "Chantier", statuts: ["en_cours"] },
  { libelle: "Terminé", statuts: ["termine"] },
];

export type EntreeMenu =
  | { type: "action"; libelle: string; surChoisir: () => void; attention?: boolean; desactive?: boolean }
  | { type: "lien"; libelle: string; href: string }
  | { type: "priorite"; valeur: Priorite; surChoisir: (p: Priorite) => void }
  | { type: "separateur" };

/** Les entrées du menu, coupées en groupes aux séparateurs. */
function grouper(entrees: EntreeMenu[]): Exclude<EntreeMenu, { type: "separateur" }>[][] {
  const groupes: Exclude<EntreeMenu, { type: "separateur" }>[][] = [[]];
  for (const e of entrees) {
    if (e.type === "separateur") {
      if (groupes[groupes.length - 1].length > 0) groupes.push([]);
    } else if (e.type === "priorite") {
      // 25/10 — la priorité forme toujours son propre groupe, pour garder
      // son libellé visible « Priorité » (elle était mêlée à « Modifier les
      // infos du client » et perdait son titre).
      if (groupes[groupes.length - 1].length > 0) groupes.push([]);
      groupes[groupes.length - 1].push(e);
      groupes.push([]);
    } else groupes[groupes.length - 1].push(e);
  }
  return groupes.filter((g) => g.length > 0);
}

/** Design v3 (24/10) — le menu « … » devient une feuille du bas, au
 *  pouce (docs/design-v3.md, « Restes à faire ») : mêmes entrées, même
 *  ordre, mêmes actions (EntreeMenu ne change pas). La priorité en trois
 *  pastilles, les actions en lignes de 52 px groupées sur une carte, la
 *  clôture seule en bas, en orange. La feuille gère l'Échap, le focus et le
 *  geste retour ; choisir referme la feuille puis lance l'action (une autre
 *  feuille peut s'ouvrir dans le même geste, voir lib/retourFeuilles.ts). */
function Menu({ entrees }: { entrees: EntreeMenu[] }) {
  const [ouvert, setOuvert] = useState(false);

  const choisir = (f: () => void) => {
    setOuvert(false);
    f();
  };

  const ligne = `flex min-h-[3.25rem] w-full items-center px-4 text-left text-[17px] active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink disabled:opacity-60`;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label="Plus d'actions"
        onClick={() => setOuvert(true)}
        className={BOUTON_ICONE}
      >
        <IconePoints className="h-6 w-6" />
      </button>
      <Feuille ouverte={ouvert} titre="Plus d'actions" surFermer={() => setOuvert(false)}>
        <div className="flex flex-col gap-4">
          {grouper(entrees).map((groupe, g) => {
            // La priorité : trois pastilles, l'active à l'encre.
            if (groupe.length === 1 && groupe[0].type === "priorite") {
              const e = groupe[0];
              return (
                <div key={g}>
                  <p className={LIBELLE} id="titre-priorite">
                    Priorité
                  </p>
                  <div role="radiogroup" aria-labelledby="titre-priorite" className="flex flex-wrap gap-2">
                    {(["urgent", "important", "normal"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={e.valeur === p}
                        onClick={() => choisir(() => e.surChoisir(p))}
                        className={`${puce(e.valeur === p)} min-h-12`}
                      >
                        {p === "urgent" ? "Urgent" : p === "important" ? "Important" : "Normal"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={g} className={GROUPE}>
                {groupe.map((e, i) => {
                  if (e.type === "priorite") {
                    // Une priorité mêlée à d'autres entrées (pas le cas
                    // aujourd'hui) : une ligne de pastilles dans le groupe.
                    return (
                      <div key={i} role="radiogroup" aria-label="Priorité" className="flex flex-wrap gap-2 px-4 py-3">
                        {(["urgent", "important", "normal"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={e.valeur === p}
                            onClick={() => choisir(() => e.surChoisir(p))}
                            className={`${puce(e.valeur === p)} min-h-12`}
                          >
                            {p === "urgent" ? "Urgent" : p === "important" ? "Important" : "Normal"}
                          </button>
                        ))}
                      </div>
                    );
                  }
                  if (e.type === "lien") {
                    return (
                      <Link key={i} href={e.href} className={`${ligne} text-ink`}>
                        {e.libelle}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={e.desactive}
                      onClick={() => choisir(e.surChoisir)}
                      className={`${ligne} ${e.attention ? "font-semibold text-signal-fonce" : "text-ink"}`}
                    >
                      {e.libelle}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Feuille>
    </>
  );
}

export function EnTeteProjet({
  nomClient,
  sousTitre,
  telephone,
  adresse,
  priorite,
  statut,
  entreesMenu,
  surMessage,
  surChercher,
}: {
  /** Refonte (03/10, duel D lot 3) — la loupe, seulement quand le Carnet
   *  a plus de cinq entrées : elle mène à sa recherche. */
  surChercher?: () => void;
  /** 26/09 (lot D) — ouvre la feuille « Message au client ». Avec Appeler
   *  et Itinéraire : les trois gestes les plus fréquents depuis un chantier. */
  surMessage?: () => void;
  nomClient: string;
  sousTitre: string;
  telephone: string | null;
  adresse: string | null;
  priorite: Priorite;
  statut: StatutProjet;
  entreesMenu: EntreeMenu[];
}) {
  const etape = Math.max(0, ETAPES.findIndex((e) => e.statuts.includes(statut)));
  const router = useRouter();
  // 08/10 (passe de finition) — on ouvre la fiche depuis l'accueil, le
  // planning, Argent, les notes… et « ‹ Projets » menait toujours à la
  // liste. Le lien dit maintenant d'où l'on vient et y ramène ; d'ailleurs
  // (lien direct, notification), il reste « ‹ Projets ».
  const libelleRetour = useLibelleRetour();
  const classeRetour = `-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full pl-1 pr-3 text-base font-medium text-steel active:bg-ink/10 sm:hover:text-ink motion-safe:transition-colors ${FOCUS}`;
  // Atelier (22/10) : les trois gestes en creux, posés sur le fond.
  // Design v3 (24/10) : la tuile d'action commune (icône au-dessus, mot
  // dessous, 64 px) ; sur ordinateur, icône et mot sur une ligne.
  const tuile = `${TUILE_ACTION} py-2 sm:min-h-12 sm:flex-row sm:gap-2 sm:px-5`;
  const etapeLisible = `Étape ${etape + 1} sur ${ETAPES.length}`;

  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        {libelleRetour ? (
          <button type="button" onClick={() => revenir(router)} className={classeRetour}>
            <IconeRetour className="h-5 w-5" /> {libelleRetour}
          </button>
        ) : (
          <Link href="/dashboard/demandes" className={classeRetour}>
            <IconeRetour className="h-5 w-5" /> Projets
          </Link>
        )}
        <div className="-mr-2 flex items-center">
          {surChercher && (
            <button
              type="button"
              onClick={surChercher}
              aria-label="Chercher dans ce projet"
              className={BOUTON_ICONE}
            >
              <IconeLoupe className="h-6 w-6" />
            </button>
          )}
          <Menu entrees={entreesMenu} />
        </div>
      </div>

      {/* Atelier (22/10) : qui, les trois gestes et l'avancement, posés sur
          le fond (plus de carte bleu nuit à halos). */}
      <div className="mt-2">
        <div>
          {/* Design v3 (24/10) : le nom passe à la ligne plutôt que d'être
              coupé ; « quoi · où » aussi (deux lignes au plus). */}
          <h1 className={`break-words ${TITRE_ECRAN}`}>{nomClient}</h1>
          {(sousTitre || priorite !== "normal") && (
            <p className="mt-1.5 flex min-w-0 items-start gap-2 text-[17px] leading-snug text-steel">
              {/* 25/10 — la priorité s'écrit comme dans les listes : point + mot. */}
              <MarquePriorite niveau={priorite} className="mt-0.5" />
              <span className="line-clamp-2 min-w-0">{sousTitre}</span>
            </p>
          )}

          {/* 27/09 — Sur téléphone, les trois gestes du chantier tiennent sur
              une ligne, en trois boutons égaux (« Itinéraire » partait seul à
              la ligne). */}
          {(telephone || adresse || surMessage) && (
            <div className="mt-5 grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:flex-wrap">
              {telephone && (
                <a href={`tel:${telephone.replace(/\s/g, "")}`} className={tuile}>
                  <IconeTelephone className="h-6 w-6 sm:h-5 sm:w-5" /> Appeler
                </a>
              )}
              {surMessage && (
                <button type="button" onClick={surMessage} className={tuile}>
                  <IconeMessage className="h-6 w-6 sm:h-5 sm:w-5" /> Message
                </button>
              )}
              {adresse && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${tuile} max-w-full`}
                >
                  <IconeLieu className="h-6 w-6 shrink-0 sm:h-5 sm:w-5" />
                  Itinéraire
                </a>
              )}
            </div>
          )}

          {/* La progression : cinq étapes, la courante nommée. */}
          {/* Design v3 (24/10) : l'étape se lit en clair sous le cordeau
              (« Chantier · étape 4 sur 5 ») ; sur ordinateur, les cinq
              étapes nommées, la courante à l'encre. */}
          <div className="mt-6" role="group" aria-label={`${ETAPES[etape].libelle}, ${etapeLisible.toLowerCase()}`}>
            <Cordeau statut={statut} taille="grand" />
            <div className="mt-2 hidden justify-between text-[15px] sm:flex" aria-hidden>
              {ETAPES.map((e, i) => (
                <span key={e.libelle} className={i === etape ? "font-semibold text-ink" : "text-steel"}>
                  {e.libelle}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[15px] sm:hidden" aria-hidden>
              <span className="font-semibold text-ink">{ETAPES[etape].libelle}</span>
              <span className="text-steel"> · {etapeLisible.toLowerCase()}</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
