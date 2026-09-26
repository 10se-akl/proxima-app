"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { Priorite, StatutProjet } from "@/types";
import { IconeLieu, IconeMessage, IconePoints, IconeRetour, IconeTelephone } from "./icones";

// ============================================================
// L'en-tête de la fiche projet (24/09).
//
// Qui, quoi, où — et les deux gestes qu'on fait le plus depuis un
// chantier : appeler le client, lancer l'itinéraire. Tout le reste des
// actions « rares » (priorité, visite, infos, clôture…) vit dans le menu
// « … », au lieu d'une rangée de boutons et de liens de même poids.
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

  return (
    <div ref={zone} className="relative">
      <button
        ref={bouton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Plus d'actions"
        onClick={() => setOuvert((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-surface text-ink/70 transition hover:border-ink/25 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
      >
        <IconePoints className="h-5 w-5" />
      </button>
      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-[17rem] overflow-hidden rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-ink/10"
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const items = [...(zone.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled]), [role=menuitemradio]") ?? [])];
            const i = items.indexOf(document.activeElement as HTMLElement);
            items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          }}
        >
          {entrees.map((e, i) => {
            if (e.type === "separateur") return <div key={i} role="separator" className="my-1.5 border-t border-ink/[0.07]" />;
            if (e.type === "priorite") {
              return (
                <div key={i} className="px-3 py-2">
                  <p className="mb-1.5 text-[12px] text-ink/50">Priorité</p>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink/[0.05] p-1">
                    {(["urgent", "important", "normal"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        role="menuitemradio"
                        aria-checked={e.valeur === p}
                        onClick={() => choisir(() => e.surChoisir(p))}
                        className={`rounded-lg px-1 py-1.5 text-[12.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                          e.valeur === p ? "bg-surface text-ink shadow-sm" : "text-ink/55 hover:text-ink"
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
                <Link
                  key={i}
                  href={e.href}
                  role="menuitem"
                  className="block px-4 py-2.5 text-[14px] text-ink transition hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06] focus-visible:outline-none"
                >
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
                className={`block w-full px-4 py-2.5 text-left text-[14px] transition hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06] focus-visible:outline-none disabled:opacity-40 ${
                  e.attention ? "text-signal" : "text-ink"
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
}: {
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

  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/demandes"
          className="inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-[13.5px] text-ink/55 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
        >
          <IconeRetour className="h-4 w-4" /> Projets
        </Link>
        <Menu entrees={entreesMenu} />
      </div>

      <div className="mt-3 flex items-start gap-3.5">
        <Avatar nom={nomClient || "?"} taille={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="min-w-0 truncate font-display text-[1.6rem] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-3xl">
              {nomClient}
            </h1>
            {priorite !== "normal" && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                  priorite === "urgent" ? "bg-signal/15 text-signal" : "bg-alerte-orange/15 text-alerte-orange"
                }`}
              >
                {priorite === "urgent" ? "Urgent" : "Important"}
              </span>
            )}
          </div>
          {sousTitre && <p className="mt-0.5 truncate text-[14px] text-ink/55">{sousTitre}</p>}
        </div>
      </div>

      {(telephone || adresse || surMessage) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {telephone && (
            <a
              href={`tel:${telephone.replace(/\s/g, "")}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/10 bg-surface px-4 py-2.5 text-[14px] font-medium text-ink transition hover:border-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
            >
              <IconeTelephone className="h-4 w-4 text-signal" /> Appeler
            </a>
          )}
          {surMessage && (
            <button
              type="button"
              onClick={surMessage}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/10 bg-surface px-4 py-2.5 text-[14px] font-medium text-ink transition hover:border-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
            >
              <IconeMessage className="h-4 w-4 text-signal" /> Message
            </button>
          )}
          {adresse && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border border-ink/10 bg-surface px-4 py-2.5 text-[14px] font-medium text-ink transition hover:border-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
            >
              <IconeLieu className="h-4 w-4 shrink-0 text-signal" />
              <span className="truncate">Itinéraire</span>
            </a>
          )}
        </div>
      )}

      {/* La progression : cinq étapes, la courante nommée. */}
      <div className="mt-5" aria-label={`Étape : ${ETAPES[etape].libelle}`}>
        <div className="flex gap-1" aria-hidden>
          {ETAPES.map((e, i) => (
            <span key={e.libelle} className={`h-1 flex-1 rounded-full ${i <= etape ? "bg-ink/70" : "bg-ink/10"}`} />
          ))}
        </div>
        <div className="mt-1.5 hidden justify-between text-[11.5px] sm:flex" aria-hidden>
          {ETAPES.map((e, i) => (
            <span key={e.libelle} className={i === etape ? "font-medium text-ink" : "text-ink/35"}>
              {e.libelle}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-ink/70 sm:hidden">{ETAPES[etape].libelle}</p>
      </div>
    </header>
  );
}
