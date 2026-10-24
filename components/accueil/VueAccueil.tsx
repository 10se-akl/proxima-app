import Link from "next/link";
import { IconeCoche } from "@/components/projet/icones";
import { FinLien, FinRelancer, LigneAccueil } from "./Blocs";
import { BlocDepliable } from "./BlocDepliable";
import { ListeAujourdhui, type ElementJour } from "./ListeAujourdhui";
import { ARegler, type ElementARegler } from "./ARegler";
import { TraceAccueil } from "./TraceAccueil";
import { PremiersPas } from "./PremiersPas";
import { RafraichirAuRetour } from "./RafraichirAuRetour";
import { EnTeteAccueil } from "./EnTeteAccueil";
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

/** Les compteurs de l'accueil (lus par la page ; « En résumé » a été retiré
 *  au design v3 : il répétait les listes juste au-dessus). */
export type CompteursAccueil = {
  rdv: number;
  devis: number;
  factures: number;
  facturesEnRetard: number;
  aRegler: number;
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
  /** 23/10 — le geste de la ligne quand ce n'est pas une relance. */
  bouton?: { libelle: string; href: string } | null;
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
  soir = false,
  demainRetenir = null,
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
  /** 23/10 — dès 17 h : la carte « Demain » sous Aujourd'hui. */
  soir?: boolean;
  /** 23/10 — l'« À retenir » du premier rendez-vous de demain. */
  demainRetenir?: string | null;
  chantiers: ChantierAccueil[];
  nbChantiers: number;
}) {
  // Juste sous le bonjour : une seule chose à la fois.
  const haut = maintenant ? (
    <Maintenant action={maintenant} />
  ) : repos ? (
    <Repos demain={demain} retenir={demainRetenir} />
  ) : premierProjet ? (
    <PremiersPas />
  ) : rienDUrgent ? (
    <div className="rounded-[20px] bg-surface px-5 py-4 ombre-douce">
      <p className="text-base font-semibold text-ink">Rien d&apos;urgent.</p>
      <p className="mt-0.5 truncate text-sm text-steel">Demain · {demain ?? "Rien de prévu."}</p>
    </div>
  ) : null;

  // Design v3 (23/10) — « À faire » : une seule liste sous un seul titre.
  // D'abord les questions d'un geste (c'est fait ? ça dort ?), puis les
  // dossiers qui attendent (relancer, facturer, planifier). Les gestes et
  // leurs traces ne changent pas (ARegler, TraceAccueil).
  const nbAFaire = aRegler.length + aSuivre.length;
  const lignesASuivre = aSuivre.map((l) => (
    <LigneAccueil
      key={l.cle}
      href={l.href}
      repere={l.repere}
      principal={l.principal}
      secondaire={l.secondaire}
      fin={l.relance ? <FinRelancer href={l.relance} /> : l.bouton ? <FinLien href={l.bouton.href} libelle={l.bouton.libelle} /> : undefined}
    />
  ));

  return (
    // Design v3 (23/10, synthèse de 7 visions) — mobile d'abord, six blocs
    // au plus, dans un ordre qui ne change jamais : la carte du haut (une
    // seule chose), l'argent (la récompense), Aujourd'hui, À faire, trois
    // chantiers. Ordinateur (1280 px et plus) : ce qu'il faut faire à
    // gauche ; l'argent et les chantiers, le contexte, à droite.
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 min-[400px]:px-5 sm:p-10 xl:max-w-6xl">
      <RafraichirAuRetour />
      <EnTeteAccueil dateDuJour={dateDuJour} titre={titre} sousTitre={sousTitre} />

      {/* La trace du dernier geste et les feuilles ouvertes survivent au
          recalcul de l'accueil : le fournisseur entoure les deux colonnes. */}
      <TraceAccueil>
        <div className="mt-6 flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)] xl:items-start xl:gap-x-10">
          <div className="contents xl:block xl:min-w-0">
            {haut && <div className="order-1 xl:order-none">{haut}</div>}
            <div className="order-3 xl:order-none">
              <ListeAujourdhui elements={aujourdhui} />
              {/* Le soir, demain matin en un coup d'œil (le repos le montre
                  déjà quand tout est réglé). */}
              {soir && !repos && demain && <DemainMatin demain={demain} retenir={demainRetenir} />}
            </div>
            <section aria-label="À faire" className="order-4 mt-8 xl:order-none">
              {nbAFaire > 0 && (
                <h2 id="titre-a-faire" className="flex items-baseline gap-2 px-1 font-display text-xl font-bold text-ink">
                  À faire
                  <span className="font-sans text-[15px] font-normal tabular-nums tracking-normal text-steel">{nbAFaire}</span>
                </h2>
              )}
              {/* La cible du lien du badge de la barre du bas. */}
              <div id="a-regler" className="scroll-mt-20">
                <ARegler elements={aRegler} sansTitre />
              </div>
              {aSuivre.length > 0 && <BlocDepliable titre="À suivre" sansTitre lignes={lignesASuivre} />}
            </section>
          </div>

          <div className="contents xl:sticky xl:top-6 xl:block xl:min-w-0">
            <div className="order-2 xl:order-none">
              <ChiffresMois chiffres={chiffresMois} />
            </div>
            <div className="order-5 xl:order-none">
              <ChantiersAccueil chantiers={chantiers} total={nbChantiers} />
            </div>
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
    <div className="flex min-h-[6rem] items-center overflow-hidden rounded-[24px] bg-nuit text-white">
      <Link
        href={action.href}
        className="flex min-w-0 flex-1 items-center self-stretch py-4 pl-5 pr-3 active:bg-white/10 sm:hover:bg-white/[0.04] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-signal-clair">
            <span aria-hidden className="h-2 w-2 rounded-full bg-signal" />
            Maintenant
          </span>
          <span className="mt-1 line-clamp-2 block font-display text-[22px] font-bold leading-7">{action.texte}</span>
          {action.detail && <span className="mt-0.5 line-clamp-2 block text-[15px] text-white/75">{action.detail}</span>}
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
/** Le soir : le premier rendez-vous de demain et son « À retenir ». */
function DemainMatin({ demain, retenir }: { demain: string; retenir: string | null }) {
  return (
    <section aria-label="Demain" className="mt-8">
      <h2 className="px-1 font-display text-xl font-bold tracking-[-0.02em] text-ink">Demain</h2>
      <div className="mt-2.5 rounded-[20px] bg-surface px-4 py-3.5 ombre-douce">
        <p className="truncate text-base font-semibold text-ink">{demain}</p>
        {retenir && (
          <p className="mt-1 text-sm text-steel">
            <span className="font-semibold text-ink">À retenir : </span>
            {retenir}
          </p>
        )}
      </div>
    </section>
  );
}

function Repos({ demain, retenir = null }: { demain: string | null; retenir?: string | null }) {
  return (
    <section aria-label="Tout est réglé" className="flex items-center gap-4 rounded-3xl bg-surface px-5 py-5 ombre-douce">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-succes text-white dark:text-nuit">
        <IconeCoche className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-bold tracking-[-0.01em] text-ink">Tout est réglé.</span>
        <span className="mt-0.5 block truncate text-sm text-steel">Demain · {demain ?? "Rien de prévu."}</span>
        {retenir && (
          <span className="mt-0.5 block text-sm text-steel">
            <span className="font-semibold text-ink">À retenir : </span>
            {retenir}
          </span>
        )}
      </span>
    </section>
  );
}
