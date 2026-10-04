import Link from "next/link";
import { evolution, type Activite, type ChiffresMois } from "@/lib/activite";
import type { DetailHeures } from "@/lib/bilan-mensuel";
import { cle, decaler, libelle, memeMois, nomMois, type Mois } from "@/lib/moisParis";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import { Card } from "@/components/ui/Card";
import { CLASSE_BOUTON_NUIT_SECONDAIRE, EnTetePage } from "@/components/ui/EnTetePage";
import { Pastille } from "@/components/ui/Pastille";
import { IconeBilan } from "@/components/ui/Icones";
import { IconeChevron } from "@/components/projet/icones";
import { GraphiqueActivite } from "@/components/dashboard/GraphiqueActivite";

// ============================================================
// L'affichage du bilan, séparé de sa lecture (21/09) — voir
// app/dashboard/bilan/page.tsx pour les données et le pourquoi de la
// refonte. Séparé pour pouvoir être vérifié avec des données d'exemple,
// sans session ni base, exactement comme components/marketing/
// AvisGoogle.tsx (VueAvisGoogle).
// ============================================================

function euros(n: number): string {
  const [entier, centimes] = n.toFixed(2).split(".");
  const e = entier.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return centimes === "00" ? `${e}\u00A0€` : `${e},${centimes}\u00A0€`;
}

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
    return <p className="mt-1.5 text-xs text-ink/50">Rien sur {reference}</p>;
  }
  if (e.sens === "stable") {
    return <p className="mt-1.5 text-xs text-ink/50">Comme {reference}</p>;
  }
  const hausse = e.sens === "hausse";
  return (
    <p className={`mt-1.5 text-xs ${hausse ? "text-succes" : "text-ink/50"}`}>
      <span aria-hidden>{hausse ? "▲" : "▼"}</span>
      <span className="sr-only">{hausse ? "En hausse de" : "En baisse de"}</span> {e.pourcentage} %{" "}
      <span className="text-ink/50">vs {reference}</span>
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
}: {
  titre: string;
  valeur: string;
  detail?: string;
  cleChiffre: keyof ChiffresMois;
  actuel: ChiffresMois;
  precedent: ChiffresMois;
  reference: string;
}) {
  // 27/09 — Deux tuiles par ligne sur téléphone ne laissent qu'environ
  // 110 px au chiffre : « 9 850,40 € » débordait déjà de sa tuile (et sur
  // ordinateur, à quatre tuiles, « 24 850,40 € »). La taille suit
  // maintenant la largeur de la tuile ET la longueur du texte (un chiffre
  // fait ~0,52 fois sa hauteur de large), sans jamais dépasser la taille
  // d'avant. Un navigateur qui ne connaît pas « cqi » garde la taille fixe.
  return (
    <Card className="p-5 [container-type:inline-size]">
      <p className="text-xs text-ink/55">{titre}</p>
      <p
        className="mt-1.5 font-display text-2xl font-semibold tabular-nums [--taille-max:1.5rem] sm:text-[1.7rem] sm:[--taille-max:1.7rem]"
        style={{ fontSize: `min(var(--taille-max), ${(182 / Math.max(valeur.length, 1)).toFixed(1)}cqi)` }}
      >
        {valeur}
      </p>
      {detail && <p className="mt-0.5 text-xs text-ink/45">{detail}</p>}
      <Evolution actuel={actuel[cleChiffre]} precedent={precedent[cleChiffre]} reference={reference} />
    </Card>
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
    ? `1er–${activite.jourCompare} ${nomMois(precedent)}`
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

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-8 sm:p-8">
      {/* En-tête et navigation entre les mois (refonte visuelle 04/10 :
          l'en-tête bleu nuit). */}
      <EnTetePage
        titre={`Bilan · ${libelle(mois)}`}
        sousTitre={activite.enCours ? `Mois en cours · chiffres au ${activite.jourCompare} ${nomMois(mois)}` : "Mois terminé"}
        icone={
          <Pastille couleur="signal" taille="grande">
            <IconeBilan taille={24} />
          </Pastille>
        }
        actions={
          <nav aria-label="Changer de mois" className="flex items-center gap-2">
            <Link href={`/dashboard/bilan?mois=${cle(precedent)}`} className={`${CLASSE_BOUTON_NUIT_SECONDAIRE} !px-3`} aria-label={`Voir ${libelle(precedent)}`}>
              <IconeChevron className="h-5 w-5 rotate-180" />
            </Link>
            {activite.enCours ? (
              <span aria-disabled className={`${CLASSE_BOUTON_NUIT_SECONDAIRE} !px-3 opacity-40`}>
                <IconeChevron className="h-5 w-5" />
                <span className="sr-only">Pas de mois suivant</span>
              </span>
            ) : (
              <Link href={`/dashboard/bilan?mois=${cle(suivant)}`} className={`${CLASSE_BOUTON_NUIT_SECONDAIRE} !px-3`} aria-label={`Voir ${libelle(suivant)}`}>
                <IconeChevron className="h-5 w-5" />
              </Link>
            )}
            {!memeMois(mois, courant) && (
              <Link href="/dashboard/bilan" className={CLASSE_BOUTON_NUIT_SECONDAIRE}>
                Mois en cours
              </Link>
            )}
          </nav>
        }
      />

      {/* Les quatre chiffres du mois */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre
          titre="Signé"
          valeur={euros(actuel.signe)}
          detail={actuel.devisAcceptes > 0 ? `${pluriel(actuel.devisAcceptes, "devis accepté", "devis acceptés")}, TTC` : "TTC"}
          cleChiffre="signe"
          actuel={actuel}
          precedent={activite.precedent}
          reference={reference}
        />
        <Chiffre
          titre="Encaissé"
          valeur={euros(actuel.encaisse)}
          detail="Factures payées, TTC"
          cleChiffre="encaisse"
          actuel={actuel}
          precedent={activite.precedent}
          reference={reference}
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
          detail={taux !== null ? `${taux} % des devis envoyés ce mois` : undefined}
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
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-paper-warm px-5 py-4 transition-colors hover:border-ink/25"
        >
          <span className="text-sm">
            <span className="font-medium">{euros(activite.aEncaisser.total)}</span> à encaisser ·{" "}
            {pluriel(activite.aEncaisser.nombre, "facture en attente", "factures en attente")}
            {activite.aEncaisser.enRetard > 0 && (
              <span className="text-alerte-orange">
                {" "}
                · dont {activite.aEncaisser.enRetard} après échéance
              </span>
            )}
          </span>
          <span className="text-xs text-ink/55">Voir les factures →</span>
        </Link>
      )}

      {/* Six mois */}
      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Les six derniers mois</h2>
          <p className="text-xs text-ink/45">TTC</p>
        </div>
        <div className="mt-5">
          <GraphiqueActivite points={activite.historique} moisActif={mois} />
        </div>
      </Card>

      {/* Chantiers terminés : le temps face à l'argent */}
      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">
          Chantiers terminés en {nomMois(mois)}
        </h2>
        {activite.chantiersTermines.length === 0 ? (
          <p className="mt-3 text-sm text-ink/55 leading-relaxed">
            Aucun chantier marqué terminé {activite.enCours ? "pour l'instant ce mois-ci" : "ce mois-là"}.
            Quand vous passez un projet en « Terminé », il apparaît ici avec sa durée et ce qu&apos;il a
            rapporté par jour.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-ink/10">
              {activite.chantiersTermines.map((c, i) => (
                <li key={c.demandeId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5">
                  <Link href={`/dashboard/demandes/${c.demandeId}`} className="min-w-0 hover:underline">
                    <span className="font-medium">{c.client}</span>
                    {LABEL_TYPE_CHANTIER[c.typeChantier] && (
                      <span className="text-ink/50"> · {LABEL_TYPE_CHANTIER[c.typeChantier]}</span>
                    )}
                    {/* Le premier de la liste (triée) est celui qui a le moins
                        rapporté par jour — dit sans jugement, seulement s'il y
                        a au moins deux chantiers à comparer. */}
                    {i === 0 && chantiersChiffres.length >= 2 && c.parJour !== null && (
                      <span className="ml-2 rounded-full bg-paper-warm px-2 py-0.5 text-[11px] text-ink/60">
                        le moins par jour
                      </span>
                    )}
                  </Link>
                  <span className="flex items-baseline gap-4 text-sm tabular-nums">
                    <span className="text-ink/55">
                      {c.jours !== null ? pluriel(c.jours, "jour", "jours") : "durée inconnue"}
                    </span>
                    <span className="text-ink/55">{c.montant !== null ? euros(c.montant) : "—"}</span>
                    <span className="min-w-[6.5rem] text-right font-medium">
                      {c.parJour !== null ? `${euros(c.parJour)} / jour` : "—"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink/45 leading-relaxed">
              Durée comptée du démarrage à la fin du chantier (les dates que vous avez indiquées),
              week-ends compris. Montant du devis accepté, TTC. Compyo ne connaît pas vos heures
              réelles : c&apos;est un repère pour comparer vos chantiers entre eux, pas une rentabilité.
            </p>
          </>
        )}
      </Card>

      {/* Deux repères plus discrets */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs text-ink/55">Délai de signature</p>
          {activite.delaiSignatureJours !== null ? (
            <>
              <p className="mt-1.5 font-display text-xl font-semibold">
                {activite.delaiSignatureJours < 1
                  ? "Moins d'un jour"
                  : pluriel(Math.round(activite.delaiSignatureJours), "jour", "jours")}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                Entre l&apos;envoi du devis et son acceptation, pour la moitié de vos clients ce mois-ci.
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-ink/50">Aucun devis accepté sur ce mois pour le calculer.</p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink/55">Temps gagné avec Compyo (estimation)</p>
          <p className="mt-1.5 font-display text-xl font-semibold">
            {String(temps.heuresGagnees).replace(".", ",")}&nbsp;h
          </p>
          {temps.detailHeures.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {temps.detailHeures.map((d) => (
                <li key={d.libelle} className="text-xs text-ink/45">
                  {d.libelle} : {d.occurrences} × ~{Math.round(d.minutes / d.occurrences)} min
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-ink/45">Rien à compter sur ce mois pour l&apos;instant.</p>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-ink/40 leading-relaxed">
        « Signé » additionne les devis acceptés dans le mois, que ce soit par signature en ligne ou
        marqués acceptés à la main. « Encaissé » additionne les factures marquées payées, à la date du
        paiement. Le temps gagné est une estimation, selon la méthode détaillée ci-dessus.
      </p>
    </div>
  );
}
