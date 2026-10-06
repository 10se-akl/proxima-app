"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { statutAffiche } from "@/lib/devis/statut";
import { dateLongue, formatMontant } from "@/lib/devis/modeleDocument";
import type { Devis, EvenementPlanning, EvenementProjet, Note, NoteVocale, Priorite, Projet } from "@/types";
import { AFaire, ARetenir, Argent, BandeAjout, ListeConseils, Maintenant } from "./Blocs";
import { Carnet, ID_RECHERCHE_CARNET } from "./Carnet";
import { construireCarnet } from "./entreesCarnet";
import { EnTeteProjet, type EntreeMenu } from "./EnTeteProjet";
import { Feuille } from "./Feuille";
import { IconeCalendrier, IconeCrayon, IconeMicro, IconePhoto } from "./icones";
import { prochaineAction, type IdAction } from "./prochaineAction";
import { Visionneuse } from "./Visionneuse";
import { FeuilleMessageClient, tracerMessagePrepare, type DemandeMessage } from "./FeuilleMessageClient";
import { accuse as accuse_, ouvrirMessage, rappelRdv, type CleMessage, type Signature } from "@/lib/messagesClient";
import { FeuillePlanifier } from "@/components/planning/FeuillePlanifier";
import { BOUTON_CONTOUR, FOCUS } from "./Blocs";
import { IconeCoche } from "./icones";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// La fiche projet (24/09) — « le Point et le Carnet ».
//
// Refonte (03/10, duel D) — un ordre fixe, le même pour tout projet ; un
// bloc vide ne s'affiche pas :
//   - Maintenant : la situation en une phrase, un bouton plein au plus
//                  (« Bien reçu » juste après une capture) ;
//   - la bande Photo · Dicter · Note ;
//   - À faire    : ce qui est encore ouvert (rendez-vous, tâches), et
//                  avant le devis « À vérifier avant de chiffrer · N » ;
//   - À retenir  : le mémo seul ;
//   - Argent     : la ligne du devis, puis la facturation (#facturation) ;
//   - Carnet     : « Photos · N », puis tout ce qui a été dicté,
//                  photographié, envoyé, signé — la demande du client en
//                  plus ancienne entrée —, replié, avec une recherche.
//
// Pour ajouter : la bande Photo · Dicter · Note sous « Maintenant »
// (refonte 03/10, duel D lot 2), et le « + » de la barre de navigation,
// qui sur cette page ajoute au projet.
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
  /** Ajout et gestion des photos (PhotosProjet) : la feuille « Photos ». */
  photos: ReactNode;
  /** Refonte (03/10, duel D lot 2) — la prise de vue directe : le champ de
   *  l'appareil (à poser hors des feuilles), son identifiant (la tuile
   *  « Photo » en est l'étiquette), l'envoi en cours, et la trace ou
   *  l'erreur à montrer là où était le doigt. */
  capture: { idChamp: string; envoi: boolean; champ: ReactNode; etat: (surVoir: () => void) => ReactNode };
  /** Une note ou un rappel (FormulaireNote). */
  note: (fermer: () => void) => ReactNode;
  /** Téléphone, adresse, type de chantier. */
  infos: (fermer: () => void) => ReactNode;
  /** La facturation (FacturesProjet), entière, dans le bloc « Argent ». */
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
  surRdvPlanifie,
  rendus,
  signature,
  resteAFacturer = null,
  auteurs,
}: {
  /** Refonte (03/10, duel A lot 4) — les prénoms des autres membres qui
   *  ont écrit sur ce projet (jamais l'utilisateur connecté). */
  auteurs?: Record<string, string>;
  /** Refonte (03/10, duel D lot 3) — le solde du devis signé que
   *  FacturesProjet remonte (null tant qu'il n'est pas connu). */
  resteAFacturer?: number | null;
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
  /** 06/10 — un rendez-vous vient d'être planifié depuis la fiche : la page
   *  relit les rendez-vous et le carnet du projet (rien d'autre). */
  surRdvPlanifie?: () => void;
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
  // Refonte (03/10, duel D lot 3) — « Bien reçu » est l'action de
  // Maintenant (plus une carte à part) : « cree » après une capture ou un
  // rendez-vous confirmé, « recu » après un message ajouté au projet.
  const [accuse, setAccuse] = useState<"cree" | "recu" | null>(null);
  // « À retenir » : le mémo seul. Vide, le bloc ne s'affiche pas ; il se
  // crée par « … › Écrire à retenir », puis reste là le temps de la visite.
  const [memoOuvert, setMemoOuvert] = useState(false);
  const [memoDemande, setMemoDemande] = useState(false);
  const [conseilsOuverts, setConseilsOuverts] = useState(false);
  // Refonte (02/10, duel D lot 1) — terminer un chantier est irréversible
  // (aucune action ne le rouvre) : une question avant, depuis « Maintenant »
  // comme depuis « … ». Règle 6 de docs/langage-interface.md.
  const [confirmerFin, setConfirmerFin] = useState(false);
  // 06/10 (« le compagnon ») — planifier un rendez-vous ne quitte plus la
  // fiche : la feuille « Quand ? » du planning s'ouvre ici, déjà remplie
  // (demain, à l'heure habituelle du projet). Une fois écrit, la fiche le
  // dit et propose de prévenir le client — rien ne part tout seul.
  const [planifierOuvert, setPlanifierOuvert] = useState(false);
  const [planifie, setPlanifie] = useState<{ trace: string; debut: string } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cle = p.get("message") as CleMessage | null;
    if (cle === "relancePaiement" || cle === "relanceDevis") {
      setDemandeMessage({ cle, factureId: p.get("facture"), devisId: p.get("devis") });
      setMessageOuvert(true);
    }
    if (p.get("cree") === "1") setAccuse("cree");
    // Refonte (03/10, duel E lot 3) — un message reçu ajouté à ce projet
    // (partage ou collage, « Ajouter à ce projet »).
    if (p.get("recu") === "1") setAccuse("recu");
    if (cle || p.get("cree") || p.get("recu")) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const dejaContacte = evenements.some((e) => e.type === "message_prepare");
  // Juste après une capture : seulement si le numéro est connu et que
  // personne n'a encore écrit au client. Après un message reçu sur un
  // projet existant : une fois, même si le client a déjà été contacté.
  const proposerAccuse =
    projet.telephone_client && (accuse === "recu" || (accuse === "cree" && !dejaContacte)) ? accuse : null;
  useEffect(() => {
    if (memo.valeur.trim()) setMemoOuvert(true);
  }, [memo.valeur]);

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
        auteurs,
        demande: {
          texte: projet.description,
          date: projet.created_at,
          resume: projet.questions_manquantes?.resume
            ? { texte: projet.questions_manquantes.resume, date: projet.derniere_analyse_le }
            : null,
        },
      }),
    [
      notesVocales,
      photos,
      projet.photos_ajoutees_le,
      projet.created_at,
      notes,
      evenements,
      rendezVous,
      maintenant,
      projet.description,
      projet.questions_manquantes?.resume,
      projet.derniere_analyse_le,
      auteurs,
    ]
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
    resteAFacturer,
    accuse: proposerAccuse,
  });
  const conseils = avantDevis
    ? { infos: infosManquantes, questions: analyse?.questions_suggerees ?? [], checklist: checklistMetier ?? [] }
    : null;
  const nbConseils = conseils ? conseils.infos.length + conseils.questions.length + conseils.checklist.length : 0;

  function envoyerAccuse(canal: "sms" | "whatsapp") {
    const texte = accuse_({ signature });
    if (projet.telephone_client && ouvrirMessage(canal, projet.telephone_client, texte)) {
      tracerMessagePrepare(createClient(), { demandeId: projet.id, cle: "accuse", canal });
      setAccuse(null);
    }
  }

  const agir = (id: IdAction) => {
    if (id === "ajouter") return setAjout("choix");
    if (id === "planifier") return setPlanifierOuvert(true);
    if (id === "terminer") return setConfirmerFin(true);
    if (id === "accuse_sms") return envoyerAccuse("sms");
    if (id === "accuse_whatsapp") return envoyerAccuse("whatsapp");
    if (id === "facturation") {
      document.getElementById("facturation")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    surAction(id);
  };

  // Refonte (03/10, duel D lot 1) — « Maintenant » n'a plus qu'un bouton
  // plein et un bouton texte : ses autres actions (Démarrer maintenant,
  // Facturer un acompte, Dupliquer le devis) arrivent ici, en tête. Et
  // « Préparer un message au client » quitte ce menu : le message passe
  // par une seule porte, « Message » dans l'en-tête, où l'IA est proposée
  // après les modèles prêts.
  const menu: EntreeMenu[] = [
    { type: "action", libelle: "Modifier les infos du client", surChoisir: () => setInfosOuvertes(true) },
    { type: "priorite", valeur: projet.priorite ?? "normal", surChoisir: surChangerPriorite },
    { type: "separateur" },
    ...point.dansMenu.map((a) => ({ type: "action" as const, libelle: a.libelle, surChoisir: () => agir(a.id) })),
    { type: "action", libelle: "Planifier un rendez-vous", surChoisir: () => setPlanifierOuvert(true) },
    ...(!projet.visite_le ? [{ type: "action" as const, libelle: "Marquer la visite effectuée", surChoisir: surMarquerVisite }] : []),
    ...(peutAnalyser && !analyseAJour ? [{ type: "action" as const, libelle: "Résumer mes notes avec l'IA", surChoisir: () => surAction("analyser") }] : []),
    ...(!devis ? [{ type: "action" as const, libelle: "Faire le devis moi-même", surChoisir: () => surAction("devis_express") }] : []),
    ...(!memoOuvert
      ? [{ type: "action" as const, libelle: "Écrire à retenir", surChoisir: () => { setMemoOuvert(true); setMemoDemande(true); } }]
      : []),
    ...(projet.statut !== "termine"
      ? [{ type: "separateur" as const }, { type: "action" as const, libelle: "Marquer le projet comme terminé", surChoisir: () => setConfirmerFin(true), attention: true }]
      : []),
  ];

  const typeChantier = LABEL_TYPE_CHANTIER[projet.type_chantier] || "";
  const sousTitre = [typeChantier, projet.adresse_client].filter(Boolean).join(" · ");
  const statutDevis = devis ? statutAffiche(devis, projet.statut) : null;
  // Après la signature, « changé depuis le devis signé » est le détail de
  // la ligne du devis (refonte 03/10, duel D lot 3).
  const engage = projet.statut === "accepte" || projet.statut === "en_cours" || projet.statut === "termine";
  const changeDepuisSigne =
    engage &&
    devis !== null &&
    Boolean(projet.derniere_modification_le) &&
    new Date(projet.derniere_modification_le as string) > new Date(devis.created_at);

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
        surChercher={
          entrees.length > 5
            ? () => {
                const champ = document.getElementById(ID_RECHERCHE_CARNET) as HTMLInputElement | null;
                champ?.scrollIntoView({ behavior: "smooth", block: "center" });
                champ?.focus({ preventScroll: true });
              }
            : undefined
        }
        surMessage={() => {
          setDemandeMessage(null);
          setMessageOuvert(true);
        }}
      />

      {/* Téléphone : une colonne, dans l'ordre d'usage. Ordinateur : le
          Point et le Carnet à gauche, le mémo et le dossier à droite, qui
          restent sous les yeux pendant qu'on fait défiler le Carnet. */}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
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
          <BandeAjout
            idChampPhoto={rendus.capture.idChamp}
            photoPleine={projet.statut === "en_cours" && !point.accuse}
            envoiPhotos={rendus.capture.envoi}
            surDicter={() => setAjout("vocal")}
            surNote={() => setAjout("note")}
          />
          {rendus.capture.etat(() => setPhotosOuvertes(true))}
          {planifie && (
            <RdvPlanifie
              trace={planifie.trace}
              telephone={projet.telephone_client}
              nomClient={projet.nom_client}
              surPrevenir={(canal) => {
                const texte = rappelRdv({ dateRdv: planifie.debut, adresse: projet.adresse_client, signature });
                if (projet.telephone_client && ouvrirMessage(canal, projet.telephone_client, texte)) {
                  tracerMessagePrepare(createClient(), { demandeId: projet.id, cle: "rappelRdv", canal });
                  setPlanifie(null);
                }
              }}
              surFermer={() => setPlanifie(null)}
            />
          )}
        </div>
        <div className="empty:hidden lg:col-start-1 lg:row-start-3">
          <AFaire
            rdvAVenir={rdvAVenir}
            taches={taches}
            surTerminer={surTerminerNote}
            aVerifier={conseils && nbConseils > 0 ? { nombre: nbConseils, surOuvrir: () => setConseilsOuverts(true) } : null}
            proposition={rendus.propositionTaches}
          />
        </div>
        <div className="space-y-4 empty:hidden sm:space-y-5 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-start">
          {memoOuvert && (
            <ARetenir
              memo={memo.valeur}
              surChangerMemo={memo.surChanger}
              surEnregistrerMemo={memo.surEnregistrer}
              enregistre={memo.enregistre}
              erreur={rendus.erreurMemo}
              focusAuMontage={memoDemande}
            />
          )}
          {devis && (
            <Argent
              devis={{
                numero: devis.numero,
                montant: `${formatMontant(devis.total_estime)} TTC`,
                detail: [
                  statutDevis?.texte,
                  devis.envoye_le ? `envoyé le ${dateSansAnnee(devis.envoye_le, maintenant)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                alerte: changeDepuisSigne ? "Changé depuis le devis signé" : null,
              }}
              surOuvrirDevis={() => agir("ouvrir_devis")}
              factures={rendus.factures}
            />
          )}
        </div>
        <div className="pt-4 lg:col-start-1 lg:row-start-4 lg:pt-6">
          <Carnet
            entrees={entrees}
            urlsPhotos={urlsPhotos}
            surOuvrirPhoto={(chemins, index) => setVisionneuse({ chemins, index })}
            maintenant={maintenant}
            photos={{
              nombre: photos.length,
              vignettes: photos.slice(-3).reverse().map((c) => urlsPhotos[c]).filter(Boolean),
              surOuvrir: () => setPhotosOuvertes(true),
            }}
          />
        </div>
      </div>


      {/* Hors de toute feuille : il doit encore exister quand l'appareil
          photo rend la main (une feuille fermée n'existe plus). */}
      {rendus.capture.champ}

      <Feuille
        ouverte={ajout !== null}
        titre={ajout === "vocal" ? "Dicter une note" : ajout === "note" ? "Note" : "Ajouter au projet"}
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
                className="flex min-h-16 flex-col items-start gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-ink/15 active:bg-ink/10 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:hover:bg-ink/5"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/10 text-ink">{t.icone}</span>
                <span>
                  <span className="block text-base font-semibold text-ink">{t.libelle}</span>
                  <span className="block text-sm text-steel">{t.sous}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAjout(null);
                setPlanifierOuvert(true);
              }}
              className="flex min-h-16 flex-col items-start gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-ink/15 active:bg-ink/10 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink sm:hover:bg-ink/5"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink/10 text-ink">
                <IconeCalendrier className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-base font-semibold text-ink">Rendez-vous</span>
                <span className="block text-sm text-steel">Demain, déjà rempli</span>
              </span>
            </button>
          </div>
        )}
        {ajout === "vocal" && rendus.vocal(() => setAjout(null))}
        {ajout === "note" && rendus.note(() => setAjout(null))}
      </Feuille>

      <FeuillePlanifier
        projet={planifierOuvert ? { id: projet.id, nom_client: projet.nom_client, type_chantier: projet.type_chantier } : null}
        surFermer={() => setPlanifierOuvert(false)}
        surPlanifie={(trace, debut) => {
          setPlanifierOuvert(false);
          setPlanifie({ trace, debut });
          surRdvPlanifie?.();
        }}
      />

      <Feuille ouverte={photosOuvertes} titre={`Photos du projet · ${photos.length}`} surFermer={() => setPhotosOuvertes(false)} large>
        {rendus.photos}
      </Feuille>

      {/* Greffe C (duel D, lot 3) : la demande du client, puis ce que
          l'analyse et le métier conseillent de vérifier. */}
      <Feuille ouverte={conseilsOuverts} titre="À vérifier avant de chiffrer" surFermer={() => setConseilsOuverts(false)}>
        <p className="text-sm text-steel">La demande</p>
        <p className="mt-1 whitespace-pre-line text-base text-ink">{projet.description}</p>
        {conseils && (
          <div className="mt-4 space-y-4 border-t border-ink/15 pt-4">
            {conseils.infos.length > 0 && <ListeConseils titre="Ce qui manque peut-être" lignes={conseils.infos} />}
            {conseils.questions.length > 0 && <ListeConseils titre="À demander au client" lignes={conseils.questions} />}
            {conseils.checklist.length > 0 && <ListeConseils titre="À vérifier sur place" lignes={conseils.checklist} />}
          </div>
        )}
      </Feuille>

      <Feuille ouverte={infosOuvertes} titre="Infos du client" surFermer={() => setInfosOuvertes(false)}>
        {(projet.email_client || (nbAutresProjetsClient ?? 0) > 0) && (
          <div className="mb-4 flex flex-col gap-1 text-base text-ink">
            {projet.email_client && <p className="truncate">{projet.email_client}</p>}
            {nbAutresProjetsClient !== null && nbAutresProjetsClient > 0 && (
              <p className="truncate text-sm text-steel">
                Déjà {nbAutresProjetsClient} autre{nbAutresProjetsClient > 1 ? "s" : ""} chantier{nbAutresProjetsClient > 1 ? "s" : ""} ensemble
              </p>
            )}
          </div>
        )}
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
        surEcrireAvecIA={() => {
          setMessageOuvert(false);
          surPreparerReponse();
        }}
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

/** 06/10 — juste après « Planifier » depuis la fiche : la trace du
 *  rendez-vous, et « Prévenir » le client, texte prêt dans ses SMS ou son
 *  WhatsApp. L'artisan envoie lui-même ; « Plus tard » referme sans rien
 *  écrire. */
export function RdvPlanifie({
  trace,
  telephone,
  nomClient,
  surPrevenir,
  surFermer,
}: {
  trace: string;
  telephone: string | null;
  nomClient: string;
  surPrevenir: (canal: "sms" | "whatsapp") => void;
  surFermer: () => void;
}) {
  return (
    <div aria-live="polite" className="mt-3 rounded-2xl bg-succes/10 p-4">
      <p className="flex items-center gap-3 text-sm text-ink">
        <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-succes/10 text-succes">
          <IconeCoche className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate">{trace.replace(`${nomClient}, `, "")}</span>
      </p>
      {telephone ? (
        <>
          <p className="mt-3 truncate text-base font-semibold text-ink">Prévenir {nomClient} ?</p>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <button type="button" onClick={() => surPrevenir("sms")} className={`${BOUTON_CONTOUR} min-h-12 bg-surface`}>
              SMS
            </button>
            <button type="button" onClick={() => surPrevenir("whatsapp")} className={`${BOUTON_CONTOUR} min-h-12 bg-surface`}>
              WhatsApp
            </button>
            <button type="button" onClick={surFermer} className={`min-h-12 px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 ${FOCUS}`}>
              Plus tard
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
