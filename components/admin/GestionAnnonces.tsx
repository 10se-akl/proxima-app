"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBELLE_GENRE, type GenreAnnonce } from "@/lib/annonces";
import {
  AIDE,
  BOUTON_CREUX,
  BOUTON_PLEIN,
  CARTE_PLEINE,
  CHAMP,
  ERREUR,
  LIBELLE,
  SECONDAIRE,
  SELECT,
  TITRE_ECRAN,
  TITRE_SECTION,
} from "@/components/ui/recettes";

// ============================================================
// /admin/annonces (04/11/2026) — le formulaire d'Axel et la liste des
// messages déjà publiés. Rien ne part par e-mail ni sur le téléphone : le
// message attend dans la cloche. Un message retiré disparaît des cloches
// mais reste ici (on ne supprime rien).
// ============================================================

export type AnnonceAdmin = {
  id: string;
  genre: GenreAnnonce;
  titre: string;
  texte: string;
  lien: string | null;
  organisation_id: string | null;
  active: boolean;
  publiee_le: string;
  lues: number;
};

const GENRES: GenreAnnonce[] = ["nouveaute", "offre", "message"];
const formatDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function GestionAnnonces({
  annonces,
  organisations,
  moduleManquant,
}: {
  annonces: AnnonceAdmin[];
  organisations: { id: string; nom: string }[];
  moduleManquant: boolean;
}) {
  const router = useRouter();
  const [genre, setGenre] = useState<GenreAnnonce>("nouveaute");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [lien, setLien] = useState("");
  const [pour, setPour] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [publie, setPublie] = useState(false);
  const nomDe = new Map(organisations.map((o) => [o.id, o.nom]));

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    setPublie(false);
    try {
      const res = await fetch("/api/admin/annonces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, titre, texte, lien, organisation_id: pour || null }),
      });
      const corps = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(`${corps?.error ?? `Erreur ${res.status}`}${corps?.detail ? ` (${corps.detail})` : ""}`);
        return;
      }
      setTitre("");
      setTexte("");
      setLien("");
      setPublie(true);
      router.refresh();
    } catch {
      setErreur("Pas de connexion au serveur.");
    } finally {
      setEnCours(false);
    }
  }

  async function basculer(a: AnnonceAdmin) {
    setErreur(null);
    const res = await fetch("/api/admin/annonces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    }).catch(() => null);
    if (!res?.ok) {
      setErreur("Modification impossible. Réessayez.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className={TITRE_ECRAN}>Messages aux comptes</h1>
      <p className={`mt-2 max-w-xl ${SECONDAIRE}`}>
        Une nouveauté, une offre ou un message : il arrive dans la cloche de l’app et du site, et compte dans le chiffre
        rouge tant qu’il n’est pas lu. Rien n’est envoyé par e-mail ni sur le téléphone.
      </p>

      {moduleManquant && (
        <p className="mt-4 rounded-[14px] bg-signal-fond px-4 py-3 text-[15px] font-semibold text-signal-fonce">
          Le Module 54 n’est pas encore passé : colle supabase/migrations/54-annonces.sql dans Supabase (SQL Editor), puis
          recharge la page.
        </p>
      )}

      <form onSubmit={publier} className={`mt-6 flex flex-col gap-4 ${CARTE_PLEINE}`}>
        <fieldset>
          <legend className={LIBELLE}>Genre</legend>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={genre === g}
                onClick={() => setGenre(g)}
                className={genre === g ? BOUTON_PLEIN : BOUTON_CREUX}
              >
                {LIBELLE_GENRE[g]}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <span className={LIBELLE}>Titre</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={120} required className={CHAMP} placeholder="Nouveau : la facture d’acompte" />
        </label>
        <label>
          <span className={LIBELLE}>Texte (facultatif)</span>
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={1000} rows={3} className={`${CHAMP} py-3`} />
          <span className={AIDE}>{texte.length} / 1 000</span>
        </label>
        <label>
          <span className={LIBELLE}>Lien (facultatif)</span>
          <input value={lien} onChange={(e) => setLien(e.target.value)} className={CHAMP} placeholder="/dashboard/guide ou https://…" />
          <span className={AIDE}>Une page de Compyo (commence par /) ou une adresse https.</span>
        </label>
        <label>
          <span className={LIBELLE}>Pour qui</span>
          <select value={pour} onChange={(e) => setPour(e.target.value)} className={SELECT}>
            <option value="">Tous les comptes</option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nom}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={enCours || !titre.trim() || moduleManquant} className={BOUTON_PLEIN}>
            {enCours ? "Publication…" : "Publier"}
          </button>
          {publie && <span className="text-[15px] font-semibold text-succes">Publié. Il est dans les cloches.</span>}
        </div>
        {erreur && <p className={ERREUR}>{erreur}</p>}
      </form>

      <h2 className={`mt-10 ${TITRE_SECTION}`}>Déjà publiés</h2>
      {annonces.length === 0 ? (
        <p className={`mt-2 ${SECONDAIRE}`}>Aucun message pour l’instant.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {annonces.map((a) => (
            <li key={a.id} className={`${CARTE_PLEINE} ${a.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">{a.titre}</p>
                  {a.texte && <p className={`mt-1 whitespace-pre-line ${SECONDAIRE}`}>{a.texte}</p>}
                  <p className="mt-1 text-sm text-steel">
                    {LIBELLE_GENRE[a.genre]} · {formatDate.format(new Date(a.publiee_le))} ·{" "}
                    {a.organisation_id ? (nomDe.get(a.organisation_id) ?? "une entreprise") : "tous les comptes"} ·{" "}
                    <span className="tabular-nums">lu par {a.lues}</span>
                    {a.lien && ` · ${a.lien}`}
                    {!a.active && " · retiré"}
                  </p>
                </div>
                <button type="button" onClick={() => basculer(a)} className={BOUTON_CREUX}>
                  {a.active ? "Retirer" : "Remettre"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
