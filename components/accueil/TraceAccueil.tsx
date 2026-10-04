"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconeCoche } from "@/components/projet/icones";
import { vibrer, vibrerEchec } from "@/lib/retour";
import { CLASSE_BOUTON_TEXTE, CLASSE_CARTE_BLOC, CLASSE_FIN_TEXTE, LIGNES_MAX, TitreBloc } from "./Blocs";

// ============================================================
// Fait, trace, repos (refonte 03/10 — duel C lot 4, duel H lot 3 ; règles
// 13, 15 et 16 de docs/langage-interface.md).
//
// Chaque geste de l'accueil (✓, Demain, Pas fait, Oui, Pas encore) passe
// par ici :
//   1. l'écriture part ; la ligne reste, son bouton grisé : rien ne
//      s'affiche comme réussi avant d'avoir lu le résultat ;
//   2. réussie : le téléphone vibre, la ligne devient une trace
//      (« Fait : … · Annuler »), puis l'accueil se recalcule ;
//   3. ratée : deux vibrations, la ligne revient avec « Pas enregistré »
//      et « Réessayer » à la place de ses boutons.
//
// La trace vit dans ce composant, monté une fois pour toutes par
// VueAccueil : router.refresh() recalcule les blocs (qui peuvent se vider
// et disparaître) sans l'effacer. Elle reste jusqu'à ce qu'on quitte
// l'écran ou qu'on fasse un autre geste ; il n'y a pas de minuteur.
// « Annuler » n'existe que si le retour en arrière est une écriture qui
// existe déjà (décocher une note, remettre une tâche « à faire ») ;
// sinon la question a été posée avant, et la trace n'a pas d'« Annuler ».
// ============================================================

export type BlocTrace = "aujourdhui" | "aregler";

export type Trace = {
  bloc: BlocTrace;
  /** La ligne d'origine, masquée tant que la trace est là. */
  cle: string;
  texte: string;
  annuler?: () => Promise<boolean>;
  lien?: { libelle: string; href?: string; surClic?: () => void };
};

export type Geste = Omit<Trace, "cle"> & { cle: string; ecrire: () => Promise<boolean> };

type Contexte = {
  trace: Trace | null;
  erreurTrace: boolean;
  masques: Set<string>;
  erreurs: Map<string, () => void>;
  enCours: string | null;
  faire: (g: Geste) => Promise<void>;
  /** Un geste déjà écrit ailleurs (la feuille « Déplacer ») : seulement la trace. */
  poserTrace: (t: Trace) => void;
  annuler: () => Promise<void>;
};

const Ctx = createContext<Contexte | null>(null);

export function useTraceAccueil(): Contexte {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTraceAccueil hors de TraceAccueil");
  return c;
}

export function TraceAccueil({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [erreurTrace, setErreurTrace] = useState(false);
  const [masques, setMasques] = useState<Set<string>>(new Set());
  const [erreurs, setErreurs] = useState<Map<string, () => void>>(new Map());
  const [enCours, setEnCours] = useState<string | null>(null);

  const masquer = (cle: string, oui: boolean) =>
    setMasques((s) => {
      const n = new Set(s);
      if (oui) n.add(cle);
      else n.delete(cle);
      return n;
    });
  const noterErreur = (cle: string, reessayer: (() => void) | null) =>
    setErreurs((m) => {
      const n = new Map(m);
      if (reessayer) n.set(cle, reessayer);
      else n.delete(cle);
      return n;
    });

  function poserTrace(t: Trace) {
    masquer(t.cle, true);
    noterErreur(t.cle, null);
    setErreurTrace(false);
    setTrace(t);
    router.refresh();
  }

  async function faire(g: Geste) {
    if (enCours) return;
    setEnCours(g.cle);
    noterErreur(g.cle, null);
    const ok = await g.ecrire().catch(() => false);
    setEnCours(null);
    if (!ok) {
      vibrerEchec();
      noterErreur(g.cle, () => void faire(g));
      return;
    }
    vibrer();
    poserTrace({ bloc: g.bloc, cle: g.cle, texte: g.texte, annuler: g.annuler, lien: g.lien });
  }

  async function annuler() {
    if (!trace?.annuler || enCours) return;
    setEnCours(trace.cle);
    const ok = await trace.annuler().catch(() => false);
    setEnCours(null);
    if (!ok) {
      vibrerEchec();
      setErreurTrace(true);
      return;
    }
    vibrer();
    masquer(trace.cle, false);
    setTrace(null);
    router.refresh();
  }

  return (
    <Ctx.Provider value={{ trace, erreurTrace, masques, erreurs, enCours, faire, poserTrace, annuler }}>
      {children}
      {/* Ce qui vient de changer, pour un lecteur d'écran (règle 18). */}
      <p className="sr-only" aria-live="polite">
        {trace ? trace.texte : ""}
      </p>
    </Ctx.Provider>
  );
}

/** La trace d'un geste : « Fait : … · Annuler », « Déplacé au ven. 14h · Prévenir ». */
function LigneTrace() {
  const { trace, erreurTrace, enCours, annuler } = useTraceAccueil();
  if (!trace) return null;
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-succes/10 pl-4 text-sm text-ink">
      <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-succes/10 text-succes">
        <IconeCoche className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{trace.texte}</span>
      {erreurTrace && (
        <span className="shrink-0 text-sm font-semibold text-signal-fonce dark:text-signal-clair">Pas enregistré</span>
      )}
      {trace.annuler && (
        <button type="button" onClick={() => void annuler()} disabled={enCours !== null} className={`${CLASSE_BOUTON_TEXTE} shrink-0 disabled:opacity-60`}>
          {erreurTrace ? "Réessayer" : "Annuler"}
        </button>
      )}
      {trace.lien &&
        (trace.lien.href ? (
          <Link href={trace.lien.href} className={`${CLASSE_BOUTON_TEXTE} shrink-0`}>
            {trace.lien.libelle}
          </Link>
        ) : (
          <button type="button" onClick={trace.lien.surClic} className={`${CLASSE_BOUTON_TEXTE} shrink-0`}>
            {trace.lien.libelle}
          </button>
        ))}
    </div>
  );
}

