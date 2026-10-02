"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { statutAffiche } from "@/lib/devis/statut";
import { dateLongue, formatMontant } from "@/lib/devis/modeleDocument";
import type { Devis, EvenementPlanning, EvenementProjet, Note, NoteVocale, Priorite, Projet } from "@/types";
import { AFaire, ARetenir, Dossier, Maintenant } from "./Blocs";
import { Carnet } from "./Carnet";
import { construireCarnet } from "./entreesCarnet";
import { EnTeteProjet, type EntreeMenu } from "./EnTeteProjet";
import { Feuille } from "./Feuille";
import { IconeCalendrier, IconeCrayon, IconeMicro, IconePhoto, IconePlus } from "./icones";
import { prochaineAction, type IdAction } from "./prochaineAction";
import { Visionneuse } from "./Visionneuse";
import { FeuilleMessageClient, tracerMessagePrepare, type DemandeMessage } from "./FeuilleMessageClient";
import { accuse, ouvrirMessage, type CleMessage, type Signature } from "@/lib/messagesClient";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// La fiche projet (24/09) — « le Point et le Carnet ».
//
// En haut, ce qui est vrai maintenant, en taille fixe quel que soit l'âge
// du chantier :
//   - Maintenant : la situation en une phrase, la prochaine action ;
//   - À faire    : seulement ce qui est encore ouvert (rendez-vous à venir,
//                  tâches, rappels) ;
//   - À retenir  : le mémo de l'artisan, la demande, le résumé IA ;
//   - Dossier    : le devis, la facturation, les photos, le client.
// En dessous, le Carnet : tout ce qui a été dicté, photographié, envoyé,
// signé — un seul fil, le plus récent d'abord, les mois anciens repliés,
// avec une recherche.
//
// Et un seul geste pour ajouter quoi que ce soit : le « + » de la barre
// de navigation, qui sur cette page ajoute au projet.
//
// Ce composant ne parle pas à la base : la page lui donne les données, les
// actions, et les formulaires existants (dictée, photos, note, factures)
// qu'il place dans des feuilles.
// ============================================================

type ModeAjout = "choix" | "vocal" | "note";

/** « 4 mai » cette année, « 4 mai 2025 » sinon : la date tient sur une ligne. */
function dateSansAnnee(iso: string, maintenant: Date) {
  const annee = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", year: "numeric" });
  if (annee(new Date(iso)) !== annee(maintenant)) return dateLongue(iso);
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
}

export type RendusVueProjet = {
  /** La dictée (NotesVocales sans sa liste). `fermer` à appeler une fois
   *  la note enregistrée. */
  vocal: (fermer: () => void) => ReactNode;
  /** Ajout et gestion des photos (PhotosProjet). */
  photos: ReactNode;
  /** Une note ou un rappel (FormulaireNote). */
  note: (fermer: () => void) => ReactNode;
  /** Téléphone, adresse, type de chantier. */
  infos: (fermer: () => void) => ReactNode;
  /** La facturation (FacturesProjet), dans le Dossier. */
  factures: ReactNode;
  /** Le message d'erreur du mémo « À retenir », s'il y en a un. */
  erreurMemo: ReactNode;
  /** Propositions de l'IA en attente de réponse. */
  propositionUrgence?: ReactNode;
  propositionTaches?: ReactNode;
  /** Sous « Maintenant », quand il y a lieu (rappel de suivi…). */
  apresMaintenant?: ReactNode;
};

