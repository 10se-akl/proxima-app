"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Input";
import { ErreurInline } from "@/components/ui/EtatErreur";
import { FacturePreview } from "@/components/dashboard/FacturePreview";
import type { Devis, Facture } from "@/types";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const LIBELLE_TYPE: Record<Facture["type"], string> = {
  facture: "Facture",
  acompte: "Facture d'acompte",
  avoir: "Avoir",
};

const LIBELLE_STATUT: Record<Facture["statut"], { texte: string; classe: string }> = {
  emise: { texte: "Émise", classe: "text-steel" },
  payee: { texte: "Payée", classe: "text-signal" },
  annulee: { texte: "Annulée", classe: "text-ink/40" },
};

// ============================================================
// Module 28 (06/09) — section "Facturation" de la fiche projet, montée
// une fois le devis accepté par le client (voir app/dashboard/demandes/
// [id]/page.tsx). Liste les factures déjà créées pour CE devis, propose
// d'en créer une nouvelle (facture d'acompte à un montant choisi par
// l'artisan, ou facture de solde qui déduit automatiquement les acomptes
// déjà émis), et les actions du cycle de vie d'une facture (marquer
// payée, annuler via un avoir).
// ============================================================
export function FacturesProjet({
  devis,
  nomClient,
  telephoneClient,
  adresseClient,
  logoUrl,
}: {
  devis: Devis;
  nomClient: string;
  telephoneClient?: string | null;
  adresseClient?: string | null;
  logoUrl?: string | null;
}) {
  const supabase = createClient();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [creationEnCours, setCreationEnCours] = useState<"facture" | "acompte" | null>(null);
  const [montantAcompte, setMontantAcompte] = useState("");
  const [afficherFormAcompte, setAfficherFormAcompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [factureOuverteId, setFactureOuverteId] = useState<string | null>(null);
  const [actionEnCoursId, setActionEnCoursId] = useState<string | null>(null);

  async function chargerFactures() {
    setErreurChargement(false);
    try {
      const { data, error } = await supabase
        .from("factures")
        .select("*")
        .eq("devis_id", devis.id)
        .order("date_emission", { ascending: true });
      if (error) throw error;
      setFactures((data ?? []) as Facture[]);
    } catch (err) {
      console.error("FacturesProjet: échec de chargement", err);
      setErreurChargement(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerFactures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis.id]);

  async function creerFacture(type: "facture" | "acompte") {
    setErreur(null);
    const montantAcompteTTC = type === "acompte" ? Number(montantAcompte.replace(",", ".")) : undefined;
    if (type === "acompte" && (!montantAcompteTTC || montantAcompteTTC <= 0)) {
      setErreur("Indiquez un montant d'acompte valide.");
      return;
    }
    setCreationEnCours(type);
    try {
      const res = await fetch("/api/factures/creer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id, type, montantAcompteTTC }),
      });
      const donnees = await res.json();
      if (!res.ok) {
        setErreur(donnees.error || "Impossible de créer la facture.");
        return;
      }
      setMontantAcompte("");
      setAfficherFormAcompte(false);
      await chargerFactures();
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setCreationEnCours(null);
    }
  }

  async function marquerPayee(id: string) {
    setErreur(null);
    setActionEnCoursId(id);
    try {
      const res = await fetch(`/api/factures/${id}/statut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "payee" }),
      });
      if (!res.ok) {
        const donnees = await res.json();
        setErreur(donnees.error || "Impossible de mettre à jour cette facture.");
        return;
      }
      await chargerFactures();
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setActionEnCoursId(null);
    }
  }

  async function creerAvoir(id: string) {
    if (!window.confirm("Annuler cette facture ? Un avoir sera créé pour la même somme.")) return;
    setErreur(null);
    setActionEnCoursId(id);
    try {
      const res = await fetch(`/api/factures/${id}/avoir`, { method: "POST" });
      if (!res.ok) {
        const donnees = await res.json();
        setErreur(donnees.error || "Impossible de créer l'avoir.");
        return;
      }
      await chargerFactures();
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setActionEnCoursId(null);
    }
  }

  if (chargement) {
    return <p className="mt-4 text-xs text-ink/40">Chargement des factures…</p>;
  }

  // Somme SANS filtrer sur le statut, volontairement : une facture annulée
  // garde son montant dans la somme (elle a légalement existé), et c'est
  // l'avoir qui l'annule en ajoutant son propre montant négatif — filtrer
  // les lignes "annulee" ferait compter l'avoir sans jamais compter la
  // facture qu'il annule, et le solde restant deviendrait faussement
  // négatif (bug repéré à la relecture avant livraison).
  const totalDejaFacture = factures.reduce((s, f) => s + f.total_ttc, 0);
  const soldeRestant = Math.max(0, devis.total_estime - totalDejaFacture);

  return (
    <Card className="mt-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">Facturation</p>
        {factures.length > 0 && (
          <a
            href="/api/factures/export-comptable"
            className="text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40"
          >
            Export comptable (CSV)
          </a>
        )}
      </div>

      {erreurChargement && (
        <ErreurInline
          className="mt-3"
          message="Impossible de charger les factures."
          onReessayer={() => {
            setChargement(true);
            chargerFactures();
          }}
        />
      )}

      {!erreurChargement && factures.length === 0 && (
        <p className="mt-2 text-sm text-ink/50">Aucune facture pour l&apos;instant.</p>
      )}

      {factures.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {factures.map((f) => (
            <div key={f.id} className="rounded-xl border border-ink/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {LIBELLE_TYPE[f.type]} n° {f.numero}
                  </p>
                  <p className="text-xs text-ink/50">
                    {new Date(f.date_emission).toLocaleDateString("fr-FR")} ·{" "}
                    <span className={LIBELLE_STATUT[f.statut].classe}>{LIBELLE_STATUT[f.statut].texte}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm">{formatEuros(f.total_ttc)}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFactureOuverteId(factureOuverteId === f.id ? null : f.id)}
                  className="text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40"
                >
                  {factureOuverteId === f.id ? "Masquer" : "Voir / Imprimer"}
                </button>
                {f.statut === "emise" && f.type !== "avoir" && (
                  <>
                    <button
                      type="button"
                      onClick={() => marquerPayee(f.id)}
                      disabled={actionEnCoursId === f.id}
                      className="text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40 disabled:opacity-50"
                    >
                      Marquer payée
                    </button>
                    <button
                      type="button"
                      onClick={() => creerAvoir(f.id)}
                      disabled={actionEnCoursId === f.id}
                      className="text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40 disabled:opacity-50"
                    >
                      Annuler (créer un avoir)
                    </button>
                  </>
                )}
                {f.statut === "payee" && (
                  <button
                    type="button"
                    onClick={() => creerAvoir(f.id)}
                    disabled={actionEnCoursId === f.id}
                    className="text-xs text-ink/50 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40 disabled:opacity-50"
                  >
                    Annuler (créer un avoir)
                  </button>
                )}
              </div>
              {factureOuverteId === f.id && (
                <div className="mt-3">
                  <FacturePreview
                    facture={f}
                    nomClient={nomClient}
                    telephoneClient={telephoneClient}
                    adresseClient={adresseClient}
                    logoUrl={logoUrl}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {soldeRestant > 0 && (
        <p className="mt-4 text-xs text-ink/50">
          Reste à facturer sur ce devis : <span className="font-mono">{formatEuros(soldeRestant)}</span>
        </p>
      )}

      {erreur && <ErreurInline className="mt-3" message={erreur} />}

      <div className="mt-4 flex flex-wrap gap-3">
        {soldeRestant > 0 && !afficherFormAcompte && (
          <Button variant="ghost" onClick={() => setAfficherFormAcompte(true)}>
            + Facture d&apos;acompte
          </Button>
        )}
        {soldeRestant > 0 && (
          <Button
            variant="ghost"
            onClick={() => creerFacture("facture")}
            loading={creationEnCours === "facture"}
          >
            {creationEnCours === "facture" ? "Création…" : "+ Facture (solde)"}
          </Button>
        )}
      </div>

      {afficherFormAcompte && (
        <div className="mt-3 flex items-end gap-3">
          <Field
            label="Montant de l'acompte (€ TTC)"
            type="number"
            step="0.01"
            min={0}
            value={montantAcompte}
            onChange={(e) => setMontantAcompte(e.target.value)}
          />
          <Button onClick={() => creerFacture("acompte")} loading={creationEnCours === "acompte"}>
            {creationEnCours === "acompte" ? "Création…" : "Créer"}
          </Button>
        </div>
      )}
    </Card>
  );
}
