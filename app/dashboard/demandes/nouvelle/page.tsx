"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import {
  obtenirClasseReconnaissance,
  messageErreurDictee,
  type SpeechRecognitionInstance,
} from "@/lib/dictee";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LABEL_STATUT, LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";

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
  if (
    t.includes("chauffage") ||
    t.includes("chaudière") ||
    t.includes("chaudiere") ||
    t.includes("radiateur") ||
    t.includes("pompe à chaleur") ||
    t.includes("pompe a chaleur") ||
    t.includes("clim")
  )
    return "chauffage";
  if (t.includes("rénovation") || t.includes("renovation")) return "renovation_complete";
  return "autre";
}

export default function NouveauProjetPage() {
  const router = useRouter();
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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Simple vérification par nom — pas de vraie fiche client (voir échange
  // sur le sujet), juste de quoi éviter qu'un artisan recrée un projet en
  // pensant que c'est le premier contact avec ce client, et lui montrer
  // directement les anciens chantiers plutôt qu'un simple compteur : le
  // clic en moins compte, surtout au téléphone avec le client en attente.
  async function verifierClientExistant() {
    if (!nomClient.trim()) {
      setAnciensProjets([]);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("demandes")
      .select("id, type_chantier, statut, created_at")
      .eq("artisan_id", user.id)
      .ilike("nom_client", `%${nomClient.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    setAnciensProjets(data ?? []);
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
    recognition.onresult = (event) => {
      let texte = "";
      for (let i = 0; i < event.results.length; i++) {
        texte += event.results[i][0].transcript;
      }
      setDescription(texte);
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

  function arreterDictee() {
    recognitionRef.current?.stop();
    setEnregistrement(false);
  }

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

    const { data, error } = await supabase
      .from("demandes")
      .insert({
        artisan_id: user.id,
        nom_client: nomClient,
        telephone_client: telephoneClient || null,
        description,
        type_chantier: detecterTypeChantier(description),
      })
      .select("id")
      .single();

    setChargement(false);

    if (error || !data) {
      setErreur("Impossible d'enregistrer le projet.");
      return;
    }

    await enregistrerEvenement(supabase, {
      demandeId: data.id,
      artisanId: user.id,
      type: "projet_cree",
      titre: "Premier contact",
      detail: description,
    });

    router.push(`/dashboard/demandes/${data.id}`);
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-ink">Nouveau projet</h1>
      <p className="mt-2 text-sm text-ink/60">
        Juste l&apos;essentiel — le reste (adresse, type de chantier, email...) se
        complète plus tard, directement depuis le projet.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Field
              label="Nom du client"
              required
              autoFocus
              value={nomClient}
              onChange={(e) => setNomClient(e.target.value)}
              onBlur={verifierClientExistant}
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
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-ink/70">
                Description rapide
              </label>
              {!enregistrement ? (
                <button
                  type="button"
                  onClick={dicter}
                  className="text-xs text-ink/50 hover:text-ink underline transition-colors"
                >
                  🎙 Dicter plutôt que taper
                </button>
              ) : (
                <button
                  type="button"
                  onClick={arreterDictee}
                  className="text-xs text-signal underline animate-pulse"
                >
                  ⏹ Arrêter l&apos;écoute
                </button>
              )}
            </div>
            <textarea
              required
              rows={3}
              placeholder="Ex : veut refaire sa salle de bain, douche à l'italienne"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
            />
          </div>

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <Button type="submit" disabled={chargement} className="self-start">
            {chargement ? "Création…" : "Créer le projet"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
