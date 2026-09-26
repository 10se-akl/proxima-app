"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import { rechercherClientParTelephone, trouverOuCreerClient } from "@/lib/clients";
import {
  obtenirClasseReconnaissance,
  messageErreurDictee,
  type SpeechRecognitionInstance,
} from "@/lib/dictee";
import { Field } from "@/components/ui/Input";
import { IconeMicro } from "@/components/projet/icones";
import { LABEL_STATUT, LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";

// Revue métier (06/09) — élargi de 7 à 18 branches, une par métier
// désormais couvert par TypeChantier (voir types/index.ts). "clim"/
// "climatisation" avait jusqu'ici sa propre branche mais renvoyait
// "chauffage" — un vrai bug une fois "climatisation" devenu un type à part
// entière : corrigé en lui donnant sa propre branche, vérifiée AVANT
// "chauffage" pour ne jamais être court-circuitée par lui.
function detecterTypeChantier(texte: string): string {
  const t = texte.toLowerCase();
  if (t.includes("salle de bain") || t.includes("douche") || t.includes("baignoire"))
    return "salle_de_bain";
  if (t.includes("cuisine")) return "cuisine";
  if (t.includes("peinture") || t.includes("peindre")) return "peinture";
  if (t.includes("toit") || t.includes("toiture") || t.includes("tuile")) return "toiture";
  if (t.includes("électri") || t.includes("electri") || t.includes("tableau électrique"))
    return "electricite";
  if (t.includes("plomb") || t.includes("fuite") || t.includes("robinet")) return "plomberie";
  if (t.includes("climatisation") || t.includes("climatiseur") || t.includes("clim") || t.includes("split"))
    return "climatisation";
  if (
    t.includes("chauffage") ||
    t.includes("chaudière") ||
    t.includes("chaudiere") ||
    t.includes("radiateur") ||
    t.includes("pompe à chaleur") ||
    t.includes("pompe a chaleur")
  )
    return "chauffage";
  if (
    t.includes("parpaing") ||
    t.includes("béton") ||
    t.includes("beton") ||
    t.includes("fondation") ||
    t.includes("mur porteur") ||
    t.includes("maçon") ||
    t.includes("macon")
  )
    return "maconnerie";
  if (t.includes("terrassement") || t.includes("terrasser") || t.includes("décaissement") || t.includes("decaissement"))
    return "terrassement";
  if (t.includes("façade") || t.includes("facade") || t.includes("ravalement") || t.includes("crépi") || t.includes("crepi"))
    return "facade";
  if (
    t.includes("serrure") ||
    t.includes("serrurier") ||
    t.includes("porte claquée") ||
    t.includes("porte claquee") ||
    t.includes("clé cassée") ||
    t.includes("cle cassee") ||
    t.includes("verrou")
  )
    return "serrurerie";
  if (t.includes("vitre") || t.includes("vitrage") || t.includes("verre cassé") || t.includes("verre casse"))
    return "vitrerie";
  if (t.includes("charpente") || t.includes("charpentier") || t.includes("fermette") || t.includes("poutre"))
    return "charpente";
  if (
    t.includes("menuiserie") ||
    t.includes("menuisier") ||
    t.includes("fenêtre") ||
    t.includes("fenetre") ||
    t.includes("porte d'entrée") ||
    t.includes("porte d'entree")
  )
    return "menuiserie";
  if (
    t.includes("placo") ||
    t.includes("cloison") ||
    t.includes("plaque de plâtre") ||
    t.includes("plaque de platre") ||
    t.includes("plaquiste") ||
    t.includes("faux plafond")
  )
    return "plaquisterie";
  if (t.includes("carrelage") || t.includes("carreleur") || t.includes("faïence") || t.includes("faience"))
    return "carrelage";
  if (
    t.includes("jardin") ||
    t.includes("paysagiste") ||
    t.includes("gazon") ||
    t.includes("pelouse") ||
    t.includes("clôture") ||
    t.includes("cloture") ||
    t.includes("portail") ||
    (t.includes("terrasse") && !t.includes("terrassement"))
  )
    return "amenagement_exterieur";
  if (t.includes("piscine") || t.includes("bassin") || t.includes("pisciniste") || t.includes("hivernage"))
    return "piscine";
  if (t.includes("rénovation") || t.includes("renovation")) return "renovation_complete";
  return "autre";
}

// Audit pré-bêta (09/09), point 🟠 n°4 — deux échecs du partage entrant
// (form-data illisible, échec d'insertion en base, voir app/api/partage/
// route.ts et app/dashboard/demandes/partage/[id]/page.tsx) redirigeaient
// ici sans aucune explication : l'artisan atterrissait sur ce formulaire
// vide en pensant avoir raté sa manipulation. Le paramètre `erreur`
// explique ce qui s'est passé ; ce formulaire, déjà la porte de secours
// manuelle, sert alors directement de "moyen de continuer".
const MESSAGES_ERREUR_PARTAGE: Record<string, string> = {
  partage_illisible:
    "Le message partagé n'a pas pu être lu. Créez le projet ci-dessous, ou repartagez-le depuis WhatsApp/SMS/Mail.",
  partage_echec_serveur:
    "Le message partagé n'a pas pu être enregistré (problème temporaire). Créez le projet ci-dessous, ou réessayez le partage.",
  partage_vide:
    "Le partage ne contenait rien d'exploitable. Créez le projet ci-dessous.",
  // Vérification (11/09) — la compression côté service worker (voir
  // public/sw.js, point 🔴 n°2 de l'audit pré-bêta) réduit déjà fortement
  // les photos partagées, mais elle reste best-effort : navigateur sans
  // OffscreenCanvas, ou simplement trop de photos d'un coup, et la requête
  // dépasse encore la limite de taille du serveur. Dans ce cas l'échec se
  // produit AVANT que le code de l'app ne s'exécute (rejet au niveau de
  // l'hébergeur) — c'est donc le service worker qui redirige ici, pour
  // qu'un message clair et une porte de sortie remplacent l'erreur brute
  // illisible que voyait l'artisan jusqu'ici.
  partage_trop_lourd:
    "Les photos partagées sont trop lourdes pour être envoyées d'un coup. Créez le projet ci-dessous, puis ajoutez les photos depuis la fiche projet (elles y sont compressées automatiquement) — ou repartagez-les une par une.",
};

export default function NouveauProjetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [nomClient, setNomClient] = useState("");
  const [telephoneClient, setTelephoneClient] = useState("");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [anciensProjets, setAnciensProjets] = useState<
    { id: string; type_chantier: string; statut: string; created_at: string }[]
  >([]);
  const [brouillonRestaure, setBrouillonRestaure] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [dicteePossible, setDicteePossible] = useState(false);
  useEffect(() => setDicteePossible(obtenirClasseReconnaissance() !== null), []);

  const messageErreurPartage = MESSAGES_ERREUR_PARTAGE[searchParams.get("erreur") ?? ""] ?? null;

  // Audit pré-bêta (09/09), point 🔴 n°3 — même filet de sécurité que
  // components/notes/FormulaireNote.tsx et components/dashboard/
  // NotesVocales.tsx : la description dictée depuis ce formulaire ("Nouveau
  // projet" > "Dictée vocale", voir components/dashboard/NouveauProjetMenu.tsx)
  // n'avait aucune protection contre une fermeture accidentelle en pleine
  // dictée. Clé générique (pas de projet créé à ce stade) : un seul
  // brouillon de nouveau projet en cours à la fois.
  const CLE_BROUILLON = "compyo_brouillon_nouveau_projet";

  useEffect(() => {
    try {
      const brouillon = window.localStorage.getItem(CLE_BROUILLON);
      if (brouillon && brouillon.trim()) {
        setDescription(brouillon);
        setBrouillonRestaure(true);
      }
    } catch {
      // localStorage indisponible : filet de sécurité simplement absent.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (description.trim()) {
        window.localStorage.setItem(CLE_BROUILLON, description);
      } else {
        window.localStorage.removeItem(CLE_BROUILLON);
      }
    } catch {
      // best effort, ne doit jamais faire planter la saisie.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  function effacerBrouillonDescription() {
    try {
      window.localStorage.removeItem(CLE_BROUILLON);
    } catch {
      // best effort
    }
  }

  // Vérification par nom ET par téléphone — pas de vraie fiche client
  // (voir échange sur le sujet), juste de quoi éviter qu'un artisan
  // recrée un projet en pensant que c'est le premier contact avec ce
  // client, et lui montrer directement les anciens chantiers plutôt
  // qu'un simple compteur : le clic en moins compte, surtout au
  // téléphone avec le client en attente.
  //
  // Sprint Beta Final (27/08) — le matching par nom seul (`ilike`) ratait
  // les clients dont le nom est orthographié différemment ou dont seul le
  // prénom est saisi, alors que le téléphone est un identifiant bien plus
  // fiable (voir lib/clients/, même normalisation que le matching sur le
  // partage). On combine les deux résultats plutôt que de choisir l'un ou
  // l'autre — un signal fort (téléphone) ou faible (nom) reste utile ici
  // car c'est purement informatif, jamais un rattachement automatique.
  async function verifierClientExistant(champ: "nom" | "telephone") {
    if (champ === "nom" && !nomClient.trim()) {
      setAnciensProjets([]);
      return;
    }
    if (champ === "telephone" && !telephoneClient.trim()) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) return;

    const resultats = new Map<
      string,
      { id: string; type_chantier: string; statut: string; created_at: string }
    >();

    if (nomClient.trim()) {
      const { data: parNom } = await supabase
        .from("demandes")
        .select("id, type_chantier, statut, created_at")
        .eq("organisation_id", organisationId)
        .ilike("nom_client", `%${nomClient.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(5);
      for (const p of parNom ?? []) resultats.set(p.id, p);
    }

    if (telephoneClient.trim()) {
      const client = await rechercherClientParTelephone(
        supabase,
        organisationId,
        telephoneClient.trim()
      );
      if (client) {
        const { data: parTelephone } = await supabase
          .from("demandes")
          .select("id, type_chantier, statut, created_at")
          .eq("organisation_id", organisationId)
          .eq("client_id", client.id)
          .order("created_at", { ascending: false })
          .limit(5);
        for (const p of parTelephone ?? []) resultats.set(p.id, p);
      }
    }

    setAnciensProjets(Array.from(resultats.values()));
  }

  function dicter() {
    const ClasseReconnaissance = obtenirClasseReconnaissance();
    if (!ClasseReconnaissance) {
      setErreur("La dictée vocale n'est pas disponible sur ce navigateur — tapez directement ci-dessous.");
      return;
    }
    setErreur(null);

    const recognition = new ClasseReconnaissance();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    // 27/09 — La dictée s'ajoute à ce qui est déjà écrit (un brouillon
    // retrouvé, une phrase tapée) au lieu de le remplacer : rien ne se perd.
    const dejaEcrit = description.trim();
    recognition.onresult = (event) => {
      let texte = "";
      for (let i = 0; i < event.results.length; i++) {
        texte += event.results[i][0].transcript;
      }
      setDescription(dejaEcrit ? `${dejaEcrit} ${texte}` : texte);
    };
    recognition.onend = () => setEnregistrement(false);
    recognition.onerror = (event) => {
      setEnregistrement(false);
      if (event?.error === "aborted") return;
      setErreur(messageErreurDictee(event?.error));
    };
    recognition.start();
    recognitionRef.current = recognition;
    setEnregistrement(true);
  }

  // 27/09 — À la fin de la dictée : un numéro dicté (« 06 12 34 56 78 »)
  // remplit le champ téléphone s'il est vide, et le curseur va au nom du
  // client, la seule chose qui reste à taper.
  const ecoutait = useRef(false);
  useEffect(() => {
    if (enregistrement) {
      ecoutait.current = true;
      return;
    }
    if (!ecoutait.current) return;
    ecoutait.current = false;
    const numero = description.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/);
    if (numero && !telephoneClient.trim()) setTelephoneClient(numero[0]);
    if (!nomClient.trim()) document.getElementById("nom-client")?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enregistrement]);

  function arreterDictee() {
    recognitionRef.current?.stop();
    setEnregistrement(false);
  }

  // "Premier contact sans friction" (26/08) — entrée directe depuis le gros
  // bouton « Parler » de la feuille « Nouveau projet » (voir
  // components/navigation/FeuilleCapture.tsx, 26/09) : on lance l'écoute
  // immédiatement au lieu de forcer un clic supplémentaire sur "🎙 Dicter"
  // une fois la page ouverte.
  useEffect(() => {
    if (searchParams.get("dictee") === "1") {
      dicter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!nomClient.trim() || !description.trim()) {
      setErreur("Le nom du client et une description rapide sont nécessaires.");
      return;
    }

    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setChargement(false);
      return;
    }

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) {
      setErreur("Aucune organisation associée à ce compte, reconnectez-vous.");
      setChargement(false);
      return;
    }

    // Sprint Beta Final (27/08) — même fondation que creer-depuis-brouillon
    // (Task C) : un projet créé manuellement doit lui aussi être rattaché à
    // un client stable dès qu'un téléphone exploitable est saisi, pour que
    // le matching (Porte A comme Porte B) reste cohérent sur toute l'appli.
    const clientId = await trouverOuCreerClient(supabase, {
      organisationId,
      nom: nomClient,
      telephoneBrut: telephoneClient || null,
      adresse: null,
    });

    const { data, error } = await supabase
      .from("demandes")
      .insert({
        artisan_id: user.id,
        organisation_id: organisationId,
        nom_client: nomClient,
        telephone_client: telephoneClient || null,
        client_id: clientId,
        description,
        type_chantier: detecterTypeChantier(description),
      })
      .select("id")
      .single();

    if (error || !data) {
      setChargement(false);
      setErreur("Impossible d'enregistrer le projet.");
      return;
    }

    // Sprint Robustesse (30/08) — 🔴 risque de doublon corrigé : le bouton
    // restait cliquable dès `setChargement(false)`, avant même que la
    // redirection ci-dessous ait démarré. Un artisan impatient (réseau
    // lent) pouvait recliquer "Créer le projet" pendant cette fenêtre et
    // soumettre le formulaire une seconde fois — le premier projet, déjà
    // créé, restait alors invisible tant que la page n'avait pas changé.
    // `chargement` (donc le bouton) ne repasse à `false` que sur les
    // chemins d'échec ci-dessus ; sur le chemin de succès, il reste à
    // `true` jusqu'à la navigation, qui démonte de toute façon la page.
    // `enregistrerEvenement` est volontairement "jamais bloquant" (voir
    // lib/timeline.ts) : son échec éventuel ne doit jamais retarder ni
    // empêcher la redirection vers le projet qui, lui, existe déjà.
    await enregistrerEvenement(supabase, {
      demandeId: data.id,
      artisanId: user.id,
      organisationId,
      type: "projet_cree",
      titre: "Premier contact",
      detail: description,
    });

    effacerBrouillonDescription();
    router.push(`/dashboard/demandes/${data.id}?cree=1`);
  }

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-ink">Nouveau projet</h1>

      {messageErreurPartage && (
        <div className="mt-4 rounded-xl border border-signal/25 bg-signal/5 px-4 py-3">
          <p className="text-sm text-signal">{messageErreurPartage}</p>
        </div>
      )}

      {/* 27/09 — Pendant la dictée, l'écran est tout entier à l'écoute : un
          grand micro, le texte qui s'écrit en gros, un seul bouton. Avant,
          on arrivait sur un formulaire, le clavier s'ouvrait sur « Nom du
          client », et le seul signe d'écoute était un petit lien. */}
      {enregistrement && (
        <div className="mt-12 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={arreterDictee}
            aria-label="Arrêter l'écoute"
            className="relative grid h-28 w-28 place-items-center rounded-full bg-signal text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/40"
          >
            <span aria-hidden className="absolute -inset-4 rounded-full bg-signal/15 motion-safe:animate-pulse" />
            <IconeMicro className="relative h-11 w-11" />
          </button>
          <p className="mt-6 font-display text-xl font-semibold text-ink">Je vous écoute</p>
          <p className="mt-1 text-[15px] text-ink/65">Le client, le chantier, son numéro.</p>
          {description && (
            <p className="mt-6 w-full rounded-2xl bg-surface p-4 text-left text-[17px] leading-relaxed text-ink ring-1 ring-ink/10">
              {description}
            </p>
          )}
          <button
            type="button"
            onClick={arreterDictee}
            className="mt-6 w-full min-h-14 rounded-2xl bg-ink text-[16px] font-semibold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
          >
            Terminé
          </button>
        </div>
      )}

      <div className={`mt-6 ${enregistrement ? "hidden" : ""}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Field
              id="nom-client"
              label="Nom du client"
              required
              // Arrivé par « Parler », pas de clavier : on écoute d'abord.
              autoFocus={searchParams.get("dictee") !== "1"}
              value={nomClient}
              onChange={(e) => setNomClient(e.target.value)}
              onBlur={() => verifierClientExistant("nom")}
            />
            {anciensProjets.length > 0 && (
              <div className="mt-2 rounded-xl border border-ink/10 bg-paper-warm p-3">
                <p className="text-xs text-ink/50">
                  {anciensProjets.length === 1
                    ? "Un projet existe déjà pour ce nom :"
                    : `${anciensProjets.length} projets existent déjà pour ce nom :`}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {anciensProjets.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/demandes/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ink/70 hover:text-ink underline underline-offset-2 transition-colors"
                    >
                      {LABEL_TYPE_CHANTIER[p.type_chantier] || "Chantier"} —{" "}
                      {LABEL_STATUT[p.statut as keyof typeof LABEL_STATUT] ?? p.statut} (
                      {new Date(p.created_at).toLocaleDateString("fr-FR")})
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink/35">
                  Si c&apos;est un nouveau chantier pour ce client, continuez : un nouveau
                  projet séparé est la bonne approche.
                </p>
              </div>
            )}
          </div>
          <Field
            label="Téléphone (facultatif)"
            type="tel"
            value={telephoneClient}
            onChange={(e) => setTelephoneClient(e.target.value)}
            onBlur={() => verifierClientExistant("telephone")}
          />

          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label htmlFor="description-projet" className="text-xs font-medium text-ink/70">
                Ce que veut le client
              </label>
              {/* Seulement si le téléphone sait dicter ; sinon, le micro du
                  clavier fait très bien l'affaire. */}
              {dicteePossible && (
                <button
                  type="button"
                  onClick={dicter}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium text-ink ring-1 ring-ink/15 transition hover:ring-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
                >
                  <IconeMicro className="h-4 w-4 text-signal" /> Dicter
                </button>
              )}
            </div>
            {brouillonRestaure && (
              <p className="mb-1.5 text-xs text-steel">
                Description non enregistrée retrouvée — relisez-la avant de créer le projet.
              </p>
            )}
            <textarea
              id="description-projet"
              required
              rows={3}
              placeholder="Ex : veut refaire sa salle de bain, douche à l'italienne"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
            />
          </div>

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="w-full min-h-14 rounded-2xl bg-ink text-[16px] font-semibold text-paper transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
          >
            {chargement ? "Création…" : "Créer le projet"}
          </button>
        </form>
      </div>
    </div>
  );
}