export function VueProjet({
  projet,
  devis,
  notesVocales,
  notes,
  evenements,
  rendezVous,
  urlsPhotos,
  nbAutresProjetsClient,
  checklistMetier,
  peutAnalyser,
  analyseAJour,
  maintenant,
  chargement,
  erreur,
  surAction,
  surTerminerNote,
  surChangerPriorite,
  surMarquerVisite,
  surPreparerReponse,
  memo,
  lienPlanifier,
  rendus,
  signature,
}: {
  /** Pour signer les messages au client (nom de l'artisan, entreprise). */
  signature?: Signature;
  projet: Projet;
  devis: Devis | null;
  notesVocales: NoteVocale[];
  notes: Note[];
  evenements: EvenementProjet[];
  rendezVous: EvenementPlanning[];
  urlsPhotos: Record<string, string>;
  nbAutresProjetsClient: number | null;
  checklistMetier: string[] | null;
  peutAnalyser: boolean;
  analyseAJour: boolean;
  maintenant: Date;
  chargement: Partial<Record<IdAction, boolean>>;
  erreur: string | null;
  surAction: (id: IdAction) => void;
  surTerminerNote: (id: string, terminee: boolean) => void;
  surChangerPriorite: (p: Priorite) => void;
  surMarquerVisite: () => void;
  surPreparerReponse: () => void;
  memo: { valeur: string; surChanger: (v: string) => void; surEnregistrer: () => void; enregistre: boolean };
  lienPlanifier: string;
  rendus: RendusVueProjet;
}) {
  const [ajout, setAjout] = useState<ModeAjout | null>(null);
  const [photosOuvertes, setPhotosOuvertes] = useState(false);
  const [infosOuvertes, setInfosOuvertes] = useState(false);
  const [visionneuse, setVisionneuse] = useState<{ chemins: string[]; index: number } | null>(null);
  // 26/09 (lot D) — la feuille « Message au client ». Elle s'ouvre aussi
  // toute seule quand on arrive d'une notification ou du bouton Relancer
  // de l'accueil (?message=relancePaiement&facture=…), et la fiche propose
  // « Répondre : bien reçu » quand on arrive d'une capture (?cree=1).
  const [messageOuvert, setMessageOuvert] = useState(false);
  const [demandeMessage, setDemandeMessage] = useState<DemandeMessage | null>(null);
  const [vientDEtreCree, setVientDEtreCree] = useState(false);
  // Refonte (02/10, duel D lot 1) — terminer un chantier est irréversible
  // (aucune action ne le rouvre) : une question avant, depuis « Maintenant »
  // comme depuis « … ». Règle 6 de docs/langage-interface.md.
  const [confirmerFin, setConfirmerFin] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cle = p.get("message") as CleMessage | null;
    if (cle === "relancePaiement" || cle === "relanceDevis") {
      setDemandeMessage({ cle, factureId: p.get("facture"), devisId: p.get("devis") });
      setMessageOuvert(true);
    }
    if (p.get("cree") === "1") setVientDEtreCree(true);
    if (cle || p.get("cree")) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const dejaContacte = evenements.some((e) => e.type === "message_prepare");

  // 26/09 — le [+] de la barre de navigation (Sidebar.tsx) ajoute à CE
  // projet quand on est sur sa fiche : un seul bouton pour ajouter, pas
  // deux « + » à l'écran.
  useEffect(() => {
    const surCapture = (e: Event) => {
      e.preventDefault();
      setAjout("choix");
    };
    window.addEventListener("compyo:capture", surCapture);
    // 27/09 — Et le [+] le dit : « Ajouter » (voir Sidebar.tsx).
    document.documentElement.dataset.captureLibelle = "Ajouter";
    window.dispatchEvent(new Event("compyo:capture-libelle"));
    return () => {
      window.removeEventListener("compyo:capture", surCapture);
      delete document.documentElement.dataset.captureLibelle;
      window.dispatchEvent(new Event("compyo:capture-libelle"));
    };
  }, []);

  const photos = projet.photos ?? [];
  const taches = useMemo(
    () =>
      notes
        .filter((n) => n.statut === "active")
        .sort((a, b) => {
          // En retard d'abord, puis par rappel, puis les plus importantes.
          const ra = a.rappel_a ? Date.parse(a.rappel_a) : Infinity;
          const rb = b.rappel_a ? Date.parse(b.rappel_a) : Infinity;
          if (ra !== rb) return ra - rb;
          const poids = { rouge: 0, orange: 1, verte: 2 } as const;
          return poids[a.importance] - poids[b.importance];
        }),
    [notes]
  );
  const rdvAVenir = useMemo(
    () =>
      rendezVous
        .filter((r) => r.statut !== "annule" && r.statut !== "termine" && new Date(r.date_heure) > maintenant)
        .sort((a, b) => Date.parse(a.date_heure) - Date.parse(b.date_heure)),
    [rendezVous, maintenant]
  );

  const entrees = useMemo(
    () =>
      construireCarnet({
        notesVocales,
        photos,
        datePhotosRepli: projet.photos_ajoutees_le ?? projet.created_at,
        notes,
        evenements,
        rendezVous,
        maintenant,
      }),
    [notesVocales, photos, projet.photos_ajoutees_le, projet.created_at, notes, evenements, rendezVous, maintenant]
  );

  const avantDevis = !devis || devis.statut === "brouillon";
  const analyse = projet.questions_manquantes;
  const infosManquantes = (analyse?.informations_manquantes ?? []).filter(
    (info) => !(/photo/i.test(info) && photos.length > 0)
  );

  const point = prochaineAction({
    statut: projet.statut,
    devis,
    derniereModification: projet.derniere_modification_le,
    demarreLe: projet.demarre_le,
    termineLe: projet.termine_le,
    prochainRdv: rdvAVenir[0] ?? null,
    // Le même nombre que l'en-tête « À faire » : tâches et rendez-vous.
    nbTaches: taches.length + rdvAVenir.length,
    nbInfosManquantes: avantDevis ? infosManquantes.length : 0,
    peutAnalyser,
    analyseAJour,
    maintenant,
  });

  const agir = (id: IdAction) => {
    if (id === "ajouter") return setAjout("choix");
    if (id === "terminer") return setConfirmerFin(true);
    if (id === "facturation") {
      document.getElementById("facturation")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    surAction(id);
  };

  const menu: EntreeMenu[] = [
    { type: "action", libelle: "Modifier les infos du client", surChoisir: () => setInfosOuvertes(true) },
    { type: "priorite", valeur: projet.priorite ?? "normal", surChoisir: surChangerPriorite },
    { type: "separateur" },
    { type: "lien", libelle: "Planifier un rendez-vous", href: lienPlanifier },
    ...(!projet.visite_le ? [{ type: "action" as const, libelle: "Marquer la visite effectuée", surChoisir: surMarquerVisite }] : []),
    { type: "action", libelle: "Préparer un message au client", surChoisir: surPreparerReponse },
    ...(peutAnalyser && !analyseAJour ? [{ type: "action" as const, libelle: "Résumer mes notes avec l'IA", surChoisir: () => surAction("analyser") }] : []),
    ...(!devis ? [{ type: "action" as const, libelle: "Devis express (sans IA)", surChoisir: () => surAction("devis_express") }] : []),
    ...(projet.statut !== "termine"
      ? [{ type: "separateur" as const }, { type: "action" as const, libelle: "Marquer le projet comme terminé", surChoisir: () => setConfirmerFin(true), attention: true }]
      : []),
  ];

  const typeChantier = LABEL_TYPE_CHANTIER[projet.type_chantier] || "";
  const sousTitre = [typeChantier, projet.adresse_client].filter(Boolean).join(" · ");
  const statutDevis = devis ? statutAffiche(devis, projet.statut) : null;

  // Tablette ou téléphone en paysage (27/09) : 44 px de haut au doigt,
  // rien ne change à la souris.
  const barreAjout = (
    <>
      {/* Téléphone (27/09, Axel) : ajouter une note se fait là où on voit
          les notes — le Carnet —, pas seulement par le [+] du bas. */}
      <button
        type="button"
        onClick={() => setAjout("choix")}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium text-ink ring-1 ring-ink/15 sm:hidden"
      >
        <IconePlus className="h-4 w-4" /> Ajouter
      </button>
      <div className="hidden items-center gap-1.5 sm:flex">
        <button type="button" onClick={() => setAjout("vocal")} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink transition hover:border-ink/25 [@media(pointer:coarse)]:min-h-11">
          <IconeMicro className="h-4 w-4 text-signal" /> Dicter
        </button>
        <button type="button" onClick={() => setPhotosOuvertes(true)} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink transition hover:border-ink/25 [@media(pointer:coarse)]:min-h-11">
          <IconePhoto className="h-4 w-4 text-signal" /> Photos
        </button>
        <button type="button" onClick={() => setAjout("note")} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-surface px-3.5 py-2 text-[13.5px] font-medium text-ink transition hover:border-ink/25 [@media(pointer:coarse)]:min-h-11">
          <IconeCrayon className="h-4 w-4 text-signal" /> Note
        </button>
      </div>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-8 sm:pb-16 sm:pt-8">
      <EnTeteProjet
        nomClient={projet.nom_client}
        sousTitre={sousTitre}
        telephone={projet.telephone_client}
        adresse={projet.adresse_client}
        priorite={projet.priorite ?? "normal"}
        statut={projet.statut}
        entreesMenu={menu}
        surMessage={() => {
          setDemandeMessage(null);
          setMessageOuvert(true);
        }}
      />

      {/* Juste après une capture : un seul geste pour rassurer le client,
          par le canal qu'il a utilisé (un message partagé depuis WhatsApp
          appelle une réponse sur WhatsApp). */}
      {vientDEtreCree && projet.telephone_client && !dejaContacte && (
        <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-ink/10 sm:max-w-md">
          <p className="text-[15px] font-medium text-ink">Répondre « bien reçu »</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["sms", "whatsapp"] as const).map((canal) => (
              <button
                key={canal}
                type="button"
                onClick={() => {
                  const texte = accuse({ signature });
                  if (ouvrirMessage(canal, projet.telephone_client as string, texte)) {
                    tracerMessagePrepare(createClient(), { demandeId: projet.id, cle: "accuse", canal });
                    setVientDEtreCree(false);
                  }
                }}
                className={`min-h-12 rounded-xl text-[15px] font-semibold transition motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                  canal === "sms" ? "bg-ink text-paper" : "text-ink ring-1 ring-ink/15"
                }`}
              >
                {canal === "sms" ? "SMS" : "WhatsApp"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Téléphone : une colonne, dans l'ordre d'usage. Ordinateur : le
          Point et le Carnet à gauche, le mémo et le dossier à droite, qui
          restent sous les yeux pendant qu'on fait défiler le Carnet. */}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="lg:col-start-1 lg:row-start-1">
          <Maintenant
            point={point}
            surAction={agir}
            chargement={chargement}
            erreur={erreur}
            propositions={
              <>
                {rendus.propositionUrgence}
                {rendus.apresMaintenant}
              </>
            }
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <AFaire
            rdvAVenir={rdvAVenir}
            taches={taches}
            surTerminer={surTerminerNote}
            surAjouter={() => setAjout("note")}
            avantDeChiffrer={
              avantDevis
                ? { infos: infosManquantes, questions: analyse?.questions_suggerees ?? [], checklist: checklistMetier ?? [] }
                : null
            }
            proposition={rendus.propositionTaches}
          />
        </div>
        <div className="space-y-4 sm:space-y-5 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <ARetenir
            memo={memo.valeur}
            surChangerMemo={memo.surChanger}
            surEnregistrerMemo={memo.surEnregistrer}
            enregistre={memo.enregistre}
            erreur={rendus.erreurMemo}
            description={projet.description}
            resumeIA={analyse?.resume ?? null}
            dateResume={projet.derniere_analyse_le}
          />
          <Dossier
            devis={
              devis && statutDevis
                ? {
                    numero: devis.numero,
                    statut: statutDevis,
                    montant: formatMontant(devis.total_estime),
                    date: devis.envoye_le ? `envoyé le ${dateSansAnnee(devis.envoye_le, maintenant)}` : null,
                  }
                : null
            }
            surOuvrirDevis={() => agir("ouvrir_devis")}
            nbPhotos={photos.length}
            vignettes={photos.slice(-3).reverse().map((c) => urlsPhotos[c]).filter(Boolean)}
            surOuvrirPhotos={() => setPhotosOuvertes(true)}
            client={{
              lignes: [projet.telephone_client, projet.email_client, projet.adresse_client].filter((l): l is string => Boolean(l)),
              autresChantiers: nbAutresProjetsClient,
            }}
            surModifierClient={() => setInfosOuvertes(true)}
          />
          {rendus.factures && (
            <div id="facturation" className="scroll-mt-6 [&>div]:!mt-0">
              {rendus.factures}
            </div>
          )}
        </div>
        <div className="pt-4 lg:col-start-1 lg:row-start-3 lg:pt-6">
          <Carnet
            entrees={entrees}
            urlsPhotos={urlsPhotos}
            surOuvrirPhoto={(chemins, index) => setVisionneuse({ chemins, index })}
            maintenant={maintenant}
            barreAjout={barreAjout}
          />
        </div>
      </div>


      <Feuille
        ouverte={ajout !== null}
        titre={ajout === "vocal" ? "Dicter une note" : ajout === "note" ? "Note ou rappel" : "Ajouter au projet"}
        surFermer={() => setAjout(null)}
      >
        {ajout === "choix" && (
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { cle: "vocal", libelle: "Dicter", sous: "Une note vocale", icone: <IconeMicro className="h-6 w-6" />, faire: () => setAjout("vocal") },
                { cle: "photos", libelle: "Photos", sous: "Prendre ou choisir", icone: <IconePhoto className="h-6 w-6" />, faire: () => { setAjout(null); setPhotosOuvertes(true); } },
                { cle: "note", libelle: "Note", sous: "Écrite, avec rappel", icone: <IconeCrayon className="h-6 w-6" />, faire: () => setAjout("note") },
              ] as const
            ).map((t) => (
              <button
                key={t.cle}
                type="button"
                onClick={t.faire}
                className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-ink/10 transition hover:ring-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-signal/10 text-signal">{t.icone}</span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{t.libelle}</span>
                  <span className="block text-[13px] text-ink/55">{t.sous}</span>
                </span>
              </button>
            ))}
            <Link
              href={lienPlanifier}
              className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-ink/10 transition hover:ring-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-signal/10 text-signal">
                <IconeCalendrier className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-ink">Rendez-vous</span>
                <span className="block text-[13px] text-ink/55">Dans le planning</span>
              </span>
            </Link>
          </div>
        )}
        {ajout === "vocal" && rendus.vocal(() => setAjout(null))}
        {ajout === "note" && rendus.note(() => setAjout(null))}
      </Feuille>

      <Feuille ouverte={photosOuvertes} titre={`Photos du projet · ${photos.length}`} surFermer={() => setPhotosOuvertes(false)} large>
        {rendus.photos}
      </Feuille>

      <Feuille ouverte={infosOuvertes} titre="Infos du client" surFermer={() => setInfosOuvertes(false)}>
        {rendus.infos(() => setInfosOuvertes(false))}
      </Feuille>

      {visionneuse && (
        <Visionneuse chemins={visionneuse.chemins} depart={visionneuse.index} urls={urlsPhotos} surFermer={() => setVisionneuse(null)} />
      )}

      <FeuilleMessageClient
        ouverte={messageOuvert}
        surFermer={() => setMessageOuvert(false)}
        demandeId={projet.id}
        demande={demandeMessage}
      />

      <Feuille ouverte={confirmerFin} titre="Chantier terminé ?" surFermer={() => setConfirmerFin(false)}>
        <p className="text-base text-steel">Le projet quitte la liste des chantiers en cours.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirmerFin(false);
              surAction("terminer");
            }}
            className="min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Oui, chantier terminé
          </button>
          <button
            type="button"
            onClick={() => setConfirmerFin(false)}
            className="min-h-12 w-full px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
          >
            Pas encore
          </button>
        </div>
      </Feuille>
    </div>
  );
}
