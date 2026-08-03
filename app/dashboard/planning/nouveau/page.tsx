"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { Field, TextareaField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TypeEvenement, Priorite } from "@/types";

const COULEUR_PRIORITE: Record<Priorite, string> = {
  urgent: "bg-[#C23B22]",
  important: "bg-[#D9861A]",
  normal: "bg-[#2F8F5B]",
};

type ProjetLeger = { id: string; nom_client: string; priorite: Priorite };

export default function NouvelEvenementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const eventId = searchParams.get("eventId");
  const enModeEdition = Boolean(eventId);

  const [type, setType] = useState<TypeEvenement>("rendez_vous");
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState(60);
  const [demandeId, setDemandeId] = useState(searchParams.get("projetId") ?? "");
  const [notes, setNotes] = useState("");
  const [projets, setProjets] = useState<ProjetLeger[]>([]);
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [chargementInitial, setChargementInitial] = useState(enModeEdition);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function chargerProjets() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("demandes")
        .select("id, nom_client, priorite")
        .eq("artisan_id", user.id)
        .neq("statut", "termine")
        .order("created_at", { ascending: false });
      setProjets((data as ProjetLeger[]) ?? []);
    }
    chargerProjets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En mode édition, on précharge l'événement existant.
  useEffect(() => {
    if (!eventId) return;
    async function chargerEvenement() {
      const { data } = await supabase
        .from("evenements_planning")
        .select("*")
        .eq("id", eventId)
        .single();

      if (data) {
        setType(data.type);
        setTitre(data.titre);
        const d = new Date(data.date_heure);
        setDate(d.toISOString().slice(0, 10));
        setHeure(d.toTimeString().slice(0, 5));
        setDureeMinutes(data.duree_minutes ?? 60);
        setDemandeId(data.demande_id ?? "");
        setNotes(data.notes ?? "");
      }
      setChargementInitial(false);
    }
    chargerEvenement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const projetSelectionne = projets.find((p) => p.id === demandeId);

  async function choisirProjet(p: ProjetLeger) {
    setDemandeId(p.id);
    setSelecteurOuvert(false);
    if (!titre.trim()) {
      setTitre(`Chantier ${p.nom_client}`);
    }

    if (!date && !heure) {
      const { data } = await supabase
        .from("evenements_planning")
        .select("date_heure")
        .eq("demande_id", p.id)
        .gte("date_heure", new Date().toISOString())
        .order("date_heure", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.date_heure) {
        const d = new Date(data.date_heure);
        setDate(d.toISOString().slice(0, 10));
        setHeure(d.toTimeString().slice(0, 5));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !date || !heure) {
      setErreur("Merci de remplir la date et l'heure.");
      setChargement(false);
      return;
    }

    const debut = new Date(`${date}T${heure}`);
    const fin = new Date(debut.getTime() + (type === "rendez_vous" ? dureeMinutes : 15) * 60000);

    // Un rendez-vous ou une tâche à créer ne peut pas être daté dans le
    // passé — ça n'aurait aucun sens. On ne bloque en revanche jamais la
    // modification d'un événement déjà existant : corriger ou marquer
    // terminé un rendez-vous d'il y a trois jours doit rester possible.
    if (!enModeEdition && debut.getTime() < Date.now()) {
      setErreur("Impossible de planifier un événement à une date déjà passée.");
      setChargement(false);
      return;
    }

    // Un artisan ne peut pas être à deux chantiers en même temps — on
    // exclut l'événement en cours d'édition de cette vérification.
    if (type === "rendez_vous") {
      const debutJour = new Date(date);
      debutJour.setHours(0, 0, 0, 0);
      const finJour = new Date(date);
      finJour.setHours(23, 59, 59, 999);

      const { data: evenementsJour } = await supabase
        .from("evenements_planning")
        .select("id, titre, date_heure, duree_minutes")
        .eq("artisan_id", user.id)
        .eq("type", "rendez_vous")
        .neq("statut", "annule")
        .gte("date_heure", debutJour.toISOString())
        .lte("date_heure", finJour.toISOString());

      const conflit = (evenementsJour ?? [])
        .filter((ev) => ev.id !== eventId)
        .find((ev) => {
          const debutExistant = new Date(ev.date_heure);
          const finExistant = new Date(
            debutExistant.getTime() + (ev.duree_minutes ?? 60) * 60000
          );
          return debut < finExistant && fin > debutExistant;
        });

      if (conflit) {
        setErreur(
          `Créneau déjà pris : "${conflit.titre}" à ${new Date(
            conflit.date_heure
          ).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Choisissez un autre horaire.`
        );
        setChargement(false);
        return;
      }
    }

    const dateHeure = debut.toISOString();
    const donnees = {
      demande_id: demandeId || null,
      titre,
      type,
      date_heure: dateHeure,
      duree_minutes: type === "rendez_vous" ? dureeMinutes : null,
      notes: notes || null,
    };

    const { error } = enModeEdition
      ? await supabase.from("evenements_planning").update(donnees).eq("id", eventId)
      : await supabase
          .from("evenements_planning")
          .insert({ ...donnees, artisan_id: user.id });

    setChargement(false);

    if (error) {
      setErreur("Impossible d'enregistrer. Réessayez.");
      return;
    }

    // Seuls les rendez-vous liés à un projet enrichissent sa timeline —
    // une tâche libre ("Rappeler Durand") n'apporte rien à la chronologie
    // du chantier et ajouterait du bruit inutile.
    if (demandeId && type === "rendez_vous") {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        type: "rdv_planifie",
        titre: enModeEdition ? "Rendez-vous modifié" : "Rendez-vous planifié",
        detail: `${titre} — ${new Date(dateHeure).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      });
    }

    router.push("/dashboard/planning");
    router.refresh();
  }

  if (chargementInitial) {
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }

  return (
    <div className="p-8 max-w-lg">
      <Link href="/dashboard/planning" className="text-sm text-ink/60 hover:text-ink">
        ← Retour au planning
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold">
        {enModeEdition ? "Modifier l'événement" : "Ajouter au planning"}
      </h1>

      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("rendez_vous")}
              className={`flex-1 px-4 py-2.5 text-sm border transition-colors ${
                type === "rendez_vous"
                  ? "bg-ink text-paper border-ink"
                  : "border-ink/15 text-ink/60"
              }`}
            >
              Rendez-vous
            </button>
            <button
              type="button"
              onClick={() => setType("tache")}
              className={`flex-1 px-4 py-2.5 text-sm border transition-colors ${
                type === "tache" ? "bg-ink text-paper border-ink" : "border-ink/15 text-ink/60"
              }`}
            >
              Tâche
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1.5">
              Projet lié (optionnel)
            </label>

            {projetSelectionne && (
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${COULEUR_PRIORITE[projetSelectionne.priorite]}`}
                />
                <span className="text-sm text-ink/80">{projetSelectionne.nom_client}</span>
                <button
                  type="button"
                  onClick={() => setDemandeId("")}
                  className="text-xs text-ink/40 hover:text-ink underline ml-1"
                >
                  retirer
                </button>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelecteurOuvert(!selecteurOuvert)}
            >
              {projetSelectionne ? "Changer de chantier" : "Choisir un chantier"}
            </Button>

            {selecteurOuvert && (
              <div className="mt-2 border border-ink/10 max-h-52 overflow-y-auto">
                {projets.length === 0 && (
                  <p className="p-3 text-xs text-ink/40">Aucun projet actif.</p>
                )}
                {projets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choisirProjet(p)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-paper border-b border-ink/5 last:border-b-0"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${COULEUR_PRIORITE[p.priorite]}`}
                    />
                    {p.nom_client}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field
            label="Titre"
            required
            placeholder={type === "rendez_vous" ? "Ex : Chantier Dupont" : "Ex : Rappeler Durand"}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-5">
            <Field
              label="Date"
              type="date"
              required
              min={enModeEdition ? undefined : new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Field
              label="Heure"
              type="time"
              required
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
            />
          </div>

          {type === "rendez_vous" && (
            <Field
              label="Durée (minutes)"
              type="number"
              value={dureeMinutes}
              onChange={(e) => setDureeMinutes(Number(e.target.value))}
            />
          )}

          <TextareaField
            label="Notes (optionnel)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <Button type="submit" disabled={chargement} className="self-start">
            {chargement
              ? "Enregistrement…"
              : enModeEdition
              ? "Enregistrer les modifications"
              : "Ajouter"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
