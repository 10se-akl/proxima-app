"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation, marquerNoteTerminee } from "@/lib/notes";
import { NoteCard } from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/Button";
import { IconeNote } from "@/components/ui/Icones";
import { CLASSE_BOUTON_NUIT, EnTetePage, classePuceNuit } from "@/components/ui/EnTetePage";
import { Pastille, type CouleurPastille } from "@/components/ui/Pastille";
import { TitreBloc, CLASSE_CARTE_BLOC } from "@/components/accueil/Blocs";
import { IconeCalendrier, IconeCloche, IconeCrayon } from "@/components/projet/icones";
import { EtatErreur } from "@/components/ui/EtatErreur";
import type { Note } from "@/types";
import { SquelettePage } from "@/components/ui/Skeleton";

// ============================================================
// Page Notes — point 1 du brief : "Créer une vraie page dédiée. Elle doit
// être très propre visuellement." Même niveau que Projets/Aujourd'hui/
// Planning dans la Sidebar.
//
// Groupement par échéance, pas par projet ni par ordre de création —
// c'est ce qui répond le mieux à "chaque fois qu'il ouvre un chantier, il
// retrouve immédiatement tout ce qu'il ne devait pas oublier" à l'échelle
// de toute l'organisation : ce qui presse en premier, en haut.
// ============================================================
export default function NotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [chargement, setChargement] = useState(true);
  // Sprint Robustesse (30/08) — sans ça, un échec réseau au chargement
  // laissait la page bloquée sur "Chargement…" indéfiniment (chargement
  // restait à true, aucun message, aucune action possible pour l'artisan).
  const [erreurChargement, setErreurChargement] = useState(false);
  const [filtreProjet, setFiltreProjet] = useState<string>("");

  async function charger() {
    setChargement(true);
    setErreurChargement(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Sprint Robustesse (30/08) — repéré en revue de régression :
        // sans ce `setChargement(false)`, une session expirée laissait la
        // page bloquée sur "Chargement…" comme le bug qu'on corrige ici.
        setChargement(false);
        return;
      }
      const organisationId = await getOrganisationId(supabase, user.id);
      if (!organisationId) {
        setChargement(false);
        return;
      }
      const donnees = await listerNotesActivesOrganisation(supabase, organisationId);
      setNotes(donnees);
      setChargement(false);
    } catch {
      // Sprint Robustesse (30/08) — coupure réseau typiquement : on montre un
      // vrai état d'erreur avec bouton "Réessayer" plutôt qu'un chargement
      // qui ne finit jamais.
      setErreurChargement(true);
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function terminer(noteId: string, terminee: boolean) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await marquerNoteTerminee(supabase, noteId, terminee);
  }

  const projetsPresents = Array.from(
    new Map(
      notes
        .filter((n) => n.demande_id && n.demandes?.nom_client)
        .map((n) => [n.demande_id as string, n.demandes!.nom_client])
    ).entries()
  );

  const notesFiltrees = filtreProjet ? notes.filter((n) => n.demande_id === filtreProjet) : notes;

  const maintenant = Date.now();
  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);
  const finAujourdhui = new Date(debutAujourdhui);
  finAujourdhui.setHours(23, 59, 59, 999);

  const avecRappel = notesFiltrees.filter((n) => n.rappel_a);
  const sansRappel = notesFiltrees.filter((n) => !n.rappel_a);

  const enRetard = avecRappel.filter((n) => new Date(n.rappel_a as string).getTime() < maintenant);
  const aujourdhui = avecRappel.filter((n) => {
    const t = new Date(n.rappel_a as string).getTime();
    return t >= maintenant && t <= finAujourdhui.getTime();
  });
  const aVenir = avecRappel.filter((n) => new Date(n.rappel_a as string).getTime() > finAujourdhui.getTime());

  if (chargement) {
    return <SquelettePage />;
  }

  // Sprint Robustesse (30/08) — voir le catch dans `charger` ci-dessus.
  if (erreurChargement) {
    return <EtatErreur onReessayer={charger} className="p-8" />;
  }

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-3xl mx-auto">
      {/* Refonte visuelle (04/10) : l'en-tête bleu nuit, les chantiers en
          filtres dedans. */}
      <EnTetePage
        titre="Notes"
        sousTitre={notes.length === 0 ? "Aucune note" : notes.length === 1 ? "1 note" : `${notes.length} notes`}
        icone={
          <Pastille couleur="orange" taille="grande">
            <IconeCrayon className="h-6 w-6" />
          </Pastille>
        }
        actions={
          <Link href="/dashboard/notes/nouvelle" className={CLASSE_BOUTON_NUIT}>
            Nouvelle note
          </Link>
        }
      >
        {projetsPresents.length > 0 && (
          // 27/09 — Une rangée qui défile : avec vingt chantiers, les
          // pastilles ne remplissent plus l'écran sur quatre lignes.
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setFiltreProjet("")} className={`shrink-0 ${classePuceNuit(filtreProjet === "")}`}>
              Tous
            </button>
            {projetsPresents.map(([id, nom]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltreProjet(id)}
                className={`shrink-0 whitespace-nowrap ${classePuceNuit(filtreProjet === id)}`}
              >
                {nom}
              </button>
            ))}
          </div>
        )}
      </EnTetePage>

      {notesFiltrees.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-signal/10">
            <IconeNote taille={22} className="text-signal" />
          </span>
          <p className="text-sm text-ink/50">Aucune note pour l&apos;instant.</p>
          <Link href="/dashboard/notes/nouvelle">
            <Button variant="ghost">Créer votre première note</Button>
          </Link>
        </div>
      ) : (
        <div>
          {enRetard.length > 0 && (
            <GroupeNotes titre="En retard" notes={enRetard} onTerminer={terminer} couleur="orange" icone={<IconeCloche className="h-4 w-4" />} />
          )}
          {aujourdhui.length > 0 && (
            <GroupeNotes titre="Aujourd'hui" notes={aujourdhui} onTerminer={terminer} couleur="bleu" icone={<IconeCalendrier className="h-4 w-4" />} />
          )}
          {aVenir.length > 0 && (
            <GroupeNotes titre="À venir" notes={aVenir} onTerminer={terminer} couleur="violet" icone={<IconeCalendrier className="h-4 w-4" />} />
          )}
          {sansRappel.length > 0 && (
            <GroupeNotes titre="Sans rappel" notes={sansRappel} onTerminer={terminer} couleur="signal" icone={<IconeCrayon className="h-4 w-4" />} />
          )}
        </div>
      )}
    </div>
  );
}

/** Un groupe de notes : une carte, son titre et sa pastille (refonte
 *  visuelle 04/10, comme les blocs de l'accueil). */
function GroupeNotes({
  titre,
  notes,
  onTerminer,
  couleur,
  icone,
}: {
  titre: string;
  notes: Note[];
  onTerminer: (id: string, terminee: boolean) => void;
  couleur: CouleurPastille;
  icone: React.ReactNode;
}) {
  return (
    <section aria-label={titre} className={CLASSE_CARTE_BLOC}>
      <TitreBloc
        titre={titre}
        nombre={notes.length}
        icone={
          <Pastille couleur={couleur} variante="doux" taille="petite">
            {icone}
          </Pastille>
        }
      />
      <div className="mt-2.5 flex flex-col gap-2">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} onTerminer={onTerminer} className="!bg-paper/70 !ring-ink/10" />
        ))}
      </div>
    </section>
  );
}
