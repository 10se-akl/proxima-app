"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marquerNoteTerminee } from "@/lib/notes";
import { IconeCoche } from "@/components/projet/icones";
import { LIGNES_MAX } from "./Blocs";

// ============================================================
// « Fermer la journée » (26/09 — « moins mais mieux », lot E).
//
// À partir de 17 h, le bloc « Maintenant » de l'accueil devient ce bloc.
// Il ne sert pas à informer, il sert à vider la tête : trois lignes au
// plus (Aujourd'hui, En suspens, Demain), un bouton « Fait » ou « Demain »
// sur chaque élément en suspens. Pas de notification, pas de série de
// jours. Remplace ResumeJournee (un résumé à demander, qui ne fermait rien).
//
// « Tout est réglé » n'est écrit que si « En suspens » est réellement vide,
// et s'affiche de lui-même.
//
// 27/09 (Axel) — Le bouton « C'est bon pour aujourd'hui » est retiré : il
// ne faisait que remplacer ce bloc par un message calme, sans rien changer
// d'autre (ni rappels ni notifications), ne se défaisait pas, et même Axel
// ne savait pas à quoi il servait. Le message calme vient maintenant tout
// seul quand il n'y a plus rien en suspens.
// ============================================================

/** Un élément non réglé du jour : une note due, ou un rendez-vous (ou un
 *  rappel du planning) passé sans confirmation. */
export type ElementSuspens = {
  cle: string;
  genre: "note" | "evenement";
  id: string;
  principal: string;
  secondaire?: string;
  /** Échéance de la note, ou heure de l'événement. */
  date: string;
};

export type Fermeture = {
  /** La date du jour à Paris (AAAA-MM-JJ) : la clé de la journée fermée. */
  cleJour: string;
  /** « 2 projets captés », « 1 devis envoyé »… Vide s'il n'y a rien. */
  bilan: string[];
  suspens: ElementSuspens[];
  /** Le premier rendez-vous de demain, déjà mis en forme. */
  demain: string | null;
};

// Le lendemain matin : l'heure à laquelle une note reportée revient.
const HEURE_REPORT_NOTE = 8;

type Actions = {
  fait: (e: ElementSuspens) => Promise<boolean>;
  demain: (e: ElementSuspens) => Promise<boolean>;
};

function demainMatin(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(HEURE_REPORT_NOTE, 0, 0, 0);
  return d;
}

/** Même heure, le lendemain d'aujourd'hui (pas le lendemain du rendez-vous). */
function demainMemeHeure(iso: string): Date {
  const origine = new Date(iso);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(origine.getHours(), origine.getMinutes(), 0, 0);
  return d;
}

function actionsSupabase(): Actions {
  const supabase = createClient();
  return {
    async fait(e) {
      if (e.genre === "note") return marquerNoteTerminee(supabase, e.id, true);
      const { data, error } = await supabase
        .from("evenements_planning")
        .update({ statut: "termine" })
        .eq("id", e.id)
        .select("id");
      return !error && !!data && data.length > 0;
    },
    async demain(e) {
      if (e.genre === "note") {
        // Le rappel sonnera de nouveau demain matin (notification et
        // fenêtre « Compris ») : on efface les marques « déjà notifié » et
        // « déjà vu » posées par le rappel d'aujourd'hui.
        const { error } = await supabase
          .from("notes")
          .update({ rappel_a: demainMatin().toISOString(), notifie_a: null, vu_le: null })
          .eq("id", e.id);
        return !error;
      }
      const { data, error } = await supabase
        .from("evenements_planning")
        .update({ date_heure: demainMemeHeure(e.date).toISOString() })
        .eq("id", e.id)
        .select("id");
      return !error && !!data && data.length > 0;
    },
  };
}

