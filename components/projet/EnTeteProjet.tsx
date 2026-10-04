"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Priorite, StatutProjet } from "@/types";
import { IconeLieu, IconeLoupe, IconeMessage, IconePoints, IconeRetour, IconeTelephone } from "./icones";

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

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

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

function Menu({ entrees }: { entrees: EntreeMenu[] }) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", touche);
    zone.current?.querySelector<HTMLElement>("[role=menuitem], [role=menuitemradio]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  const choisir = (f: () => void) => {
    setOuvert(false);
    f();
  };

  const item = "flex min-h-12 w-full items-center px-4 text-left text-base active:bg-ink/10 sm:hover:bg-ink/5 focus-visible:bg-ink/10 focus-visible:outline-none";

  return (
    <div ref={zone} className="relative">
      <button
        ref={bouton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Plus d'actions"
        onClick={() => setOuvert((v) => !v)}
        className={`grid h-12 w-12 place-items-center rounded-full text-ink active:bg-ink/10 sm:hover:bg-ink/5 ${FOCUS}`}
      >
        <IconePoints className="h-6 w-6" />
      </button>
      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-ink/15"
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const items = [...(zone.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled]), [role=menuitemradio]") ?? [])];
            const i = items.indexOf(document.activeElement as HTMLElement);
            items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          }}
        >
          {entrees.map((e, i) => {
            if (e.type === "separateur") return <div key={i} role="separator" className="my-1.5 border-t border-ink/15" />;
            if (e.type === "priorite") {
              return (
                <div key={i} className="px-3 py-2">
                  <p className="mb-1.5 text-sm text-steel">Priorité</p>
                  <div className="grid grid-cols-3 gap-1 rounded-2xl bg-ink/10 p-1">
                    {(["urgent", "important", "normal"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        role="menuitemradio"
                        aria-checked={e.valeur === p}
                        onClick={() => choisir(() => e.surChoisir(p))}
                        className={`min-h-12 rounded-xl px-1 text-sm font-semibold ${FOCUS} ${
                          e.valeur === p ? "bg-surface text-ink ring-1 ring-ink/15" : "text-steel"
                        }`}
                      >
                        {p === "urgent" ? "Urgent" : p === "important" ? "Important" : "Normal"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            if (e.type === "lien") {
              return (
                <Link key={i} href={e.href} role="menuitem" className={`${item} text-ink`}>
                  {e.libelle}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={e.desactive}
                onClick={() => choisir(e.surChoisir)}
                className={`${item} disabled:opacity-60 ${
                  e.attention ? "font-semibold text-signal-fonce dark:text-signal-clair" : "text-ink"
                }`}
              >
                {e.libelle}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
  // Refonte visuelle (04/10) : les trois gestes sont posés sur la carte
  // bleu nuit, en verre clair.
  const tuile = `flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 px-2 py-2 text-sm font-semibold text-white ring-1 ring-white/15 active:bg-white/20 motion-safe:transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`;

  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/demandes"
          className={`-ml-2 inline-flex min-h-12 items-center gap-1 rounded-xl pl-1 pr-3 text-base text-steel ${FOCUS}`}
        >
          <IconeRetour className="h-5 w-5" /> Projets
        </Link>
        <div className="-mr-2 flex items-center">
          {surChercher && (
            <button
              type="button"
              onClick={surChercher}
              aria-label="Chercher dans ce projet"
              className={`grid h-12 w-12 place-items-center rounded-full text-ink active:bg-ink/10 sm:hover:bg-ink/5 ${FOCUS}`}
            >
              <IconeLoupe className="h-6 w-6" />
            </button>
          )}
          <Menu entrees={entreesMenu} />
        </div>
      </div>

      {/* Refonte visuelle (04/10, maquette d'Axel) : qui, les trois gestes
          et l'avancement dans une carte bleu nuit, comme l'en-tête de
          l'accueil. La barre de retour et le menu restent au-dessus. */}
      <div className="relative mt-1 overflow-hidden rounded-3xl bg-nuit px-5 py-5 text-white sm:px-7 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--c-signal)/0.32),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(var(--c-bleu)/0.18),transparent_55%)]"
        />
        <div className="relative">
          <h1 className="truncate font-display text-3xl font-bold">{nomClient}</h1>
          {(sousTitre || priorite !== "normal") && (
            <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-white/70">
              {priorite === "urgent" && (
                <span className="shrink-0 rounded-full bg-signal px-2.5 py-0.5 text-xs font-semibold text-white">Urgent</span>
              )}
              {priorite === "important" && (
                <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">Important</span>
              )}
              <span className="truncate">{sousTitre}</span>
            </p>
          )}

          {/* 27/09 — Sur téléphone, les trois gestes du chantier tiennent sur
              une ligne, en trois boutons égaux (« Itinéraire » partait seul à
              la ligne). */}
          {(telephone || adresse || surMessage) && (
            <div className="mt-4 grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:flex-wrap">
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
                  <span className="truncate">Itinéraire</span>
                </a>
              )}
            </div>
          )}

          {/* La progression : cinq étapes, la courante nommée. */}
          <div className="mt-5" aria-label={`Étape : ${ETAPES[etape].libelle}`}>
            <div className="flex gap-1" aria-hidden>
              {ETAPES.map((e, i) => (
                <span key={e.libelle} className={`h-1.5 flex-1 rounded-full ${i <= etape ? "bg-signal" : "bg-white/15"}`} />
              ))}
            </div>
            <div className="mt-1.5 hidden justify-between text-sm sm:flex" aria-hidden>
              {ETAPES.map((e, i) => (
                <span key={e.libelle} className={i === etape ? "font-semibold text-white" : "text-white/55"}>
                  {e.libelle}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-sm font-semibold text-white sm:hidden">{ETAPES[etape].libelle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
