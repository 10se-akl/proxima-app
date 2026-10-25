import Link from "next/link";
import { evolution, type Activite, type ChiffresMois } from "@/lib/activite";
import type { DetailHeures } from "@/lib/bilan-mensuel";
import { cle, decaler, libelle, memeMois, nomMois, type Mois } from "@/lib/moisParis";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import { CLASSE_PAGE_LARGE, EnTetePage } from "@/components/ui/EnTetePage";
import {
  BOUTON_CREUX,
  CARTE_PLEINE,
  ETIQUETTE,
  FOCUS,
  FORME_ETIQUETTE,
  MONTANT,
  SECONDAIRE,
  TITRE_CARTE,
  euros,
} from "@/components/ui/recettes";
import { IconeChevron } from "@/components/projet/icones";
import { GraphiqueActivite } from "@/components/dashboard/GraphiqueActivite";

// ============================================================
// L'affichage du bilan, séparé de sa lecture (21/09) — voir
// app/dashboard/bilan/page.tsx pour les données et le pourquoi de la
// refonte. Séparé pour pouvoir être vérifié avec des données d'exemple,
// sans session ni base, exactement comme components/marketing/
// AvisGoogle.tsx (VueAvisGoogle).
//
// Design v3 (24/10) : la grille commune ; « Bilan » en titre et le mois
// entre deux flèches juste dessous (le titre ne se coupe plus sur deux
// lignes) ; les quatre chiffres en gros (28 à 32 px) dans des cartes sans
// contour ; l'encaissé en vert, comme sur l'accueil.
// ============================================================

/** Les flèches de mois : des pastilles rondes en creux de 48 px (25/10 :
 *  la forme des boutons compacts). */
const FLECHE_MOIS = `grid h-12 w-12 shrink-0 place-items-center rounded-full bg-paper-warm text-ink active:bg-ink/10 sm:hover:bg-ink/[0.08] motion-safe:transition-colors ${FOCUS}`;

// 25/10 — les montants passent par euros() des recettes : un résumé, donc
// sans centimes, et sans coupure (« 12 400 € »).