export function FermerJournee({ fermeture, actions }: { fermeture: Fermeture; actions?: Actions }) {
  const router = useRouter();
  const [agir] = useState<Actions>(() => actions ?? actionsSupabase());
  const [regles, setRegles] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);

  const restants = fermeture.suspens.filter((e) => !regles.has(e.cle));

  async function traiter(e: ElementSuspens, quoi: keyof Actions) {
    if (enCours) return;
    setEnCours(e.cle);
    setErreur(false);
    // L'élément disparaît tout de suite ; il revient si l'enregistrement
    // échoue — rien ne disparaît à tort.
    setRegles((s) => new Set(s).add(e.cle));
    const ok = await agir[quoi](e);
    setEnCours(null);
    if (!ok) {
      setRegles((s) => {
        const n = new Set(s);
        n.delete(e.cle);
        return n;
      });
      setErreur(true);
      return;
    }
    router.refresh();
  }

  // L'état calme, de lui-même, dès que plus rien n'est en suspens.
  if (restants.length === 0) {
    return (
      <section aria-label="Fermer la journée" className="mt-5 flex items-start gap-3.5 rounded-2xl bg-surface px-5 py-5 ring-1 ring-ink/10">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-succes/12 text-succes">
          <IconeCoche className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold text-ink">Tout est réglé pour aujourd&apos;hui.</span>
          {fermeture.bilan.length > 0 && (
            <span className="mt-0.5 block text-[13.5px] text-ink/65">Aujourd&apos;hui · {fermeture.bilan.join(" · ")}</span>
          )}
          <span className="mt-0.5 block truncate text-[13.5px] text-ink/65">
            Demain · {fermeture.demain ?? "rien de prévu"}
          </span>
        </span>
      </section>
    );
  }

  const visibles = restants.slice(0, LIGNES_MAX);
  const autres = restants.length - visibles.length;

  return (
    <section aria-label="Fermer la journée" className="mt-5 rounded-2xl bg-surface px-4 py-4 ring-1 ring-ink/10 sm:px-5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-steel">Fermer la journée</p>

      <dl className="mt-3 flex flex-col gap-3">
        {fermeture.bilan.length > 0 && (
          <Ligne titre="Aujourd'hui">
            {/* Un chiffre ne se coupe jamais : « 1 rendez-vous fait » reste
                sur une ligne, le retour se fait entre deux chiffres. */}
            <span className="flex flex-wrap gap-x-1.5 text-[15px] text-ink">
              {fermeture.bilan.map((b, i) => (
                <span key={b} className="whitespace-nowrap">
                  {b}
                  {i < fermeture.bilan.length - 1 && <span className="ml-1.5 text-ink/35">·</span>}
                </span>
              ))}
            </span>
          </Ligne>
        )}

        {restants.length > 0 && (
          <Ligne titre="En suspens">
            <ul className="flex flex-col gap-2">
              {visibles.map((e) => (
                <li key={e.cle} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{e.principal}</span>
                    {e.secondaire && <span className="block truncate text-[13px] text-ink/65">{e.secondaire}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => traiter(e, "fait")}
                    disabled={enCours !== null}
                    aria-label={`Fait : ${e.principal}`}
                    className="min-h-12 shrink-0 rounded-xl bg-ink px-3.5 text-[15px] font-semibold text-paper transition motion-safe:active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
                  >
                    Fait
                  </button>
                  <button
                    type="button"
                    onClick={() => traiter(e, "demain")}
                    disabled={enCours !== null}
                    aria-label={
                      e.genre === "note"
                        ? `Demain matin : ${e.principal}`
                        : `Déplacer à demain, même heure : ${e.principal}`
                    }
                    className="min-h-12 shrink-0 rounded-xl px-3 text-[15px] font-medium text-ink ring-1 ring-ink/15 transition motion-safe:active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
                  >
                    Demain
                  </button>
                </li>
              ))}
            </ul>
            {autres > 0 && <p className="mt-2 text-[13px] text-ink/65">Et {autres} de plus.</p>}
            {erreur && <p className="mt-2 text-[13px] text-signal-fonce dark:text-signal-clair">Pas enregistré. Réessayez.</p>}
          </Ligne>
        )}

        <Ligne titre="Demain">
          <span className="block truncate text-[15px] text-ink">{fermeture.demain ?? "Rien de prévu"}</span>
        </Ligne>
      </dl>
    </section>
  );
}

function Ligne({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="border-t border-ink/[0.07] pt-3 first:border-t-0 first:pt-0">
      <dt className="text-[13px] font-medium text-steel">{titre}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