/** Un bloc de l'accueil avec sa trace : le titre et son nombre, la trace du
 *  dernier geste fait ici, cinq lignes au plus puis « Voir les N » (sur
 *  place, ou vers `lienTous`). Sans ligne, il ne reste que la trace. */
export function BlocAvecTrace({
  bloc,
  titre,
  lignes,
  lienTous,
  icone,
}: {
  bloc: BlocTrace;
  titre: string;
  lignes: ReactNode[];
  lienTous?: string;
  icone?: ReactNode;
}) {
  const { trace } = useTraceAccueil();
  const [ouvert, setOuvert] = useState(false);
  const avecTrace = trace?.bloc === bloc;

  if (lignes.length === 0) {
    return avecTrace ? (
      <div className="mt-7">
        <LigneTrace />
      </div>
    ) : null;
  }

  const visibles = ouvert ? lignes : lignes.slice(0, LIGNES_MAX);
  return (
    <section className={CLASSE_CARTE_BLOC} aria-label={titre}>
      <TitreBloc titre={titre} nombre={lignes.length} icone={icone} />
      <div className="mt-2.5 flex flex-col gap-2">
        {avecTrace && <LigneTrace />}
        {visibles}
      </div>
      {lignes.length > LIGNES_MAX &&
        !ouvert &&
        (lienTous ? (
          <Link href={lienTous} className={`-ml-3 mt-1 ${CLASSE_BOUTON_TEXTE}`}>
            Voir les {lignes.length}
          </Link>
        ) : (
          <button type="button" onClick={() => setOuvert(true)} aria-expanded={false} className={`-ml-3 mt-1 ${CLASSE_BOUTON_TEXTE}`}>
            Voir les {lignes.length}
          </button>
        ))}
    </section>
  );
}

/** La coche d'une ligne (colonne de fin de 56 px, règle 7). */
export function FinCoche({ libelle, surFait, occupe }: { libelle: string; surFait: () => void; occupe: boolean }) {
  return (
    <button
      type="button"
      onClick={surFait}
      disabled={occupe}
      aria-label={`Fait : ${libelle}`}
      className="group grid w-14 shrink-0 place-items-center border-l border-ink/15 active:bg-ink/10 sm:hover:bg-ink/5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-ink/40 text-transparent group-active:border-succes group-active:bg-succes/10 group-active:text-succes sm:group-hover:text-steel">
        <IconeCoche className="h-4 w-4" />
      </span>
    </button>
  );
}

/** Une action en toutes lettres en fin de ligne (Demain, Pas fait, Oui…). */
export function FinMot({ libelle, aria, surClic, occupe }: { libelle: string; aria?: string; surClic: () => void; occupe: boolean }) {
  return (
    <button type="button" onClick={surClic} disabled={occupe} aria-label={aria} className={`${CLASSE_FIN_TEXTE} disabled:opacity-60`}>
      {libelle}
    </button>
  );
}