function pluriel(n: number, un: string, plusieurs: string): string {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

function Evolution({
  actuel,
  precedent,
  reference,
}: {
  actuel: number;
  precedent: number;
  reference: string;
}) {
  const e = evolution(actuel, precedent);
  if (e.sens === "aucun") return null;
  if (e.sens === "nouveau") {
    return <p className="mt-1.5 text-[13px] text-steel">Rien sur {reference}</p>;
  }
  if (e.sens === "stable") {
    return <p className="mt-1.5 text-[13px] text-steel">Comme {reference}</p>;
  }
  const hausse = e.sens === "hausse";
  return (
    <p className={`mt-1.5 text-[13px] ${hausse ? "font-semibold text-succes" : "text-steel"}`}>
      <span aria-hidden>{hausse ? "▲" : "▼"}</span>
      <span className="sr-only">{hausse ? "En hausse de" : "En baisse de"}</span> {e.pourcentage}&nbsp;%{" "}
      <span className="font-normal text-steel">vs&nbsp;{reference}</span>
    </p>
  );
}

function Chiffre({
  titre,
  valeur,
  detail,
  cleChiffre,
  actuel,
  precedent,
  reference,
  vert = false,
}: {
  titre: string;
  valeur: string;
  detail?: string;
  cleChiffre: keyof ChiffresMois;
  actuel: ChiffresMois;
  precedent: ChiffresMois;
  reference: string;
  /** L'encaissé : l'argent qui rentre, en vert (comme sur l'accueil). */
  vert?: boolean;
}) {
  // 27/09 — Deux tuiles par ligne sur téléphone ne laissent qu'environ
  // 130 px au chiffre : « 9 850,40 € » débordait de sa tuile. La taille
  // suit la largeur de la tuile ET la longueur du texte (un chiffre fait
  // ~0,52 fois sa hauteur de large), sans jamais dépasser la taille
  // maximale. Un navigateur qui ne connaît pas « cqi » garde la taille fixe.
  // Design v3 (24/10) : le gros chiffre passe à 28 px (32 sur ordinateur).
  return (
    <div className={`${CARTE_PLEINE} [container-type:inline-size]`}>
      <p className="text-[15px] font-medium text-steel">{titre}</p>
      <p
        className={`mt-1 whitespace-nowrap font-display text-[1.75rem] font-bold leading-tight tracking-[-0.03em] tabular-nums [--taille-max:1.75rem] sm:text-[2rem] sm:[--taille-max:2rem] ${
          vert ? "text-succes" : "text-ink"
        }`}
        style={{ fontSize: `min(var(--taille-max), ${(182 / Math.max(valeur.length, 1)).toFixed(1)}cqi)` }}
      >
        {valeur}
      </p>
      {detail && <p className="mt-0.5 text-[13px] text-steel [text-wrap:pretty]">{detail}</p>}
      <Evolution actuel={actuel[cleChiffre]} precedent={precedent[cleChiffre]} reference={reference} />
    </div>
  );
}

export function VueBilan({
  activite,
  temps,
  mois,
  courant,
}: {
  activite: Activite;
  temps: { heuresGagnees: number; detailHeures: DetailHeures[] };
  mois: Mois;
  courant: Mois;
}) {
  const precedent = decaler(mois, -1);
  const suivant = decaler(mois, 1);
  const reference = activite.enCours
    ? `1er⁠–⁠${activite.jourCompare} ${nomMois(precedent)}`
    : nomMois(precedent);

  const { actuel } = activite;
  // Même garde-fou que l'ancien bilan : un devis envoyé fin août et
  // accepté en septembre compte en acceptés sans compter en envoyés. Une
  // proportion au-delà de 100 % se contredirait elle-même : on ne
  // l'affiche que quand elle reste cohérente.
  const taux =
    actuel.devisEnvoyes > 0 && actuel.devisAcceptes <= actuel.devisEnvoyes
      ? Math.round((actuel.devisAcceptes / actuel.devisEnvoyes) * 100)
      : null;

  const chantiersChiffres = activite.chantiersTermines.filter((c) => c.parJour !== null);
  const moisAffiche = libelle(mois).charAt(0).toUpperCase() + libelle(mois).slice(1);

  return (
    <div className={CLASSE_PAGE_LARGE}>
      {/* En-tête et navigation entre les mois. */}
      <EnTetePage
        titre="Bilan"
        sousTitre={activite.enCours ? `Mois en cours · chiffres au ${activite.jourCompare} ${nomMois(mois)}` : "Mois terminé"}
        actions={
          !memeMois(mois, courant) ? (
            <Link href="/dashboard/bilan" className={BOUTON_CREUX}>
              Mois en cours
            </Link>
          ) : undefined
        }
      >
        <nav aria-label="Changer de mois" className="flex items-center gap-3">
          <Link href={`/dashboard/bilan?mois=${cle(precedent)}`} className={FLECHE_MOIS} aria-label={`Voir ${libelle(precedent)}`}>
            <IconeChevron className="h-5 w-5 rotate-180" />
          </Link>
          <p className="min-w-0 flex-1 text-center text-[17px] font-semibold text-ink">{moisAffiche}</p>
          {activite.enCours ? (
            <span aria-disabled className={`${FLECHE_MOIS} opacity-40`}>
              <IconeChevron className="h-5 w-5" />
              <span className="sr-only">Pas de mois suivant</span>
            </span>
          ) : (
            <Link href={`/dashboard/bilan?mois=${cle(suivant)}`} className={FLECHE_MOIS} aria-label={`Voir ${libelle(suivant)}`}>
              <IconeChevron className="h-5 w-5" />
            </Link>
          )}
        </nav>
      </EnTetePage>

      {/* Les quatre chiffres du mois */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre
          titre="Signé"
          valeur={euros(actuel.signe)}
          detail={actuel.devisAcceptes > 0 ? `${pluriel(actuel.devisAcceptes, "devis accepté", "devis acceptés").replace(/ /g, " ")}, TTC` : "TTC"}
          cleChiffre="signe"
          actuel={actuel}
          precedent={activite.precedent}
          reference={reference}
        />
        <Chiffre
          titre="Encaissé"
          valeur={euros(actuel.encaisse)}
          detail="Factures payées, TTC"
          cleChiffre="encaisse"
          actuel={actuel}
          precedent={activite.precedent}
          reference={reference}
          vert
        />
        <Chiffre
          titre="Devis envoyés"
          valeur={String(actuel.devisEnvoyes)}
          cleChiffre="devisEnvoyes"
          actuel={actuel}
          precedent={activite.precedent}
          reference={reference}
        />
        <Chiffre
          titre="Devis acceptés"
          valeur={String(actuel.devisAcceptes)}
          detail={taux !== null ? `${taux} % des devis envoyés ce mois` : undefined}
          cleChiffre="devisAcceptes"
          actuel={actuel}
          precedent={activite.precedent}
          reference={reference}
        />
      </div>

      {/* Ce qui reste dû : une photographie d'aujourd'hui, pas un chiffre
          du mois — c'est ce que les artisans regardent en premier. */}
      {activite.aEncaisser.nombre > 0 && (
        <Link
          href="/dashboard/factures"
          className={`mt-3 flex min-h-[4.25rem] items-center gap-3 ${CARTE_PLEINE} py-4 active:bg-ink/[0.03] sm:hover:bg-ink/[0.02] motion-safe:transition-colors ${FOCUS}`}
        >
          {/* 25/10 — « dont N après échéance » sur sa propre ligne : la
              phrase ne se coupe plus après « dont ». */}
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-steel">À encaisser aujourd&apos;hui</span>
            <span className="mt-0.5 block text-[15px] text-steel">
              {pluriel(activite.aEncaisser.nombre, "facture en attente", "factures en attente")}
            </span>
            {activite.aEncaisser.enRetard > 0 && (
              <span className="block text-[15px] font-semibold text-signal-fonce">
                dont {activite.aEncaisser.enRetard}&nbsp;après échéance
              </span>
            )}
          </span>
          <span className={`shrink-0 whitespace-nowrap text-xl ${MONTANT}`}>{euros(activite.aEncaisser.total)}</span>
          <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
        </Link>
      )}

      {/* Six mois */}
      <section aria-labelledby="titre-six-mois" className={`mt-6 ${CARTE_PLEINE} sm:p-6`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titre-six-mois" className={TITRE_CARTE}>
            Les six derniers mois
          </h2>
          <p className="text-[13px] text-steel">TTC</p>
        </div>
        <div className="mt-5">
          <GraphiqueActivite points={activite.historique} moisActif={mois} />
        </div>
      </section>

      {/* Chantiers terminés : le temps face à l'argent */}
      <section aria-labelledby="titre-chantiers-termines" className={`mt-6 ${CARTE_PLEINE} sm:p-6`}>
        <h2 id="titre-chantiers-termines" className={TITRE_CARTE}>
          Chantiers terminés en {nomMois(mois)}
        </h2>
        {activite.chantiersTermines.length === 0 ? (
          <p className={`mt-2 leading-relaxed ${SECONDAIRE}`}>
            Aucun chantier marqué terminé {activite.enCours ? "pour l'instant ce mois-ci" : "ce mois-là"}.
            Quand vous passez un projet en « Terminé », il apparaît ici avec sa durée et ce qu&apos;il a
            rapporté par jour.
          </p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-gris-clair">
              {activite.chantiersTermines.map((c, i) => (
                <li key={c.demandeId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5">
                  <Link href={`/dashboard/demandes/${c.demandeId}`} className={`min-w-0 rounded-[6px] text-base sm:hover:underline ${FOCUS}`}>
                    <span className="font-semibold text-ink">{c.client}</span>
                    {LABEL_TYPE_CHANTIER[c.typeChantier] && (
                      <span className="text-steel"> · {LABEL_TYPE_CHANTIER[c.typeChantier]}</span>
                    )}
                    {/* Le premier de la liste (triée) est celui qui a le moins
                        rapporté par jour — dit sans jugement, seulement s'il y
                        a au moins deux chantiers à comparer. */}
                    {i === 0 && chantiersChiffres.length >= 2 && c.parJour !== null && (
                      <span className={`ml-2 align-middle ${FORME_ETIQUETTE} ${ETIQUETTE.neutre}`}>le moins par jour</span>
                    )}
                  </Link>
                  <span className="flex items-baseline gap-4 text-[15px] tabular-nums">
                    <span className="text-steel">
                      {c.jours !== null ? pluriel(c.jours, "jour", "jours") : "durée inconnue"}
                    </span>
                    <span className="whitespace-nowrap text-steel">{c.montant !== null ? euros(c.montant) : "—"}</span>
                    <span className={`min-w-[6.5rem] whitespace-nowrap text-right ${MONTANT}`}>
                      {c.parJour !== null ? `${euros(c.parJour)} / jour` : "—"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-steel">
              Durée comptée du démarrage à la fin du chantier (les dates que vous avez indiquées),
              week-ends compris. Montant du devis accepté, TTC. Compyo ne connaît pas vos heures
              réelles : c&apos;est un repère pour comparer vos chantiers entre eux, pas une rentabilité.
            </p>
          </>
        )}
      </section>

      {/* Deux repères plus discrets */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className={CARTE_PLEINE}>
          <p className="text-[15px] font-medium text-steel">Délai de signature</p>
          {activite.delaiSignatureJours !== null ? (
            <>
              <p className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] text-ink">
                {activite.delaiSignatureJours < 1
                  ? "Moins d'un jour"
                  : pluriel(Math.round(activite.delaiSignatureJours), "jour", "jours")}
              </p>
              <p className="mt-1 text-[13px] text-steel">
                Entre l&apos;envoi du devis et son acceptation, pour la moitié de vos clients ce mois-ci.
              </p>
            </>
          ) : (
            <p className={`mt-1 ${SECONDAIRE}`}>Aucun devis accepté sur ce mois pour le calculer.</p>
          )}
        </div>
        <div className={CARTE_PLEINE}>
          <p className="text-[15px] font-medium text-steel">Temps gagné avec Compyo (estimation)</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] tabular-nums text-ink">
            {String(temps.heuresGagnees).replace(".", ",")}&nbsp;h
          </p>
          {temps.detailHeures.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {temps.detailHeures.map((d) => (
                <li key={d.libelle} className="text-[13px] text-steel">
                  {d.libelle} : {d.occurrences} × ~{Math.round(d.minutes / d.occurrences)} min
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[13px] text-steel">Rien à compter sur ce mois pour l&apos;instant.</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-[13px] leading-relaxed text-steel">
        « Signé » additionne les devis acceptés dans le mois, que ce soit par signature en ligne ou
        marqués acceptés à la main. « Encaissé » additionne les factures marquées payées, à la date du
        paiement. Le temps gagné est une estimation, selon la méthode détaillée ci-dessus.
      </p>
    </div>
  );
}
