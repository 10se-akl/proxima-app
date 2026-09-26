"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { BrouillonProjetForm } from "@/components/dashboard/BrouillonProjet";
import { ConfirmationRdv } from "@/components/dashboard/ConfirmationRdv";
import {
  CorrespondanceProjetExistant,
  type ProjetOuvertMatch,
} from "@/components/dashboard/CorrespondanceProjetExistant";
import type { BrouillonProjet } from "@/types";

// ============================================================
// "Premier contact sans friction" (26/08) — écran atteint après un partage
// Android natif (WhatsApp/SMS/Mail → Partager → Compyo, voir
// app/api/partage/route.ts). Le contenu partagé est déjà en base
// (partages_entrants) ; ici on lance l'IA pour préparer un brouillon, puis
// on affiche le même écran de revue que l'import de message classique.
//
// Sprint Beta Final (27/08) — point 2 du brief : AVANT tout appel IA, on
// cherche un numéro de téléphone dans le texte (regex), un client existant
// et ses projets ouverts (SQL) — voir app/api/partage/matcher/route.ts.
// Un seul projet ouvert trouvé → décision Axel : zéro appel IA, le
// message est ajouté comme note (voir app/api/demandes/ajouter-note-
// depuis-partage/route.ts). Jamais de rattachement automatique silencieux
// : dans tous les cas de correspondance, l'artisan choisit explicitement
// entre "ajouter à ce projet" et "créer un nouveau projet quand même".
//
// Corrections QA (même date) :
// - le rendez-vous détecté par l'IA (rdvPropose) était reçu mais jamais lu
//   ni affiché sur cet écran : réparé via components/dashboard/
//   ConfirmationRdv.tsx.
// - une photo partagée SEULE (sans texte) était perdue silencieusement.
// ============================================================

type EtapeChargement = "chargement" | "analyse" | "revue" | "creation" | "erreur";
type RdvPropose = { date: string; heure: string };

