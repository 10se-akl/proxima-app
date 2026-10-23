import Link from "next/link";
import { IconeCoche } from "@/components/projet/icones";
import { FinRelancer, LigneAccueil } from "./Blocs";
import { BlocDepliable } from "./BlocDepliable";
import { ListeAujourdhui, type ElementJour } from "./ListeAujourdhui";
import { ARegler, type ElementARegler } from "./ARegler";
import { TraceAccueil } from "./TraceAccueil";
import { PremiersPas } from "./PremiersPas";
import { RafraichirAuRetour } from "./RafraichirAuRetour";
import { EnTeteAccueil } from "./EnTeteAccueil";
import { TuilesAccueil, type CompteursAccueil } from "./TuilesAccueil";
import { ChantiersAccueil, type ChantierAccueil } from "./ChantiersAccueil";
import { ChiffresMois, type ChiffresDuMois } from "./ChiffresMois";

// ============================================================
// L'affichage de l'accueil, sans aucune requête : app/dashboard/page.tsx
// calcule, ce composant montre.
//
// Refonte (03/10 — duel C, lot 4) : devant / derrière — Maintenant,
// Aujourd'hui (devant), À régler (derrière), À suivre (les dossiers qui
// attendent un geste). Le bilan chiffré du soir a quitté l'accueil.
//
// Refonte visuelle (04/10, maquette d'Axel) : la même matière, mise en
// scène autrement :
//   - un en-tête bleu nuit (la date, « Bonjour », et Maintenant à droite) ;
//   - quatre compteurs en couleur (rendez-vous, devis, factures, à régler) ;
//   - sur ordinateur, deux colonnes : à gauche « Mes projets » (photo,
//     étape, appeler / WhatsApp / y aller) puis À suivre ; à droite le
//     grand bouton Nouveau projet, les raccourcis, Aujourd'hui et À régler ;
//   - sur téléphone, une seule colonne, dans l'ordre de l'urgence :
//     Aujourd'hui et À régler, À suivre, puis Mes projets (le [+] de la
//     barre du bas tient lieu de grand bouton).
// ============================================================

export type ActionAccueil = {
  id: string;
  texte: string;
  detail?: string;
  href: string;
  /** L'adresse du rendez-vous : « Y aller » ouvre l'itinéraire. */
  adresse?: string | null;
};

export type LigneASuivre = {
  cle: string;
  id: string;
  /** Le repère à gauche : « 12 j », ou l'heure d'un message reçu. */
  repere: string;
  principal: string;
  secondaire: string;
  /** Ce que Maintenant dit de faire, s'il la prend (« Relancer M. Petit »). */
  action: string;
  href: string;
  relance?: string | null;
};

