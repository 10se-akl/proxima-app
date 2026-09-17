"use client";

import { useEffect, useRef, useState } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { Button } from "@/components/ui/Button";
import { DocumentDevis } from "@/components/devis/DocumentDevis";
import {
  construireModeleDevis,
  formatMontant,
  sourceDepuisDevisPublic,
} from "@/lib/devis/modeleDocument";
import { nomEntreprise } from "@/lib/devis/mentionsLegales";
import type { DevisPublic } from "@/types";

// ============================================================
// Signature électronique en ligne (08/09) — voir Module 31,
// supabase/schema.sql. Écran public, sans compte, ouvert depuis le lien
// envoyé au client. Volontairement sobre : c'est un document à lire et une
// décision à prendre, pas une page marketing.
//
// 17/09 — le devis lui-même est rendu par components/devis/DocumentDevis,
// le même composant que l'aperçu de l'artisan : ce que le client lit ici
// est exactement ce que l'artisan a validé.
// ============================================================

// Pavé de signature — dessin au doigt/à la souris sur un <canvas>, sans
// bibliothèque externe (juste des événements pointer, unifiés souris/tactile
// par le navigateur). "Effacer" remet à zéro ; l'image n'est produite
// (toDataURL) qu'au moment de la validation, pas à chaque trait.
function PavéSignature({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const dessineRef = useRef(false);

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function demarrer(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    dessineRef.current = true;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.setPointerCapture(e.pointerId);
  }

  function dessiner(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessineRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = position(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1F2937";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function arreter() {
    dessineRef.current = false;
  }

  function effacer() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={160}
        onPointerDown={demarrer}
        onPointerMove={dessiner}
        onPointerUp={arreter}
        onPointerLeave={arreter}
        className="w-full h-40 rounded-xl border border-ink/15 bg-white touch-none cursor-crosshair"
      />
      <button
        type="button"
        onClick={effacer}
        className="mt-1.5 text-xs text-ink/50 hover:text-ink underline transition-colors"
      >
        Effacer
      </button>
    </div>
  );
}

export function DevisPublicClient({ devisId }: { devisId: string }) {
  const [devis, setDevis] = useState<DevisPublic | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [nomSignataire, setNomSignataire] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState<"accepte" | "refuse" | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const [reponseEnregistree, setReponseEnregistree] = useState<"accepte" | "refuse" | null>(null);
  // Refus en deux temps, dans la page : la fenêtre grise du navigateur
  // (window.confirm) faisait "bug" sur un document censé inspirer confiance.
  const [confirmerRefus, setConfirmerRefus] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch(`/api/devis-public/${devisId}`);
        const data = await res.json();
        if (annule) return;
        if (!res.ok) {
          setErreurChargement(data?.error ?? "Devis introuvable.");
          return;
        }
        setDevis(data.devis);
      } catch {
        if (!annule) setErreurChargement("Impossible de contacter le serveur. Vérifiez votre connexion.");
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, [devisId]);

  const nomArtisan = devis ? nomEntreprise(devis.mentions_legales, "L'artisan") : "L'artisan";
  const modele = devis
    ? construireModeleDevis({
        source: sourceDepuisDevisPublic(devis),
        mentions: devis.mentions_legales,
        client: {
          nom: devis.nom_client,
          adresse: devis.adresse_client,
          telephone: devis.telephone_client,
        },
        logoUrl: devis.logo_url,
        nomDeRepli: "Votre artisan",
        signature: devis.signe_le ? { nom: null, le: devis.signe_le, image: null } : null,
      })
    : null;

  async function repondre(reponse: "accepte" | "refuse") {
    if (reponse === "accepte" && !nomSignataire.trim()) {
      setErreurEnvoi("Indiquez votre nom pour accepter et signer ce devis.");
      return;
    }
    if (reponse === "refuse" && !confirmerRefus) {
      setConfirmerRefus(true);
      return;
    }

    setEnvoiEnCours(reponse);
    setErreurEnvoi(null);

    // Le tracé n'est envoyé que s'il y a réellement quelque chose de dessiné
    // — un canvas vide exporté en PNG n'a aucune valeur de preuve, autant
    // ne pas l'envoyer et se reposer sur le nom saisi + l'horodatage/IP.
    const canvas = canvasRef.current;
    const aUnTrace = canvas && !estCanvasVide(canvas);
    const signatureData = reponse === "accepte" && aUnTrace ? canvas!.toDataURL("image/png") : null;

    try {
      const res = await fetch(`/api/devis-public/${devisId}/repondre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reponse,
          nomSignataire: reponse === "accepte" ? nomSignataire.trim() : undefined,
          signatureData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreurEnvoi(data?.error ?? "Impossible d'enregistrer votre réponse. Réessayez.");
        return;
      }
      setReponseEnregistree(reponse);
      // Le document affiché (et imprimé) porte aussitôt la mention de
      // signature, sans attendre un rechargement.
      if (reponse === "accepte") {
        setDevis((d) => (d ? { ...d, signe_le: new Date().toISOString() } : d));
      }
    } catch {
      setErreurEnvoi("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_1000px_500px_at_top,rgb(var(--c-signal-clair)/0.16),transparent_65%)] bg-paper py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <CompyoMark taille={22} />
          <p className="font-display font-semibold text-sm text-ink/60">Compyo</p>
        </div>

        {chargement && <p className="text-center text-sm text-ink/50">Chargement du devis…</p>}

        {erreurChargement && !chargement && (
          <div className="rounded-2xl border border-ink/10 bg-surface p-6 text-center">
            <p className="text-sm text-ink/70">{erreurChargement}</p>
          </div>
        )}

        {devis && modele && !erreurChargement && (
          <>
            {/* Sur papier, la zone "Bon pour accord" n'apparaît que si le
                client imprime : à l'écran, il signe juste en dessous. */}
            <DocumentDevis modele={modele} zoneSignature="impression" />

            <Button variant="ghost" className="mt-4" onClick={() => window.print()}>
              Imprimer / Enregistrer en PDF
            </Button>

            <div className="mt-6">
              {(reponseEnregistree || devis.devis_statut === "refuse" || devis.demande_statut === "accepte") ? (
                // Retravaillé le 13/09 : ce bloc est le dernier écran que
                // voit le client après avoir engagé plusieurs milliers
                // d'euros. Une phrase grise dans un cadre, sans le montant
                // ni la moindre indication de la suite, faisait douter que
                // la validation soit bien passée. On confirme désormais
                // clairement, on rappelle ce qui a été accepté, et on dit
                // ce qu'il se passe ensuite.
                <div className="rounded-2xl border border-ink/10 bg-surface p-6 text-center">
                  {reponseEnregistree === "accepte" || devis.demande_statut === "accepte" ? (
                    <>
                      <span className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-[#2F8F5B]/12 text-[#2F8F5B] text-xl">
                        ✓
                      </span>
                      <p className="mt-3 font-display text-lg font-semibold text-ink">
                        Devis accepté, merci !
                      </p>
                      <p className="mt-1.5 text-sm text-ink/60">
                        Vous avez validé le devis n° {devis.numero} d&apos;un montant de{" "}
                        <span className="font-medium text-ink/80">{formatMontant(devis.total_estime)} TTC</span>
                        {devis.accepte_le
                          ? `, le ${new Date(devis.accepte_le).toLocaleDateString("fr-FR")}`
                          : ""}
                        .
                      </p>
                      <p className="mt-3 text-sm text-ink/60">
                        {nomArtisan} en a été prévenu et vous recontactera
                        pour convenir de la date des travaux. Vous pouvez conserver ce devis en PDF
                        avec le bouton ci-dessus.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-lg font-semibold text-ink">Devis refusé</p>
                      <p className="mt-1.5 text-sm text-ink/60">
                        {nomArtisan} en a été prévenu. Si c&apos;est une
                        erreur, ou si vous souhaitez faire modifier quelque chose, contactez-le
                        directement : il peut vous envoyer un nouveau devis.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-ink/10 bg-surface p-6">
                  <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-3">
                    Votre réponse
                  </p>

                  <label className="block text-xs font-medium text-ink/70 mb-1.5">
                    Votre nom (requis pour accepter)
                  </label>
                  <input
                    value={nomSignataire}
                    onChange={(e) => setNomSignataire(e.target.value)}
                    placeholder="Prénom Nom"
                    className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                  />

                  <p className="mt-4 text-xs font-medium text-ink/70 mb-1.5">
                    Signature (optionnel — dessinez avec le doigt ou la souris)
                  </p>
                  <PavéSignature canvasRef={canvasRef} />

                  {erreurEnvoi && <p className="mt-3 text-sm text-signal">{erreurEnvoi}</p>}

                  {confirmerRefus ? (
                    <div className="mt-5 rounded-xl border border-ink/10 bg-paper px-4 py-3">
                      <p className="text-sm text-ink/80">Vous confirmez refuser ce devis ?</p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {nomArtisan} en sera prévenu. Il pourra vous proposer un nouveau devis.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => repondre("refuse")}
                          disabled={envoiEnCours !== null}
                          className="inline-flex items-center justify-center rounded-xl bg-ink text-paper font-medium px-4 py-2.5 text-sm transition-all hover:bg-ink/85 disabled:opacity-60"
                        >
                          {envoiEnCours === "refuse" ? "Enregistrement…" : "Oui, je refuse"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmerRefus(false)}
                          disabled={envoiEnCours !== null}
                          className="text-sm text-ink/60 hover:text-ink underline transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => repondre("accepte")}
                        disabled={envoiEnCours !== null}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal text-white font-medium px-5 py-3 text-sm transition-all hover:bg-signal-fonce disabled:opacity-60"
                      >
                        {envoiEnCours === "accepte" ? "Enregistrement…" : "✓ J'accepte ce devis"}
                      </button>
                      <button
                        type="button"
                        onClick={() => repondre("refuse")}
                        disabled={envoiEnCours !== null}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 text-ink/70 font-medium px-5 py-3 text-sm transition-all hover:border-signal/40 hover:text-signal disabled:opacity-60"
                      >
                        Je refuse
                      </button>
                    </div>
                  )}
                  {/* La mention manuscrite ("reçu avant l'exécution des
                      travaux, bon pour accord") a ici son équivalent
                      électronique : le client la déclare en cliquant. */}
                  <p className="mt-3 text-[11px] text-ink/40 leading-relaxed">
                    En cliquant sur « J&apos;accepte ce devis », vous déclarez l&apos;avoir reçu avant
                    l&apos;exécution des travaux et vous l&apos;acceptez dans les conditions décrites
                    ci-dessus (bon pour accord). Votre nom, l&apos;horodatage et votre signature sont
                    enregistrés comme preuve d&apos;acceptation.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function estCanvasVide(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const donnees = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // Un pixel avec un canal alpha > 0 quelque part = quelque chose a été
  // dessiné. Boucle sur le canal alpha uniquement (indice 3, 7, 11...).
  for (let i = 3; i < donnees.length; i += 4) {
    if (donnees[i] !== 0) return false;
  }
  return true;
}
