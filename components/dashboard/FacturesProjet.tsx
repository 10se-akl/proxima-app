"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { ErreurInline } from "@/components/ui/EtatErreur";
import { FacturePreview } from "@/components/dashboard/FacturePreview";
import type { Devis, Facture } from "@/types";
import { montantAcompte as calculerAcompteSigne } from "@/lib/devis/mentionsLegales";
import { montantFrancais } from "@/lib/messagesClient";
import { Feuille } from "@/components/projet/Feuille";
import { BOUTON_TEXTE } from "@/components/projet/Blocs";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const LIBELLE_TYPE: Record<Facture["type"], string> = {
  facture: "Facture",
  acompte: "Facture d'acompte",
  avoir: "Avoir",
};

// Refonte (03/10) — règles 4 et 10 : deux tons de texte ; « Payée »
// s'écrit en encre (plus en terracotta).
const LIBELLE_STATUT: Record<Facture["statut"], { texte: string; classe: string }> = {
  emise: { texte: "Émise", classe: "text-steel" },
  payee: { texte: "Payée", classe: "font-semibold text-ink" },
  annulee: { texte: "Annulée", classe: "text-steel" },
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
  surSolde,
  demandeSolde = 0,
}: {
  /** Refonte (03/10, duel D lot 3) — le reste à facturer (après acomptes
   *  et avoirs), remonté à la fiche à chaque chargement : « Maintenant »
   *  dit « Reste 5 075 € à facturer. » sans second chargement. */
  surSolde?: (solde: number) => void;
  /** Un compteur : chaque hausse ouvre la question « Facture de solde :
   *  … ? » (« Préparer la facture », dans « Maintenant »). */
  demandeSolde?: number;
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
  // Acompte au-delà du devis, en attente de la seconde confirmation.
  const [depassement, setDepassement] = useState<{ total: number; plafond: number; deja: number } | null>(null);
  const [factureOuverteId, setFactureOuverteId] = useState<string | null>(null);
  const [actionEnCoursId, setActionEnCoursId] = useState<string | null>(null);
  // Refonte (02/10, duel D lot 1) — une facture numérotée ne se crée plus
  // d'un appui, et un avoir ne passe plus par window.confirm : une feuille
  // pose la question, avec le montant (règle 6 de docs/langage-interface.md).
  const [question, setQuestion] = useState<{ genre: "solde" } | { genre: "avoir"; id: string } | null>(null);

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

  async function creerFacture(type: "facture" | "acompte", accepterDepassement = false) {
    setErreur(null);
    const montantAcompteTTC = type === "acompte" ? Number(montantAcompte.replace(",", ".")) : undefined;
    if (type === "acompte" && (!montantAcompteTTC || montantAcompteTTC <= 0)) {
      setErreur("Indiquez un montant d'acompte valide.");
      return;
    }
    // Audit (11/09) — une erreur de saisie (3000 au lieu de 300) créait une
    // vraie facture d'acompte pour plus que le devis, sans avertissement.
    // 27/09 (Axel) — « L'artisan garde la main » : ce n'est plus bloqué,
    // mais le premier « Créer » affiche un avertissement qui dit la
    // conséquence, et seul « Créer quand même » crée la facture. Une faute
    // de frappe se voit ; un vrai dépassement reste possible.
    if (type === "acompte" && montantAcompteTTC && !accepterDepassement) {
      const montantAcomptesExistants = factures
        .filter((f) => f.type === "acompte" && f.statut !== "annulee")
        .reduce((s, f) => s + f.total_ttc, 0);
      if (montantAcomptesExistants + montantAcompteTTC > devis.total_estime + 0.01) {
        setDepassement({
          total: montantAcomptesExistants + montantAcompteTTC,
          plafond: devis.total_estime,
          deja: montantAcomptesExistants,
        });
        return;
      }
    }
    setCreationEnCours(type);
    try {
      const res = await fetch("/api/factures/creer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id, type, montantAcompteTTC, accepterDepassement: accepterDepassement || undefined }),
      });
      const donnees = await res.json();
      if (!res.ok) {
        // Le serveur compte au plus juste (franchise de TVA : le plafond est
        // le HT) : son refus mène au même avertissement, pas à une erreur.
        if (type === "acompte" && donnees.depassement && montantAcompteTTC && !accepterDepassement) {
          setDepassement({
            total: donnees.depassement.dejaFacture + montantAcompteTTC,
            plafond: donnees.depassement.plafond,
            deja: donnees.depassement.dejaFacture,
          });
          return;
        }
        setErreur(donnees.error || "Impossible de créer la facture.");
        return;
      }
      setDepassement(null);
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

  useEffect(() => {
    if (chargement || erreurChargement) return;
    const deja = factures.reduce((s, f) => s + f.total_ttc, 0);
    surSolde?.(Math.max(0, Math.round((devis.total_estime - deja) * 100) / 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factures, chargement, erreurChargement, devis.total_estime]);

  useEffect(() => {
    if (demandeSolde > 0) setQuestion({ genre: "solde" });
  }, [demandeSolde]);

  // Règle 11 : la forme vide d'une ligne, pas un mot.
  if (chargement) {
    return <div className="mt-2 h-16 rounded-2xl bg-ink/10 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement des factures" />;
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
    // Refonte (03/10, duel D lot 3) — dans le bloc « Argent » de la fiche,
    // sous la ligne du devis : plus de carte dans un bloc (règle 8), le
    // titre est celui du bloc. L'ancre #facturation est sur le bloc.
    <div className="mt-1">
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

      {!erreurChargement && factures.length === 0 && <p className="mt-2 text-base text-steel">Aucune facture.</p>}

      {factures.length > 0 && (
        <div className="mt-1 divide-y divide-ink/15 border-t border-ink/15">
          {factures.map((f) => (
            <div key={f.id} className="py-2">
              <div className="flex min-h-12 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">
                    {LIBELLE_TYPE[f.type]} n° {f.numero}
                  </p>
                  <p className="truncate text-sm text-steel">
                    {new Date(f.date_emission).toLocaleDateString("fr-FR")} ·{" "}
                    <span className={LIBELLE_STATUT[f.statut].classe}>{LIBELLE_STATUT[f.statut].texte}</span>
                  </p>
                </div>
                <p className="shrink-0 font-mono text-base tabular-nums text-ink">{formatEuros(f.total_ttc)}</p>
              </div>
              <div className="-ml-3 flex flex-wrap">
                <button
                  type="button"
                  onClick={() => setFactureOuverteId(factureOuverteId === f.id ? null : f.id)}
                  className={BOUTON_TEXTE}
                >
                  {factureOuverteId === f.id ? "Masquer" : "Voir / Imprimer"}
                </button>
                {f.statut === "emise" && f.type !== "avoir" && (
                  <>
                    <button
                      type="button"
                      onClick={() => marquerPayee(f.id)}
                      disabled={actionEnCoursId === f.id}
                      className={BOUTON_TEXTE}
                    >
                      Marquer payée
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestion({ genre: "avoir", id: f.id })}
                      disabled={actionEnCoursId === f.id}
                      className={BOUTON_TEXTE}
                    >
                      Annuler
                    </button>
                  </>
                )}
                {f.statut === "payee" && (
                  <button
                    type="button"
                    onClick={() => setQuestion({ genre: "avoir", id: f.id })}
                    disabled={actionEnCoursId === f.id}
                    className={BOUTON_TEXTE}
                  >
                    Annuler
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
        <p className="mt-3 truncate text-sm text-steel">
          Reste à facturer : <span className="font-mono tabular-nums text-ink">{formatEuros(soldeRestant)}</span>
        </p>
      )}

      {erreur && <ErreurInline className="mt-3" message={erreur} />}

      <div className="mt-3 flex flex-wrap gap-2">
        {soldeRestant > 0 && !afficherFormAcompte && (
          <Button
            variant="ghost"
            onClick={() => {
              // 21/09 — Pré-rempli avec l'acompte SIGNÉ (« 30 %, soit
              // 307,31 € »), calculé par la même fonction que le devis :
              // l'artisan facture exactement ce que son client a accepté,
              // sans refaire le calcul de tête. Seulement pour le premier
              // acompte, et toujours modifiable.
              const dejaUnAcompte = factures.some((f) => f.type === "acompte" && f.statut !== "annulee");
              if (!montantAcompte && devis.acompte_pct && devis.acompte_pct > 0 && !dejaUnAcompte) {
                setMontantAcompte(calculerAcompteSigne(devis.total_estime, devis.acompte_pct).toFixed(2).replace(".", ","));
              }
              setAfficherFormAcompte(true);
            }}
          >
            Facture d&apos;acompte
          </Button>
        )}
        {soldeRestant > 0 && (
          <Button
            variant="ghost"
            onClick={() => setQuestion({ genre: "solde" })}
            loading={creationEnCours === "facture"}
          >
            Facture de solde
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
            onChange={(e) => {
              setMontantAcompte(e.target.value);
              // L'avertissement porte sur le montant affiché : on le retire
              // dès que celui-ci change.
              setDepassement(null);
            }}
          />
          <Button
            onClick={() => creerFacture("acompte")}
            loading={creationEnCours === "acompte" && !depassement}
            disabled={depassement !== null}
          >
            {creationEnCours === "acompte" && !depassement ? "Création…" : "Créer"}
          </Button>
        </div>
      )}

      {afficherFormAcompte && depassement && (
        <div role="alert" className="mt-3 rounded-xl border border-alerte-orange/40 bg-alerte-orange/10 px-4 py-3">
          <p className="text-sm font-medium text-ink">Attention : cet acompte dépasse le devis.</p>
          <p className="mt-1 text-sm text-steel">
            Avec lui, {formatEuros(depassement.total)} seront facturés sur un devis de {formatEuros(depassement.plafond)}
            {depassement.deja > 0 ? ` (dont ${formatEuros(depassement.deja)} déjà en acompte)` : ""}. La facture de solde ne sera
            plus possible sur ce devis.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => creerFacture("acompte", true)} loading={creationEnCours === "acompte"}>
              {creationEnCours === "acompte" ? "Création…" : "Créer quand même"}
            </Button>
            <Button variant="ghost" onClick={() => setDepassement(null)} disabled={creationEnCours !== null}>
              Corriger le montant
            </Button>
          </div>
        </div>
      )}

      {factures.length > 0 && (
        <a href="/api/factures/export-comptable" className={`-ml-3 mt-1 ${BOUTON_TEXTE}`}>
          Export comptable (CSV)
        </a>
      )}

      <Feuille
        ouverte={question !== null}
        titre={question?.genre === "avoir" ? "Annuler cette facture ?" : `Facture de solde : ${montantFrancais(soldeRestant)} € ?`}
        surFermer={() => setQuestion(null)}
      >
        <p className="text-base text-steel">
          {question?.genre === "avoir" ? "Un avoir est créé pour la même somme." : "Elle reçoit son numéro, définitif."}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {question?.genre === "avoir" ? (
            <button
              type="button"
              onClick={() => {
                const id = question.id;
                setQuestion(null);
                void creerAvoir(id);
              }}
              className="min-h-12 w-full rounded-2xl px-4 text-base font-semibold text-signal-fonce ring-1 ring-inset ring-signal-fonce/50 dark:text-signal-clair dark:ring-signal-clair/50"
            >
              Créer l&apos;avoir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuestion(null);
                void creerFacture("facture");
              }}
              className="min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80"
            >
              Créer la facture
            </button>
          )}
          <button
            type="button"
            onClick={() => setQuestion(null)}
            className="min-h-12 w-full px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
          >
            {question?.genre === "avoir" ? "Garder la facture" : "Pas maintenant"}
          </button>
        </div>
      </Feuille>
    </div>
  );
}
