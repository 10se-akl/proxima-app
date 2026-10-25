"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation, marquerNoteTerminee } from "@/lib/notes";
import { NoteCard } from "@/components/notes/NoteCard";
import { IconeNote } from "@/components/ui/Icones";
import { EnTetePage } from "@/components/ui/EnTetePage";
import { BOUTON_CREUX, BOUTON_PLEIN, BOUTON_TEXTE, COMPTEUR, ERREUR, GROUPE, TITRE_SECTION, puce } from "@/components/ui/recettes";
import { IconeCoche } from "@/components/projet/icones";
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
  // 08/10 (passe de finition) — la note cochée devient une trace « Fait :
  // … · Annuler » à sa place, dans son groupe, jusqu'au geste suivant
  // (règle 16) ; un échec la remet dans la liste (règle 13).
  const [cochee, setCochee] = useState<{ note: Note; groupe: string } | null>(null);
  const [erreurTerminer, setErreurTerminer] = useState<string | null>(null);

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

  async function terminer(noteId: string, terminee: boolean, groupe: string) {
    const note = notes.find((n) => n.id === noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setErreurTerminer(null);
    if (note) setCochee({ note, groupe });
    const reussi = await marquerNoteTerminee(supabase, noteId, terminee);
    if (!reussi && note) {
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
      setCochee(null);
      navigator.vibrate?.([12, 60, 12]);
      setErreurTerminer("Pas enregistré. Réessayez.");
    }
  }

  async function annuler() {
    if (!cochee) return;
    const { note } = cochee;
    setCochee(null);
    setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
    const reussi = await marquerNoteTerminee(supabase, note.id, false);
    if (!reussi) {
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      setErreurTerminer("Pas enregistré. Réessayez.");
    }
  }

  const trace = (groupe: string) =>
    cochee?.groupe === groupe ? (
      // Design v3 (24/10) : une ligne du groupe, en teinte opaque (succes-fond).
      <div className="flex min-h-14 items-center gap-3 bg-succes-fond pl-4 text-[15px] text-ink">
        <IconeCoche className="h-5 w-5 shrink-0 text-succes" />
        {/* 25/10 : le titre entier sur deux lignes au plus (plus de troncature). */}
        <p className="line-clamp-2 min-w-0 flex-1 break-words py-2">Fait&nbsp;: {cochee.note.titre}</p>
        <button type="button" onClick={annuler} className={`shrink-0 ${BOUTON_TEXTE}`}>
          Annuler
        </button>
      </div>
    ) : null;

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
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-3xl mx-auto lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10">
      {/* Le titre posé sur le fond (EnTetePage, TITRE_ECRAN), les chantiers
          en filtres dessous. Design v3 (24/10) : recettes BOUTON_PLEIN et
          puce(), plus de pastille d'icône. */}
      <EnTetePage
        titre="Notes"
        sousTitre={notes.length === 0 ? "Aucune note" : notes.length === 1 ? "1 note" : `${notes.length} notes`}
        actions={
          <Link href="/dashboard/notes/nouvelle" className={BOUTON_PLEIN}>
            Nouvelle note
          </Link>
        }
      >
        {projetsPresents.length > 0 && (
          // 27/09 — Une rangée qui défile : avec vingt chantiers, les
          // pastilles ne remplissent plus l'écran sur quatre lignes.
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setFiltreProjet("")} className={puce(filtreProjet === "")}>
              Tous
            </button>
            {projetsPresents.map(([id, nom]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltreProjet(id)}
                className={`whitespace-nowrap ${puce(filtreProjet === id)}`}
              >
                {nom}
              </button>
            ))}
          </div>
        )}
      </EnTetePage>

      <div aria-live="polite">
        {erreurTerminer && <p className={`mt-4 ${ERREUR}`}>{erreurTerminer}</p>}
      </div>

      {notesFiltrees.length === 0 && !cochee ? (
        // Design v3 (24/10) : l'état vide en tuile neutre et bouton creux
        // (le plein reste « Nouvelle note », en haut).
        <div className="mt-10 flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-paper-warm text-ink">
            <IconeNote taille={22} />
          </span>
          <p className="text-base text-steel">Aucune note.</p>
          <Link href="/dashboard/notes/nouvelle" className={BOUTON_CREUX}>
            Créer votre première note
          </Link>
        </div>
      ) : (
        <div>
          {(enRetard.length > 0 || cochee?.groupe === "En retard") && (
            <GroupeNotes titre="En retard" notes={enRetard} onTerminer={terminer} trace={trace("En retard")} />
          )}
          {(aujourdhui.length > 0 || cochee?.groupe === "Aujourd'hui") && (
            <GroupeNotes titre="Aujourd'hui" notes={aujourdhui} onTerminer={terminer} trace={trace("Aujourd'hui")} />
          )}
          {(aVenir.length > 0 || cochee?.groupe === "À venir") && (
            <GroupeNotes titre="À venir" notes={aVenir} onTerminer={terminer} trace={trace("À venir")} />
          )}
          {(sansRappel.length > 0 || cochee?.groupe === "Sans rappel") && (
            <GroupeNotes titre="Sans rappel" notes={sansRappel} onTerminer={terminer} trace={trace("Sans rappel")} />
          )}
        </div>
      )}
    </div>
  );
}

/** Un groupe de notes : son titre et son compteur, puis les notes en liste
 *  groupée. Design v3 (24/10) : une seule carte (GROUPE) par groupe, des
 *  filets entre les notes, plus de pastille de couleur décorative. */
function GroupeNotes({
  titre,
  notes,
  onTerminer,
  trace,
}: {
  titre: string;
  notes: Note[];
  onTerminer: (id: string, terminee: boolean, groupe: string) => void;
  /** « Fait : … · Annuler », quand la note cochée était dans ce groupe. */
  trace: React.ReactNode;
}) {
  return (
    <section aria-label={titre} className="mt-8">
      <h2 className={`flex items-baseline gap-2 tracking-[-0.02em] ${TITRE_SECTION}`}>
        {titre}
        <span className={COMPTEUR}>{notes.length}</span>
      </h2>
      <div className={`mt-2.5 ${GROUPE}`}>
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} onTerminer={(id, terminee) => onTerminer(id, terminee, titre)} />
        ))}
        {trace}
      </div>
    </section>
  );
}
