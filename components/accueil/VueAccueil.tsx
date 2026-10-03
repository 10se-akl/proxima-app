import Link from "next/link";
import { IconeCoche } from "@/components/projet/icones";
import { FinRelancer, LigneAccueil } from "./Blocs";
import { BlocDepliable } from "./BlocDepliable";
import { ListeAujourdhui, type ElementJour } from "./ListeAujourdhui";
import { ARegler, type ElementARegler } from "./ARegler";
import { TraceAccueil } from "./TraceAccueil";
import { BoutonCapture } from "./BoutonCapture";
import { RafraichirAuRetour } from "./RafraichirAuRetour";

// ============================================================
// L'affichage de l'accueil, sans aucune requête : app/dashboard/page.tsx
// calcule, ce composant montre.
//
// Refonte (03/10 — duel C, lot 4) : devant / derrière. Quatre blocs au
// plus, cinq lignes chacun, puis « Voir les N » :
//   0. l'en-tête : la date, « Bonjour » (« Bonsoir » dès 17 h) ;
//   1. Maintenant (la seule carte sombre, un lien) — ou, dès 17 h, quand
//      rien n'est ni devant ni derrière, « Tout est réglé. » et demain ;
//   2. Aujourd'hui (devant) ;
//   3. À régler (derrière) ;
//   4. À suivre (les dossiers qui attendent un geste : cadrer, chiffrer,
//      relire, envoyer, relancer).
// Sur ordinateur, deux colonnes : à gauche 1 à 3, à droite À suivre.
// Le bilan chiffré du soir a quitté l'accueil.
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
  premierProjet,
  maintenant,
  repos,
  rienDUrgent,
  demain,
  aujourdhui,
  aRegler,
  aSuivre,
}: {
  dateDuJour: string;
  titre: string;
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
}) {
  // Le haut de l'écran : une seule chose à la fois.
  const haut = maintenant ? (
    <Maintenant action={maintenant} />
  ) : repos ? (
    <Repos demain={demain} />
  ) : premierProjet ? (
    <div className="mt-8 flex flex-col items-start gap-5">
      <p className="text-base text-steel">Votre premier projet commence ici.</p>
      <BoutonCapture />
    </div>
  ) : rienDUrgent ? (
    <div className="mt-6">
      <p className="text-base text-steel">Rien d&apos;urgent.</p>
      <p className="mt-1 truncate text-sm text-steel">Demain · {demain ?? "Rien de prévu."}</p>
    </div>
  ) : null;

  return (
    <div className="max-w-2xl px-4 pb-8 pt-5 sm:p-8 lg:max-w-5xl">
      <RafraichirAuRetour />
      <header>
        <p className="text-xs text-steel first-letter:uppercase">{dateDuJour}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{titre}</h1>
      </header>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <div className="min-w-0">
          {haut}
          {/* Toujours monté, même vide : la trace du dernier geste et les
              feuilles ouvertes survivent au recalcul de l'accueil. */}
          <TraceAccueil>
            <ListeAujourdhui elements={aujourdhui} />
            <ARegler elements={aRegler} />
          </TraceAccueil>
        </div>

        <div className="min-w-0">
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
    </div>
  );
}

/** La seule carte sombre de l'application : un lien, jamais une coche. */
function Maintenant({ action }: { action: ActionAccueil }) {
  return (
    <div className="mt-5 flex min-h-[4.5rem] items-stretch overflow-hidden rounded-2xl bg-ink text-paper">
      <Link
        href={action.href}
        className="flex min-w-0 flex-1 items-center px-5 py-4 active:bg-paper/10 sm:hover:bg-paper/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paper"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-paper/70">Maintenant</span>
          <span className="mt-0.5 block truncate text-xl font-semibold">{action.texte}</span>
          {action.detail && <span className="block truncate text-sm text-paper/70">{action.detail}</span>}
        </span>
      </Link>
      {action.adresse && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(action.adresse)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center border-l border-paper/20 px-4 text-base font-semibold text-paper active:bg-paper/10 sm:hover:bg-paper/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-paper"
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
    <section aria-label="Tout est réglé" className="mt-6 flex items-start gap-4">
      <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-succes/10 text-succes">
        <IconeCoche className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-3xl font-semibold text-ink">Tout est réglé.</span>
        <span className="mt-1 block truncate text-sm text-steel">Demain · {demain ?? "Rien de prévu."}</span>
      </span>
    </section>
  );
}