export default function RevuePartagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [etape, setEtape] = useState<EtapeChargement>("chargement");
  const [brouillon, setBrouillon] = useState<BrouillonProjet | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  // Sprint Robustesse (30/08) — voir commentaire dans le useEffect ci-dessous :
  // ce message partagé (SMS/message client) est le contenu le plus important à
  // ne jamais perdre silencieusement en cas de coupure réseau.
  const [erreurChargement, setErreurChargement] = useState(false);
  const [correspondances, setCorrespondances] = useState<ProjetOuvertMatch[]>([]);
  const [attachementEnCours, setAttachementEnCours] = useState(false);
  const [propositionEnCours, setPropositionEnCours] = useState<{
    projetId: string;
    nomClient: string;
    rdv: RdvPropose;
  } | null>(null);

  async function lancerAnalyseIA(texte: string) {
    setEtape("analyse");
    setErreur(null);
    try {
      const reponse = await fetch("/api/ai/preparer-brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte }),
      });
      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.error || "L'analyse a échoué.");
        setEtape("erreur");
        return;
      }

      setBrouillon(donnees.brouillon);
      setEtape("revue");
    } catch {
      setErreur("Impossible de contacter l'IA pour le moment.");
      setEtape("erreur");
    }
  }

  // Sprint Robustesse (30/08) — sortie du useEffect (au lieu d'une fonction
  // locale) pour que le bouton "Réessayer" de EtatErreur puisse relancer
  // exactement le même chargement. `annuleRef` remplace le flag `annule`
  // local : il doit survivre en dehors du useEffect pour être lu depuis un
  // appel manuel (retry) comme depuis le montage automatique.
  const annuleRef = useRef(false);

  async function charger() {
    setErreurChargement(false);
    setEtape("chargement");
    try {
      // Audit pré-bêta (09/09), point 🟠 n°6 — la lecture du message partagé
      // et la recherche de correspondance (voir app/api/partage/matcher/
      // route.ts, qui refait elle-même sa propre lecture de
      // partages_entrants par partageId, indépendamment de celle-ci) sont
      // deux lectures indépendantes : les lancer en parallèle plutôt qu'en
      // séquence économise un aller-retour réseau complet. Le matching ne
      // coûte rien (aucun appel IA, voir son commentaire) — le lancer même
      // avant de savoir s'il y a du texte n'est jamais un gaspillage
      // notable, et son résultat est simplement ignoré dans le cas
      // "photo seule" ci-dessous.
      const requetePartage = supabase
        .from("partages_entrants")
        .select("id, texte, images")
        .eq("id", params.id)
        .single();

      const requeteMatch = fetch("/api/partage/matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partageId: params.id }),
      })
        .then(async (reponse) => ({ ok: reponse.ok, donnees: await reponse.json() }))
        .catch(() => null); // échec réseau du matching : pas grave, voir plus bas

      const [{ data: partage, error }, resultatMatch] = await Promise.all([
        requetePartage,
        requeteMatch,
      ]);

      if (annuleRef.current) return;

      // Un partage sans AUCUN contenu exploitable (ni texte ni photo — cas
      // très rare, partage vide ou déjà traité) renvoie vers la création
      // manuelle. Une photo seule, elle, reste un cas valide.
      const imagesPartage: string[] = Array.isArray(partage?.images) ? partage.images : [];

      if (error || !partage || (!partage.texte && imagesPartage.length === 0)) {
        // Audit pré-bêta (09/09), point 🟠 n°4 — même raison que
        // app/api/partage/route.ts : expliquer plutôt que rediriger en
        // silence vers un formulaire vide.
        router.replace("/dashboard/demandes/nouvelle?erreur=partage_vide");
        return;
      }

      setImages(imagesPartage);

      // Pas de texte à analyser (photo(s) seule(s)) : le résultat du
      // matching (lancé en parallèle ci-dessus) ne s'applique pas — rien à
      // chercher, pas la peine d'appeler l'IA sur une chaîne vide —
      // brouillon vierge que l'artisan complète à la main.
      if (!partage.texte) {
        setBrouillon({
          nomClient: { valeur: null, confiance: "absent" },
          telephoneClient: { valeur: null, confiance: "absent" },
          adresseClient: { valeur: null, confiance: "absent" },
          typeChantier: { valeur: "autre", confiance: "absent" },
          resume: { valeur: "Photo partagée — à compléter.", confiance: "absent" },
          priorite: { valeur: "normal", confiance: "absent" },
          rdvDate: { valeur: null, confiance: "absent" },
          rdvHeure: { valeur: null, confiance: "absent" },
          texteOrigine: "",
        });
        setEtape("revue");
        return;
      }

      // Point 2 du brief : SQL + regex AVANT tout appel IA — déjà fait en
      // parallèle ci-dessus, on utilise directement son résultat.
      if (resultatMatch?.ok && resultatMatch.donnees.statut === "un") {
        setCorrespondances([resultatMatch.donnees.projet]);
        return; // attend le choix explicite de l'artisan
      }
      if (resultatMatch?.ok && resultatMatch.donnees.statut === "plusieurs") {
        setCorrespondances(resultatMatch.donnees.projets);
        return;
      }

      // Aucune correspondance (ou matching indisponible) : parcours normal.
      lancerAnalyseIA(partage.texte);
    } catch {
      // Sprint Robustesse (30/08) — coupure réseau pendant la récupération du
      // partage entrant : c'est le contenu le plus important de tout le
      // parcours (le message/SMS du client), donc pas question de le perdre
      // silencieusement derrière un "Chargement…" qui ne finit jamais. On
      // affiche un état d'erreur explicite avec possibilité de réessayer.
      if (!annuleRef.current) setErreurChargement(true);
    }
  }

  useEffect(() => {
    annuleRef.current = false;
    charger();
    return () => {
      annuleRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function ajouterAuProjet(projetId: string) {
    setAttachementEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/demandes/ajouter-note-depuis-partage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetId, partageId: params.id }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setAttachementEnCours(false);
        setErreur(donnees.error || "Impossible d'ajouter le message au projet.");
        return;
      }
      router.push(`/dashboard/demandes/${donnees.projetId}`);
    } catch {
      setAttachementEnCours(false);
      setErreur("Impossible de contacter le serveur pour le moment.");
    }
  }

  async function creerNouveauProjetQuandMeme() {
    setCorrespondances([]);
    const { data: partage } = await supabase
      .from("partages_entrants")
      .select("texte")
      .eq("id", params.id)
      .single();
    if (!partage?.texte) return;
    lancerAnalyseIA(partage.texte);
  }

  async function creerProjet(valeurs: BrouillonProjet) {
    setEtape("creation");
    setErreur(null);
    try {
      const reponse = await fetch("/api/demandes/creer-depuis-brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brouillon: valeurs, partageId: params.id, images }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setErreur(donnees.error || "La création a échoué.");
        setEtape("revue");
        return;
      }

      if (donnees.rdvPropose) {
        setPropositionEnCours({
          projetId: donnees.projetId,
          nomClient: donnees.nomClient,
          rdv: donnees.rdvPropose,
        });
        return;
      }

      router.push(`/dashboard/demandes/${donnees.projetId}?cree=1`);
    } catch {
      setErreur("Impossible d'enregistrer le projet pour le moment.");
      setEtape("revue");
    }
  }

  // Sprint Robustesse (30/08) — priorité absolue à ne pas laisser cet écran
  // bloqué : voir le catch dans `charger`. `onReessayer` relance le même
  // chargement (message partagé + matching + analyse IA).
  if (erreurChargement) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6">
          <EtatErreur
            message="Impossible de récupérer le message partagé. Vérifiez votre connexion et réessayez."
            onReessayer={charger}
          />
        </Card>
      </div>
    );
  }

  if (propositionEnCours) {
    return (
      <ConfirmationRdv
        projetId={propositionEnCours.projetId}
        nomClient={propositionEnCours.nomClient}
        rdv={propositionEnCours.rdv}
      />
    );
  }

  // Correspondance(s) trouvée(s) : choix explicite, jamais de rattachement
  // silencieux (voir commentaire en tête de fichier).
  if (correspondances.length > 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6">
          <CorrespondanceProjetExistant
            correspondances={correspondances}
            onChoisir={ajouterAuProjet}
            onCreerNouveau={creerNouveauProjetQuandMeme}
            enCours={attachementEnCours}
            erreur={erreur}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card className="p-6">
        {(etape === "chargement" || etape === "analyse") && (
          <div className="py-10 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-signal border-t-transparent" />
            <p className="mt-4 text-sm text-ink/60">
              {etape === "analyse"
                ? "L'IA prépare le brouillon…"
                : "Récupération du message partagé…"}
            </p>
          </div>
        )}

        {etape === "erreur" && !brouillon && (
          <div className="py-10 text-center space-y-4">
            <p className="text-sm text-signal">{erreur}</p>
            <Button onClick={() => router.push("/dashboard/demandes/nouvelle")}>
              Créer le projet manuellement
            </Button>
          </div>
        )}

        {brouillon && (etape === "revue" || etape === "creation" || etape === "erreur") && (
          <BrouillonProjetForm
            brouillon={brouillon}
            onValider={creerProjet}
            validationEnCours={etape === "creation"}
            erreur={erreur}
          />
        )}
      </Card>
    </div>
  );
}
