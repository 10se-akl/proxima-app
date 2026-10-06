import Link from "next/link";
import { IconeCoche, IconeHorloge } from "@/components/projet/icones";
import { Pastille } from "@/components/ui/Pastille";
import { FinRelancer, LigneAccueil } from "./Blocs";
import { BlocDepliable } from "./BlocDepliable";
import { ListeAujourdhui, type ElementJour } from "./ListeAujourdhui";
import { ARegler, type ElementARegler } from "./ARegler";
import { TraceAccueil } from "./TraceAccueil";
import { BoutonCapture } from "./BoutonCapture";
import { RafraichirAuRetour } from "./RafraichirAuRetour";
import { EnTeteAccueil } from "./EnTeteAccueil";
import { TuilesAccueil, type CompteursAccueil } from "./TuilesAccueil";
import { ChantiersAccueil, type ChantierAccueil } from "./ChantiersAccueil";
import { ActionsRapides } from "./ActionsRapides";

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
  chantiers,
  nbChantiers,
}: {
  dateDuJour: string;
  titre: string;
  sousTitre: string;
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
  chantiers: ChantierAccueil[];
  nbChantiers: number;
}) {
  // Le côté droit de l'en-tête : une seule chose à la fois.
  const haut = maintenant ? (
    <Maintenant action={maintenant} />
  ) : repos ? (
    <Repos demain={demain} />
  ) : premierProjet ? (
    <BoutonCapture surNuit />
  ) : rienDUrgent ? (
    <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15">
      <p className="text-base font-semibold">Rien d&apos;urgent.</p>
      <p className="mt-0.5 truncate text-sm text-white/70">Demain · {demain ?? "Rien de prévu."}</p>
    </div>
  ) : null;

  return (
    <div className="max-w-2xl px-4 pb-8 pt-4 sm:p-8 lg:max-w-6xl">
      <RafraichirAuRetour />
      <EnTeteAccueil dateDuJour={dateDuJour} titre={titre} sousTitre={sousTitre}>
        {haut}
      </EnTeteAccueil>

      {!premierProjet && <TuilesAccueil compteurs={compteurs} />}

      {/* Sur téléphone, les deux colonnes s'effacent (contents) et l'ordre
          suit l'urgence ; sur ordinateur, chacune reprend sa place. */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-start lg:gap-x-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <div className="contents lg:block lg:min-w-0">
          <div className="order-3 lg:order-none">
            <ChantiersAccueil chantiers={chantiers} total={nbChantiers} />
          </div>
          <div className="order-2 lg:order-none">
            {aSuivre.length > 0 && (
              <BlocDepliable
                titre="À suivre"
                icone={
                  <Pastille couleur="signal" variante="doux" taille="petite">
                    <IconeHorloge className="h-4 w-4" />
                  </Pastille>
                }
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

        <div className="contents lg:block lg:min-w-0">
          <div className="order-4 lg:order-none">
            <ActionsRapides />
          </div>
          {/* La cible du compteur « À régler ». Toujours monté, même vide :
              la trace du dernier geste et les feuilles ouvertes survivent
              au recalcul de l'accueil. */}
          <div id="a-regler" className="order-1 scroll-mt-20 lg:order-none">
            <TraceAccueil>
              <ListeAujourdhui elements={aujourdhui} />
              <ARegler elements={aRegler} />
            </TraceAccueil>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Maintenant, sur l'en-tête bleu nuit : un lien, jamais une coche. */
function Maintenant({ action }: { action: ActionAccueil }) {
  return (
    <div className="flex min-h-[4.5rem] items-stretch overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm">
      <Link
        href={action.href}
        className="flex min-w-0 flex-1 items-center px-5 py-4 active:bg-white/10 sm:hover:bg-white/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm text-white/70">
            <span aria-hidden className="h-2 w-2 rounded-full bg-signal" />
            Maintenant
          </span>
          <span className="mt-0.5 block truncate text-xl font-semibold">{action.texte}</span>
          {action.detail && <span className="block truncate text-sm text-white/70">{action.detail}</span>}
        </span>
      </Link>
      {action.adresse && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(action.adresse)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center bg-signal px-4 text-base font-semibold text-white active:brightness-95 sm:hover:brightness-105 motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
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
    <section aria-label="Tout est réglé" className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-succes text-white">
        <IconeCoche className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-semibold">Tout est réglé.</span>
        <span className="mt-0.5 block truncate text-sm text-white/70">Demain · {demain ?? "Rien de prévu."}</span>
      </span>
    </section>
  );
}
