"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";

export function PhotosProjet({
  demandeId,
  chemins,
  onChemins,
}: {
  demandeId: string;
  chemins: string[];
  onChemins: (chemins: string[]) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Le bucket est privé : on génère des URLs signées temporaires pour
  // afficher les miniatures, plutôt que de rendre les photos publiques.
  // Un seul appel groupé (createSignedUrls) plutôt qu'un aller-retour
  // réseau par photo — un chantier avec 15-20 photos passait de 15-20
  // requêtes séquentielles à une seule, sensible sur un réseau de chantier.
  useEffect(() => {
    async function chargerUrls() {
      const { data } = await supabase.storage.from("photos").createSignedUrls(chemins, 3600);
      const nouvelles: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.signedUrl && !item.error) nouvelles[item.path ?? ""] = item.signedUrl;
      }
      setUrls(nouvelles);
    }
    if (chemins.length > 0) chargerUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chemins.join(",")]);

  async function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    setErreur(null);
    setEnvoi(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setEnvoi(false);
      return;
    }

    // Uploads indépendants les uns des autres : en parallèle plutôt qu'un
    // par un, pour ne pas faire attendre l'artisan photo par photo quand
    // il envoie tout un reportage de chantier d'un coup.
    const resultats = await Promise.all(
      Array.from(fichiers).map(async (fichier) => {
        const chemin = `${user.id}/${demandeId}/${Date.now()}-${fichier.name}`;
        const { error } = await supabase.storage.from("photos").upload(chemin, fichier);
        return error ? null : chemin;
      })
    );
    const nouveauxChemins = resultats.filter((c): c is string => c !== null);

    setEnvoi(false);

    if (nouveauxChemins.length === 0) {
      setErreur(
        "Impossible d'envoyer les photos. Avez-vous bien créé le bucket de stockage (étape 16 du README) ?"
      );
      return;
    }

    const cheminsMisAJour = [...chemins, ...nouveauxChemins];
    const { error: updateError } = await supabase
      .from("demandes")
      .update({ photos: cheminsMisAJour })
      .eq("id", demandeId);

    if (updateError) {
      // Les fichiers sont bien envoyés dans le stockage à ce stade, mais
      // le projet ne les référence pas encore : sans ce message, l'artisan
      // croirait ses photos perdues alors qu'elles existent, juste non
      // reliées. Il peut réessayer sans risque de doublon (nouveaux
      // chemins horodatés à chaque tentative).
      setErreur("Photos envoyées mais non enregistrées sur le projet. Réessayez.");
    } else {
      onChemins(cheminsMisAJour);
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        type: "photo_ajoutee",
        titre:
          nouveauxChemins.length > 1
            ? `${nouveauxChemins.length} photos ajoutées`
            : "Photo ajoutée",
      });
    }

    if (inputRef.current) inputRef.current.value = "";
  }

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
      setErreur("Impossible de supprimer cette photo. Réessayez.");
      return;
    }
    onChemins(cheminsMisAJour);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => ajouterPhotos(e.target.files)}
        className="hidden"
        id={`photos-input-${demandeId}`}
      />
      <label
        htmlFor={`photos-input-${demandeId}`}
        className="inline-flex items-center gap-2 rounded-xl bg-ink text-paper text-sm font-medium px-4 py-2 transition-all duration-150 hover:bg-signal hover:scale-[1.02] hover:shadow-md active:scale-[0.98] cursor-pointer"
      >
        {envoi ? "Envoi en cours…" : "📷 Ajouter des photos"}
      </label>

      {erreur && <p className="mt-2 text-sm text-signal">{erreur}</p>}

      {chemins.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {chemins.map((chemin) => (
            <div
              key={chemin}
              className="relative group aspect-square rounded-xl overflow-hidden bg-paper border border-ink/10 transition-shadow duration-200 hover:shadow-md hover:shadow-ink/[0.06]"
            >
              {urls[chemin] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[chemin]}
                  alt="Photo du projet"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-ink/30">
                  …
                </div>
              )}
              <button
                onClick={() => supprimerPhoto(chemin)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
