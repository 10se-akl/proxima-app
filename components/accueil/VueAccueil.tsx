import Link from "next/link";
import { AConfirmer } from "@/components/dashboard/AConfirmer";
import { ConfirmerClotureProjet } from "@/components/dashboard/ConfirmerClotureProjet";
import { BlocAccueil, LigneAccueil, LIGNES_MAX } from "./Blocs";
import { ListeAujourdhui, type ElementJour } from "./ListeAujourdhui";
import { BoutonCapture } from "./BoutonCapture";
import { FermerJournee, type Fermeture } from "./FermerJournee";
import { RafraichirAuRetour } from "./RafraichirAuRetour";

// ============================================================
// L'affichage de l'accueil (26/09, lot B) — les cinq blocs, sans aucune
// requête : app/dashboard/page.tsx calcule, ce composant montre. Voir la
// page pour l'ordre et les règles de chaque bloc.
// ============================================================

export type ActionAccueil = { id: string; texte: string; detail?: string; href: string };

type EvenementAConfirmer = {
  id: string;
  titre: string;
  demande_id: string | null;
  date_heure: string;
  demandes?: { nom_client?: string } | null;
};

export type LigneAProduire = { id: string; href: string; nom: string; verbe: string };
export type LigneEnAttente = { id: string; jours: number; nom: string; quoi: string; href: string; relance: string | null };

export function VueAccueil({
  dateDuJour,
  titre,
  premierProjet,
  prochaineAction,
  fermeture = null,
  aConfirmer,
  chantiersAConfirmer,
  elementsJour,
  aProduire,
  enAttente,
  rienAFaire,
}: {
  dateDuJour: string;
  titre: string;
  premierProjet: boolean;
  prochaineAction: ActionAccueil | null;
  /** Le soir (lot E) : « Fermer la journée » à la place de « Maintenant ». */
  fermeture?: Fermeture | null;
  aConfirmer: EvenementAConfirmer[];
  chantiersAConfirmer: { id: string; nom_client: string }[];
  elementsJour: ElementJour[];
  aProduire: LigneAProduire[];
  enAttente: LigneEnAttente[];
  rienAFaire: boolean;
}) {
  const nbAConfirmer = aConfirmer.length + chantiersAConfirmer.length;
  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl">
      <RafraichirAuRetour />
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-steel">{dateDuJour}</p>
        <h1 className="mt-1 font-display text-[1.6rem] font-semibold leading-tight text-ink sm:text-3xl">
          {titre}
        </h1>
      </header>

      {/* 1. Maintenant — la seule suggestion de l'accueil. Le soir :
          Fermer la journée. */}
      {fermeture ? <FermerJournee fermeture={fermeture} /> : prochaineAction && <Maintenant action={prochaineAction} />}

      {/* 2. À confirmer — des questions oui / non. */}
      {nbAConfirmer > 0 && (
        <section className="mt-7" aria-label="À confirmer">
          <h2 className="flex items-baseline gap-2 font-display text-[17px] font-semibold text-ink">
            À confirmer
            <span className="font-sans text-[13px] font-normal tabular-nums text-steel">{nbAConfirmer}</span>
          </h2>
          {/* Refonte (02/10) — 5 lignes au plus, comme les autres blocs : après
              une semaine sans répondre, ce bloc poussait tout le reste hors
              de l'écran. Les suivantes arrivent à mesure qu'on répond. */}
          <div className="mt-2.5 flex flex-col gap-2">
            <AConfirmer evenements={aConfirmer.slice(0, LIGNES_MAX)} integre />
            <ConfirmerClotureProjet
              projets={chantiersAConfirmer.slice(0, Math.max(0, LIGNES_MAX - aConfirmer.length))}
              integre
            />
          </div>
          {nbAConfirmer > LIGNES_MAX && (
            <p className="mt-2 text-sm text-steel">Et {nbAConfirmer - LIGNES_MAX} de plus.</p>
          )}
        </section>
      )}

      {/* 3. Aujourd'hui */}
      <ListeAujourdhui elements={elementsJour} />

      {/* 4. À faire de votre côté */}
      {aProduire.length > 0 && (
        <BlocAccueil titre="À faire de votre côté" nombre={aProduire.length} lienTous="/dashboard/demandes">
          {aProduire.slice(0, LIGNES_MAX).map((l) => (
            <LigneAccueil
              key={l.id}
              href={l.href}
              principal={l.nom}
              secondaire={l.verbe}
            />
          ))}
        </BlocAccueil>
      )}

      {/* 5. En attente du client */}
      {enAttente.length > 0 && (
        <BlocAccueil titre="En attente du client" nombre={enAttente.length} lienTous="/dashboard/devis">
          {enAttente.slice(0, LIGNES_MAX).map((l) => (
            <LigneAccueil
              key={l.id}
              href={l.href}
              repere={`${l.jours} j`}
              principal={l.nom}
              secondaire={l.quoi}
              fin={
                l.relance ? (
                  <Link
                    href={l.relance}
                    className="flex shrink-0 items-center border-l border-ink/[0.07] px-3.5 text-[14px] font-semibold text-ink transition-colors hover:bg-ink/[0.03]"
                  >
                    Relancer
                  </Link>
                ) : undefined
              }
            />
          ))}
        </BlocAccueil>
      )}

      {rienAFaire && (
        <div className="mt-10 flex flex-col items-start gap-5">
          <p className="font-display text-xl text-ink/70">
            {premierProjet ? "Votre premier projet commence ici." : "Rien d'urgent."}
          </p>
          <BoutonCapture />
        </div>
      )}
    </div>
  );
}

function Maintenant({ action }: { action: ActionAccueil }) {
  return (
    <Link
      href={action.href}
      className="mt-5 flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-ink px-5 py-4 text-paper transition hover:bg-ink/90"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10.5px] uppercase tracking-[0.2em] text-paper/55">Maintenant</span>
        <span className="mt-0.5 block truncate text-[17px] font-semibold">{action.texte}</span>
        {action.detail && <span className="block truncate text-[13.5px] text-paper/65">{action.detail}</span>}
      </span>
      <span aria-hidden className="text-xl text-paper/50">
        →
      </span>
    </Link>
  );
}
