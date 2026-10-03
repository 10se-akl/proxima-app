"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { compresserPhoto } from "@/lib/images/compresserPhoto";
import { IconeCoche } from "@/components/projet/icones";
import { BOUTON_CONTOUR, BOUTON_TEXTE } from "@/components/projet/Blocs";

// ============================================================
// Refonte (03/10, duel D lot 2) — prendre une photo depuis la fiche, en
// trois gestes : la tuile « Photo », le déclencheur, ✓.
//
// Le champ `capture="environment"` vivait dans la feuille « Photos ». Or une
// feuille fermée n'existe plus (components/projet/Feuille.tsx rend `null`) :
// le champ, l'envoi en cours et l'erreur disparaissaient avec elle. Ils
// remontent ici, dans `useEnvoiPhotos`, que la fiche tient une seule fois :
// le champ de l'appareil se pose hors de toute feuille (ChampAppareil), la
// feuille garde la galerie et la grille avec ✕, et les deux partagent le
// même envoi, la même trace (« 3 photos ajoutées ») et le même
// « Réessayer ». Les fichiers qui n'ont pas pu partir restent en mémoire
// pour ce « Réessayer » — pas de file d'attente : rien n'est promis au-delà.
// ============================================================

export type EnvoiPhotos = {
  /** Un envoi est en cours : les champs sont inactifs. */
  envoi: boolean;
  /** Ce qui n'a pas pu être enregistré, en une ligne. */
  erreur: string | null;
  /** Les photos à renvoyer par « Réessayer ». */
  enAttente: File[];
  /** Combien de photos le dernier envoi a ajoutées (la trace). */
  ajoutees: number;
  refAppareil: React.RefObject<HTMLInputElement>;
  refGalerie: React.RefObject<HTMLInputElement>;
  envoyer: (fichiers: FileList | File[] | null) => Promise<void>;
  reessayer: () => void;
};

function photos(n: number) {
  return `${n} photo${n > 1 ? "s" : ""}`;
}

function pasEnregistrees(n: number) {
  return `${photos(n)} pas enregistrée${n > 1 ? "s" : ""}.`;
}