export function VueAccueil({
  dateDuJour,
  titre,
  sousTitre,
  premierProjet,
  maintenant,
  repos,
  rienDUrgent,
  demain,
  aujourdhui,
  aRegler,
  aSuivre,
  compteurs,
  chiffresMois = null,
  chantiers,
  nbChantiers,
}: {
  dateDuJour: string;
  titre: string;
  sousTitre?: string;
  premierProjet: boolean;
  maintenant: ActionAccueil | null;
  /** Dès 17 h, plus rien devant ni derrière : « Tout est réglé. ». */
  repos: boolean;
  /** Avant 17 h, rien du tout : « Rien d'urgent. ». */
  rienDUrgent: boolean;
  /** Le premier rendez-vous de demain, déjà mis en forme. */
  demain: string | null;
  aujourdhui: ElementJour[];
  aRegler: ElementARegler[];
  aSuivre: LigneASuivre[];
  compteurs: CompteursAccueil;
  /** 22/10 — l'argent du mois (les chiffres du Bilan), ou rien. */
  chiffresMois?: ChiffresDuMois | null;
  chantiers: ChantierAccueil[];
  nbChantiers: number;
}) {
  // Juste sous le bonjour : une seule chose à la fois.
  const haut = maintenant ? (
    <Maintenant action={maintenant} />
  ) : repos ? (
    <Repos demain={demain} />
  ) : premierProjet ? (
    <PremiersPas />
  ) : rienDUrgent ? (
    <div className="rounded-[20px] bg-surface px-5 py-4 ombre-douce">
      <p className="text-base font-semibold text-ink">Rien d&apos;urgent.</p>
      <p className="mt-0.5 truncate text-sm text-steel">Demain · {demain ?? "Rien de prévu."}</p>
    </div>
  ) : null;

  return (
    // Atelier (22/10) : le bonjour posé sur le fond, « Maintenant » seule
    // carte sombre, puis des listes groupées. Sur ordinateur (1280 px et
    // plus), deux colonnes : la journée et les projets à gauche, ce qui
    // attend un geste (À régler) et « En cours » à droite. Sur téléphone,
    // une colonne dans l'ordre de l'urgence.
    <div className="mx-auto max-w-2xl px-5 pb-10 pt-6 sm:p-10 xl:max-w-6xl">
      <RafraichirAuRetour />
      <EnTeteAccueil dateDuJour={dateDuJour} titre={titre} sousTitre={sousTitre} />
      <ChiffresMois chiffres={chiffresMois} />

      {/* La trace du dernier geste et les feuilles ouvertes survivent au
          recalcul de l'accueil : le fournisseur entoure les deux colonnes. */}
      <TraceAccueil>
        <div className="mt-6 flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start xl:gap-x-10">
          <div className="contents xl:block xl:min-w-0">
            {haut && <div className="order-1 xl:order-none">{haut}</div>}
            <div className="order-2 xl:order-none">
              <ListeAujourdhui elements={aujourdhui} />
            </div>
            <div className="order-5 xl:order-none">
              <ChantiersAccueil chantiers={chantiers} total={nbChantiers} />
            </div>
            <div className="order-4 xl:order-none">
              {aSuivre.length > 0 && (
                <BlocDepliable
                  titre="À suivre"
                  lignes={aSuivre.map((l) => (
                    <LigneAccueil
                      key={l.cle}
                      href={l.href}
                      repere={l.repere}
                      principal={l.principal}
                      secondaire={l.secondaire}
                      fin={l.relance ? <FinRelancer href={l.relance} /> : undefined}
                    />
                  ))}
                />
              )}
            </div>
          </div>

          <div className="contents xl:-mt-8 xl:block xl:min-w-0">
            {/* La cible du lien « À confirmer » (ex-« À régler »). */}
            <div id="a-regler" className="order-3 scroll-mt-20 xl:order-none">
              <ARegler elements={aRegler} />
            </div>
            {!premierProjet && (
              <div className="order-6 xl:order-none">
                <TuilesAccueil compteurs={compteurs} />
              </div>
            )}
          </div>
        </div>
      </TraceAccueil>
    </div>
  );
}

/** Maintenant : la seule carte sombre de l'application. Un lien, jamais
 *  une coche ; « Y aller » ouvre l'itinéraire. */
function Maintenant({ action }: { action: ActionAccueil }) {
  return (
    <div className="flex min-h-[5.5rem] items-center overflow-hidden rounded-3xl bg-nuit text-white shadow-[0_18px_36px_-18px_rgb(27_26_24/0.55)]">
      <Link
        href={action.href}
        className="flex min-w-0 flex-1 items-center self-stretch py-4 pl-5 pr-3 active:bg-white/10 sm:hover:bg-white/[0.04] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-signal-clair">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-signal" />
            Maintenant
          </span>
          <span className="mt-1 block truncate font-display text-xl font-bold tracking-[-0.01em]">{action.texte}</span>
          {action.detail && <span className="block truncate text-sm text-white/70">{action.detail}</span>}
        </span>
      </Link>
      {action.adresse && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(action.adresse)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-4 inline-flex min-h-12 shrink-0 items-center rounded-full bg-signal px-5 text-base font-semibold text-white active:scale-[0.97] sm:hover:brightness-105 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Y aller
        </a>
      )}
    </div>
  );
}

/** « Tout est réglé. » : un état vrai, jamais un geste (règle 16). */
function Repos({ demain }: { demain: string | null }) {
  return (
    <section aria-label="Tout est réglé" className="flex items-center gap-4 rounded-3xl bg-surface px-5 py-5 ombre-douce">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-succes text-white dark:text-nuit">
        <IconeCoche className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-bold tracking-[-0.01em] text-ink">Tout est réglé.</span>
        <span className="mt-0.5 block truncate text-sm text-steel">Demain · {demain ?? "Rien de prévu."}</span>
      </span>
    </section>
  );
}
