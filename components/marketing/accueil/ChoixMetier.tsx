"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DessinMetier } from "@/components/marketing/illustrations/Outils";
import { EXEMPLES_METIERS, totalLigne, totaux } from "@/components/marketing/metiers/exemplesMetiers";
import { FICHE_PAR_ID } from "@/lib/metiersPages";

// ============================================================
// « Pour votre métier » (20/09) — le seul îlot interactif de l'accueil.
//
// Ce qui change d'un métier à l'autre : le dessin, le chantier montré, le
// devis, et les questions posées avant chiffrage. Ces questions ne sont
// PAS écrites pour la vitrine : ce sont celles de l'app
// (lib/checklistsMetier.ts), reprises telles quelles. Un artisan qui
// reconnaît ses propres questions comprend en deux secondes que le produit
// a été pensé pour lui — un texte publicitaire, non.
//
// Ce qui ne change jamais : la couleur, la typographie, la grille. Une
// couleur par métier détruirait le peu de signes distinctifs qu'a Compyo.
//
// Un seul panneau est rendu à la fois (celui du métier choisi) : dix-huit
// panneaux cachés alourdiraient la page pour rien.
// ============================================================

// Format des montants fait à la main plutôt que toLocaleString : Node et
// le navigateur ne séparent pas toujours les milliers avec le même
// caractère, ce qui provoque un avertissement d'hydratation React.
function euros(n: number): string {
  const [entier, centimes] = n.toFixed(2).split(".");
  return `${entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${centimes} €`;
}

function quantite(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
}

export function ChoixMetier() {
  // Le plombier en premier : c'est le métier le plus représenté dans la
  // liste de prospects, donc celui que le plus de visiteurs reconnaîtront.
  const [actif, setActif] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const metier = EXEMPLES_METIERS[actif];
  const somme = totaux(metier);
  const fiche = FICHE_PAR_ID[metier.id];

  // Flèches gauche/droite entre les onglets, comme l'attend un lecteur
  // d'écran sur un groupe d'onglets.
  function auClavier(e: React.KeyboardEvent, index: number) {
    const dernier = EXEMPLES_METIERS.length - 1;
    let cible: number | null = null;
    if (e.key === "ArrowRight") cible = index === dernier ? 0 : index + 1;
    if (e.key === "ArrowLeft") cible = index === 0 ? dernier : index - 1;
    if (e.key === "Home") cible = 0;
    if (e.key === "End") cible = dernier;
    if (cible === null) return;
    e.preventDefault();
    setActif(cible);
    onglets.current[cible]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Choisissez votre métier"
        className="flex flex-wrap justify-center gap-x-1.5 gap-y-2"
      >
        {EXEMPLES_METIERS.map((m, i) => {
          const choisi = i === actif;
          return (
            <button
              key={m.id}
              ref={(el) => {
                onglets.current[i] = el;
              }}
              role="tab"
              id={`onglet-${m.id}`}
              aria-selected={choisi}
              aria-controls="panneau-metier"
              tabIndex={choisi ? 0 : -1}
              onClick={() => setActif(i)}
              onKeyDown={(e) => auClavier(e, i)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                choisi
                  ? "bg-ink text-paper"
                  : "text-steel hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {m.nom}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="panneau-metier"
        aria-labelledby={`onglet-${metier.id}`}
        className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16"
      >
        {/* Colonne gauche : le chantier, le dessin, les questions */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">Chantier type</p>
          <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {metier.chantier}
          </h3>
          <dl className="mt-5 flex gap-8">
            {metier.cotes.map((c) => (
              <div key={c.libelle}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">{c.libelle}</dt>
                <dd className="mt-0.5 font-display text-lg text-ink">{c.valeur}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 aspect-[4/3] max-w-sm rounded-[1.6rem] bg-paper-warm">
            <DessinMetier
              id={metier.id}
              titre={`Dessin au trait : ${metier.nom}`}
              className="derive-lente h-full w-full p-6 text-ink/70"
            />
          </div>

          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
            Ce que Compyo demande avant de chiffrer
          </p>
          <ul className="mt-4 space-y-2.5">
            {metier.checklist.map((question) => (
              <li key={question} className="flex gap-3 text-[15px] leading-snug text-ink/80">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" />
                {question}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed text-steel">
            Les mêmes questions que dans l&apos;application, mot pour mot.
          </p>
        </div>

        {/* Colonne droite : le devis */}
        <div className="rounded-[1.6rem] border border-ink/10 bg-surface p-6 shadow-[0_24px_60px_-34px_rgb(var(--c-ink)/0.4)] sm:p-8">
          <div className="flex items-baseline justify-between border-b border-ink/10 pb-4">
            <p className="font-display text-lg font-semibold text-ink">Devis</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">Exemple</p>
          </div>
          <ul className="divide-y divide-ink/10">
            {metier.lignes.map((l) => (
              <li key={l.designation} className="flex items-baseline justify-between gap-4 py-3.5">
                <span className="min-w-0 text-[14px] leading-snug text-ink">
                  {l.designation}
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-steel">
                    {quantite(l.quantite)} {l.unite} × {euros(l.prixUnitaire)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">
                  {euros(totalLigne(l))}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-ink/10 pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-steel">Total HT</dt>
              <dd className="font-mono tabular-nums text-ink">{euros(somme.ht)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel">TVA {metier.tvaPct} %</dt>
              <dd className="font-mono tabular-nums text-ink">{euros(somme.tva)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t-2 border-ink/80 pt-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">Total TTC</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-ink">{euros(somme.ttc)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[12.5px] leading-relaxed text-steel">
            Exemple de structure, pas un tarif : dans Compyo, les montants viennent de vos prix à
            vous, et vous relisez chaque ligne avant d&apos;envoyer.
          </p>

          {/* Une page dédiée n'existe que pour les métiers dont le contenu
              est écrit — pas de lien vers une page vide. */}
          {fiche?.redigee && (
            <Link
              href={`/metiers/${fiche.slug}`}
              className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-signal underline underline-offset-4 hover:text-signal-fonce"
            >
              Compyo pour un {metier.nom.toLowerCase()}
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