export function useEnvoiPhotos({
  demandeId,
  onChemins,
}: {
  demandeId: string;
  onChemins: (chemins: string[]) => void;
}): EnvoiPhotos {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enAttente, setEnAttente] = useState<File[]>([]);
  const [ajoutees, setAjoutees] = useState(0);

  async function ajouterPhotos(fichiers: FileList | File[] | null) {
    if (!fichiers || fichiers.length === 0) return;
    setErreur(null);
    setEnvoi(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setEnAttente(Array.from(fichiers));
      setEnvoi(false);
      return;
    }

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) {
      setErreur("Aucune organisation associée à ce compte, reconnectez-vous.");
      setEnAttente(Array.from(fichiers));
      setEnvoi(false);
      return;
    }

    // Sprint Beta Final (27/08) — 🔴E : compression avant envoi (voir
    // lib/images/compresserPhoto.ts), et surtout distinction claire entre
    // "tout a échoué" et "une partie a échoué" — avant, un échec partiel
    // silencieux faisait croire à l'artisan que toutes ses photos étaient
    // bien envoyées alors que certaines manquaient, découvert seulement en
    // rouvrant le projet plus tard sur le chantier.
    //
    // Uploads indépendants les uns des autres : en parallèle plutôt qu'un
    // par un, pour ne pas faire attendre l'artisan photo par photo quand
    // il envoie tout un reportage de chantier d'un coup.
    const fichiersOriginaux = Array.from(fichiers);
    const resultats = await Promise.all(
      fichiersOriginaux.map(async (fichierOriginal) => {
        const fichier = await compresserPhoto(fichierOriginal);
        const chemin = `${organisationId}/${user.id}/${demandeId}/${Date.now()}-${fichier.name}`;
        const { error } = await supabase.storage.from("photos").upload(chemin, fichier);
        return error ? null : chemin;
      })
    );
    const nouveauxChemins = resultats.filter((c): c is string => c !== null);
    const nbEchecs = fichiersOriginaux.length - nouveauxChemins.length;

    setEnvoi(false);
    // Ce qui n'est pas parti reste en mémoire pour « Réessayer ».
    const echecs = fichiersOriginaux.filter((_, i) => resultats[i] === null);

    if (nouveauxChemins.length === 0) {
      setErreur(pasEnregistrees(fichiersOriginaux.length));
      setEnAttente(fichiersOriginaux);
      return;
    }

    // Audit (11/09) — 🟠 remplace l'ancien cycle lecture-modification-
    // écriture ([...chemins, ...nouveaux] puis update()), qui perdait des
    // photos en silence si deux membres de l'équipe envoyaient des photos
    // sur le même projet à quelques secondes d'écart (le second update
    // écrasait le tableau écrit par le premier). Le concat se fait
    // maintenant DANS la mise à jour elle-même côté base (voir
    // ajouter_photos_projet, supabase/schema.sql Module 39), donc toujours
    // sérialisé correctement même en cas d'écriture concurrente.
    const { data: photosMisesAJour, error: updateError } = await supabase.rpc("ajouter_photos_projet", {
      p_demande_id: demandeId,
      p_organisation_id: organisationId,
      p_nouveaux_chemins: nouveauxChemins,
    });

    if (updateError || !photosMisesAJour) {
      // Les fichiers sont bien envoyés dans le stockage à ce stade, mais
      // le projet ne les référence pas encore : rien ne s'affiche comme
      // réussi. « Réessayer » renvoie tout le lot, sans risque de doublon
      // (nouveaux chemins horodatés à chaque tentative).
      setErreur(pasEnregistrees(fichiersOriginaux.length));
      setEnAttente(fichiersOriginaux);
    } else {
      onChemins(photosMisesAJour as string[]);
      setAjoutees(nouveauxChemins.length);
      // Échec partiel (ex : 2 photos sur 5 envoyées) : la trace dit ce qui
      // est passé, la ligne d'erreur ce qui ne l'est pas, avec
      // « Réessayer » pour celles-là seulement.
      setEnAttente(echecs);
      if (nbEchecs > 0) setErreur(pasEnregistrees(nbEchecs));
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        organisationId,
        type: "photo_ajoutee",
        titre:
          nouveauxChemins.length > 1
            ? `${nouveauxChemins.length} photos ajoutées`
            : "Photo ajoutée",
      });
    }

    for (const champ of [inputRef, galerieRef]) if (champ.current) champ.current.value = "";
  }

  // Un seul point d'entrée pour les deux champs et « Réessayer ». Une
  // exception (compression, réseau coupé en plein envoi) ne laisse plus la
  // tuile bloquée en « envoi » : le lot reste à renvoyer.
  async function envoyer(fichiers: FileList | File[] | null) {
    if (!fichiers || fichiers.length === 0) return;
    // Copie : le champ est vidé après l'envoi.
    const lot = Array.from(fichiers);
    setAjoutees(0);
    try {
      await ajouterPhotos(lot);
    } catch {
      setEnvoi(false);
      setEnAttente(lot);
      setErreur(pasEnregistrees(lot.length));
      for (const champ of [inputRef, galerieRef]) if (champ.current) champ.current.value = "";
    }
  }

  return {
    envoi,
    erreur,
    enAttente,
    ajoutees,
    refAppareil: inputRef,
    refGalerie: galerieRef,
    envoyer,
    reessayer: () => void envoyer(enAttente),
  };
}

/** L'identifiant du champ de l'appareil photo d'un projet : la tuile
 *  « Photo » de la fiche et « Prendre une photo » de la feuille le visent. */
export function idChampAppareil(demandeId: string) {
  return `photos-input-${demandeId}`;
}

/** Le champ de l'appareil photo, à poser HORS de toute feuille : il doit
 *  exister encore quand l'appareil rend la main à la page. */
