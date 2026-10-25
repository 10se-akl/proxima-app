"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ErreurInline } from "@/components/ui/EtatErreur";
import { FacturePreview } from "@/components/dashboard/FacturePreview";
import type { Devis, Facture } from "@/types";
import { montantAcompte as calculerAcompteSigne } from "@/lib/devis/mentionsLegales";
import { Feuille } from "@/components/projet/Feuille";
import { BOUTON_CREUX_SUR_TEINTE, BOUTON_TEXTE } from "@/components/projet/Blocs";
import {
  BOUTON_ALERTE,
  BOUTON_PLEIN_LARGE,
  CHAMP,
  ETIQUETTE,
  FORME_ETIQUETTE,
  LIBELLE,
  MONTANT,
  SECONDAIRE,
  euros,
  type Ton,
} from "@/components/ui/recettes";

// Design v3 (24/10) : les montants passent par euros() (espaces
// insécables : « 1 250,00 € » ne se coupe jamais).
function formatEuros(n: number) {
  return euros(n, true);
}

const LIBELLE_TYPE: Record<Facture["type"], string> = {
  facture: "Facture",
  acompte: "Facture d'acompte",
  avoir: "Avoir",
};

// Design v3 (24/10) — l'état d'une facture en étiquette : payée en vert
// (l'argent est rentré), à encaisser en « à faire », annulée en neutre.
const LIBELLE_STATUT: Record<Facture["statut"], { texte: string; ton: Ton }> = {
  emise: { texte: "À encaisser", ton: "attention" },
  payee: { texte: "Payée", ton: "succes" },
  annulee: { texte: "Annulée", ton: "neutre" },
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
    return <div className="mt-3 h-16 rounded-[14px] bg-paper-warm" aria-busy="true" aria-label="Chargement des factures" />;
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

      {!erreurChargement && factures.length === 0 && <p className={`mt-2 ${SECONDAIRE}`}>Aucune facture.</p>}

      {factures.length > 0 && (
        <div className="mt-2 divide-y divide-gris-clair border-t border-gris-clair">
          {factures.map((f) => (
            <div key={f.id} className="py-3">
              <div className="flex min-h-12 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-snug text-ink">
                    {LIBELLE_TYPE[f.type]} n°&nbsp;{f.numero}
                  </p>
                  <p className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 ${SECONDAIRE}`}>
                    <span className="tabular-nums">{new Date(f.date_emission).toLocaleDateString("fr-FR")}</span>
                    {/* Un avoir est créé « émis » : il annule, il ne s'encaisse pas. */}
                    {f.type === "avoir" && f.statut === "emise" ? (
                      <span className={`${FORME_ETIQUETTE} ${ETIQUETTE.neutre}`}>Avoir émis</span>
                    ) : (
                      <span className={`${FORME_ETIQUETTE} ${ETIQUETTE[LIBELLE_STATUT[f.statut].ton]}`}>{LIBELLE_STATUT[f.statut].texte}</span>
                    )}
                  </p>
                </div>
                <p className={`shrink-0 whitespace-nowrap text-base ${MONTANT}`}>{formatEuros(f.total_ttc)}</p>
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
        <p className={`mt-3 ${SECONDAIRE}`}>
          Reste à facturer : <span className={`whitespace-nowrap ${MONTANT}`}>{formatEuros(soldeRestant)}</span>
        </p>
      )}

      {erreur && <ErreurInline className="mt-3" message={erreur} />}

      <div className="mt-3 flex flex-wrap gap-2">
        {soldeRestant > 0 && !afficherFormAcompte && (
          <Button
            variant="secondary"
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
            variant="secondary"
            onClick={() => setQuestion({ genre: "solde" })}
            loading={creationEnCours === "facture"}
          >
            Facture de solde
          </Button>
        )}
      </div>

      {afficherFormAcompte && (
        // Design v3 (24/10) : le champ commun (surface, contour fin) ; « Créer »
        // en creux, le bouton plein de l'écran reste celui de « Maintenant ».
        <div className="mt-3 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor={`montant-acompte-${devis.id}`} className={LIBELLE}>
              Montant de l&apos;acompte (€ TTC)
            </label>
            <input
              id={`montant-acompte-${devis.id}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={montantAcompte}
              onChange={(e) => {
                setMontantAcompte(e.target.value);
                // L'avertissement porte sur le montant affiché : on le retire
                // dès que celui-ci change.
                setDepassement(null);
              }}
              className={`${CHAMP} tabular-nums`}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => creerFacture("acompte")}
            loading={creationEnCours === "acompte" && !depassement}
            disabled={depassement !== null}
          >
            {creationEnCours === "acompte" && !depassement ? "Création…" : "Créer"}
          </Button>
        </div>
      )}

      {afficherFormAcompte && depassement && (
        <div role="alert" className="mt-3 rounded-[16px] bg-alerte-fond p-4">
          <p className="text-[15px] font-semibold text-alerte-orange">Attention : cet acompte dépasse le devis.</p>
          <p className="mt-1 text-[15px] text-ink">
            Avec lui, {formatEuros(depassement.total)} seront facturés sur un devis de {formatEuros(depassement.plafond)}
            {depassement.deja > 0 ? ` (dont ${formatEuros(depassement.deja)} déjà en acompte)` : ""}. La facture de solde ne sera
            plus possible sur ce devis.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => creerFacture("acompte", true)}
              disabled={creationEnCours === "acompte"}
              className={BOUTON_CREUX_SUR_TEINTE}
            >
              {creationEnCours === "acompte" && (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden />
              )}
              {creationEnCours === "acompte" ? "Création…" : "Créer quand même"}
            </button>
            <button type="button" onClick={() => setDepassement(null)} disabled={creationEnCours !== null} className={BOUTON_TEXTE}>
              Corriger le montant
            </button>
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
        titre={question?.genre === "avoir" ? "Annuler cette facture ?" : `Facture de solde : ${formatEuros(soldeRestant)} ?`}
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
              className={`${BOUTON_ALERTE} min-h-14 w-full`}
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
              className={BOUTON_PLEIN_LARGE}
            >
              Créer la facture
            </button>
          )}
          <button
            type="button"
            onClick={() => setQuestion(null)}
            className={`${BOUTON_TEXTE} w-full`}
          >
            {question?.genre === "avoir" ? "Garder la facture" : "Pas maintenant"}
          </button>
        </div>
      </Feuille>
    </div>
  );
}