export function ChampAppareil({ demandeId, envoi }: { demandeId: string; envoi: EnvoiPhotos }) {
  return (
    <input
      ref={envoi.refAppareil}
      type="file"
      accept="image/*"
      multiple
      capture="environment"
      onChange={(e) => void envoi.envoyer(e.target.files)}
      className="hidden"
      id={idChampAppareil(demandeId)}
      aria-hidden
      tabIndex={-1}
    />
  );
}

/** Là où était le doigt (règles 13 et 16) : « 3 photos ajoutées », ou
 *  « 1 photo pas enregistrée. » avec « Réessayer ». */
export function EtatEnvoiPhotos({ envoi, surVoir }: { envoi: EnvoiPhotos; surVoir?: () => void }) {
  if (envoi.envoi) return <div aria-live="polite" />;
  return (
    <div aria-live="polite">
      {envoi.ajoutees > 0 && (
        <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl bg-succes/10 pl-4 text-sm text-ink">
          <IconeCoche className="h-4 w-4 shrink-0 text-succes" />
          <p className="min-w-0 flex-1 truncate">
            {photos(envoi.ajoutees)} ajoutée{envoi.ajoutees > 1 ? "s" : ""}
          </p>
          {surVoir && (
            <button type="button" onClick={surVoir} className={`shrink-0 ${BOUTON_TEXTE}`}>
              Voir
            </button>
          )}
        </div>
      )}
      {envoi.erreur && (
        <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl bg-paper-warm pl-4 pr-1 text-sm">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-alerte-orange" />
          <p className="min-w-0 flex-1 truncate font-semibold text-signal-fonce dark:text-signal-clair">{envoi.erreur}</p>
          {envoi.enAttente.length > 0 && (
            <button type="button" onClick={envoi.reessayer} className={`shrink-0 ${BOUTON_CONTOUR}`}>
              Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** La feuille « Photos » : prendre ou choisir, et la grille avec ✕.
 *  `envoi` : l'envoi tenu par la fiche (le champ de l'appareil est alors
 *  posé hors de la feuille) ; sans lui, le composant tient le sien. */
export function PhotosProjet({
  demandeId,
  chemins,
  onChemins,
  envoi: envoiPartage,
}: {
  demandeId: string;
  chemins: string[];
  onChemins: (chemins: string[]) => void;
  envoi?: EnvoiPhotos;
}) {
  const supabase = createClient();
  const envoiLocal = useEnvoiPhotos({ demandeId, onChemins });
  const envoi = envoiPartage ?? envoiLocal;
  const [erreur, setErreur] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  // Sprint Robustesse (30/08) — état dédié aux miniatures : avant, un
  // échec (réseau, Supabase indisponible) laissait `urls` vide sans jamais
  // le signaler, donc les miniatures restaient bloquées sur "…"
  // indéfiniment, sans aucun message ni moyen de relancer le chargement.
  const [erreurUrls, setErreurUrls] = useState(false);

  // Le bucket est privé : on génère des URLs signées temporaires pour
  // afficher les miniatures, plutôt que de rendre les photos publiques.
  // Un seul appel groupé (createSignedUrls) plutôt qu'un aller-retour
  // réseau par photo — un chantier avec 15-20 photos passait de 15-20
  // requêtes séquentielles à une seule, sensible sur un réseau de chantier.
  async function chargerUrls() {
    setErreurUrls(false);
    try {
      const { data, error } = await supabase.storage.from("photos").createSignedUrls(chemins, 3600);
      if (error) {
        console.error("PhotosProjet: échec createSignedUrls", error);
        setErreurUrls(true);
        return;
      }
      const nouvelles: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.signedUrl && !item.error) nouvelles[item.path ?? ""] = item.signedUrl;
      }
      setUrls(nouvelles);
    } catch (err) {
      console.error("PhotosProjet: échec createSignedUrls", err);
      setErreurUrls(true);
    }
  }

  useEffect(() => {
    if (chemins.length > 0) chargerUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chemins.join(",")]);

  async function supprimerPhoto(chemin: string) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    setErreur(null);
    const { error: storageError } = await supabase.storage.from("photos").remove([chemin]);
    const cheminsMisAJour = chemins.filter((c) => c !== chemin);
    const { error: updateError } = await supabase
      .from("demandes")
      .update({ photos: cheminsMisAJour })
      .eq("id", demandeId);

    // On ne met à jour l'affichage que si les deux suppressions ont
    // réussi — sinon l'écran montrerait une photo comme supprimée alors
    // qu'elle existe encore côté stockage ou côté projet.
    if (storageError || updateError) {
      setErreur("Photo pas supprimée. Réessayez.");
      return;
    }
    onChemins(cheminsMisAJour);
  }

  return (
    <div>
      {/* 27/09 — Deux portes : l'appareil photo, et la galerie. Avant, un
          seul champ avec capture="environment" ouvrait directement
          l'appareil photo sur téléphone : impossible d'ajouter une photo
          déjà prise, ou reçue du client par WhatsApp. Pendant l'envoi, les
          deux sont inactifs (pas de second envoi par-dessus le premier).
          Refonte (03/10) — sur la fiche, le champ de l'appareil vit hors
          de la feuille (ChampAppareil) ; « Prendre une photo » le vise. */}
      {!envoiPartage && <ChampAppareil demandeId={demandeId} envoi={envoi} />}
      <input
        ref={envoi.refGalerie}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void envoi.envoyer(e.target.files)}
        className="hidden"
        id={`photos-galerie-${demandeId}`}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label
          htmlFor={idChampAppareil(demandeId)}
          aria-disabled={envoi.envoi}
          className={`inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 ${envoi.envoi ? "pointer-events-none opacity-60" : ""}`}
        >
          {envoi.envoi && (
            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden />
          )}
          Prendre une photo
        </label>
        <label
          htmlFor={`photos-galerie-${demandeId}`}
          aria-disabled={envoi.envoi}
          className={`${BOUTON_CONTOUR} cursor-pointer ${envoi.envoi ? "pointer-events-none opacity-60" : ""}`}
        >
          Choisir dans la galerie
        </label>
      </div>

      <EtatEnvoiPhotos envoi={envoi} />
      <div aria-live="polite">
        {erreur && <p className="mt-2 text-sm font-semibold text-signal-fonce dark:text-signal-clair">{erreur}</p>}
      </div>

      {/*
        Sprint Robustesse (30/08) — avant, un échec de createSignedUrls
        laissait les miniatures bloquées sur "…" indéfiniment, sans aucun
        message ni moyen de relancer le chargement. On affiche désormais un
        message clair avec un bouton "Réessayer" qui relance le même
        chargement.
      */}
      {erreurUrls && chemins.length > 0 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="min-w-0 flex-1 font-semibold text-signal-fonce dark:text-signal-clair">Photos pas chargées.</span>
          <button type="button" onClick={() => void chargerUrls()} className={`shrink-0 ${BOUTON_CONTOUR}`}>
            Réessayer
          </button>
        </div>
      )}

      {!erreurUrls && chemins.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {chemins.map((chemin) => (
            <div key={chemin} className="relative aspect-square overflow-hidden rounded-2xl bg-paper ring-1 ring-ink/15">
              {urls[chemin] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[chemin]} alt="Photo du projet" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-ink/10 motion-safe:animate-pulse" />
              )}
              {/*
                Sprint Beta Final (27/08) — 🔴E : toujours visible (pas de
                survol au doigt). Refonte (03/10, règle 17) : un rond de
                32 px dans une cible de 48.
              */}
              <button
                type="button"
                onClick={() => supprimerPhoto(chemin)}
                className="absolute right-0 top-0 grid h-12 w-12 place-items-center focus-visible:outline-none"
                title="Supprimer"
                aria-label="Supprimer cette photo"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink/70 text-sm text-paper">✕</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
