"use client";

import { useEffect, useRef, useState } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";

// ============================================================
// Signature électronique en ligne (08/09) — voir Module 31,
// supabase/schema.sql. Écran public, sans compte, ouvert depuis le lien
// envoyé au client. Volontairement sobre : c'est un document à lire et une
// décision à prendre, pas une page marketing.
// ============================================================

type LigneDevisPublic = {
  description: string;
  categorie: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  total: number;
  detail_calcul: string;
};

type DevisPublic = {
  numero: string;
  lignes: LigneDevisPublic[];
  sous_total_ht: number;
  deplacement: number;
  marge_pct: number;
  tva_pct: number;
  montant_tva: number;
  total_estime: number;
  commentaires: string | null;
  mention_tva_reduite: string | null;
  created_at: string;
  devis_statut: string;
  signe_le: string | null;
  demande_statut: string;
  accepte_le: string | null;
  nom_client: string;
  nom_entreprise: string | null;
  logo_url: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
};

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Sous-totaux par catégorie (08/09) — voir même logique dans
// components/dashboard/DevisPreview.tsx.
const LABEL_CATEGORIE: Record<string, string> = {
  main_oeuvre: "Main d'œuvre",
  fourniture: "Fournitures",
  forfait: "Forfait",
};

function sousTotauxParCategorie(lignes: { categorie: string; total: number }[]) {
  const parCategorie = new Map<string, number>();
  for (const l of lignes) {
    parCategorie.set(l.categorie, (parCategorie.get(l.categorie) ?? 0) + l.total);
  }
  return Array.from(parCategorie.entries());
}

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

  async function repondre(reponse: "accepte" | "refuse") {
    if (reponse === "accepte" && !nomSignataire.trim()) {
      setErreurEnvoi("Indiquez votre nom pour accepter et signer ce devis.");
      return;
    }
    if (reponse === "refuse" && !window.confirm("Confirmer le refus de ce devis ?")) {
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
    } catch {
      setErreurEnvoi("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_1000px_500px_at_top,rgb(var(--c-signal-clair)/0.16),transparent_65%)] bg-paper py-10 px-4">
      <div className="max-w-2xl mx-auto">
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

        {devis && !erreurChargement && (
          <>
            <div className="rounded-2xl border border-ink/10 bg-surface overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink/10">
                <div className="flex items-start gap-3">
                  {devis.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={devis.logo_url} alt="" className="w-12 h-12 object-contain shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold">{devis.nom_entreprise || "Votre artisan"}</p>
                    {devis.adresse && <p className="text-xs text-ink/50 mt-0.5">{devis.adresse}</p>}
                    {(devis.telephone || devis.email) && (
                      <p className="text-xs text-ink/50">
                        {[devis.telephone, devis.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="font-mono text-[11px] text-ink/50 mt-0.5">DEVIS N° {devis.numero}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-ink/70">Pour : {devis.nom_client}</p>
                  <p className="font-mono text-[11px] text-ink/50 mt-0.5">
                    {new Date(devis.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-ink/5">
                {devis.lignes.map((ligne, i) => (
                  <div key={i} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-ink/80">{ligne.description}</p>
                      <span className="font-mono">{formatEuros(ligne.total)}</span>
                    </div>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">{ligne.detail_calcul}</p>
                  </div>
                ))}
              </div>

              {sousTotauxParCategorie(devis.lignes).length > 1 && (
                <div className="px-5 py-3 border-t border-ink/10 text-xs text-ink/50 space-y-1">
                  {sousTotauxParCategorie(devis.lignes).map(([categorie, total]) => (
                    <div key={categorie} className="flex items-center justify-between">
                      <span>{LABEL_CATEGORIE[categorie] ?? categorie}</span>
                      <span className="font-mono">{formatEuros(total)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-5 py-4 border-t border-ink/10 bg-paper text-sm space-y-1.5">
                <div className="flex items-center justify-between text-ink/60">
                  <span>Sous-total HT</span>
                  <span className="font-mono">{formatEuros(devis.sous_total_ht)}</span>
                </div>
                {devis.deplacement > 0 && (
                  <div className="flex items-center justify-between text-ink/60">
                    <span>Déplacement</span>
                    <span className="font-mono">{formatEuros(devis.deplacement)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-ink/60">
                  <span>TVA ({devis.tva_pct}%)</span>
                  <span className="font-mono">{formatEuros(devis.montant_tva)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold pt-2 border-t border-ink/10">
                  <span>Total TTC</span>
                  <span className="font-mono text-lg">{formatEuros(devis.total_estime)}</span>
                </div>
              </div>

              {devis.commentaires && (
                <div className="px-5 py-3 border-t border-ink/10 text-sm text-ink/70">{devis.commentaires}</div>
              )}
              {devis.mention_tva_reduite && (
                <p className="px-5 py-3 border-t border-ink/10 text-[11px] text-ink/50 leading-relaxed">
                  {devis.mention_tva_reduite}
                </p>
              )}
            </div>

            <div className="mt-6">
              {(reponseEnregistree || devis.devis_statut === "refuse" || devis.demande_statut === "accepte") ? (
                <div className="rounded-2xl border border-ink/10 bg-surface p-6 text-center">
                  {reponseEnregistree === "accepte" || devis.demande_statut === "accepte" ? (
                    <p className="text-sm text-ink/80">
                      ✓ Vous avez accepté ce devis
                      {devis.accepte_le ? ` le ${new Date(devis.accepte_le).toLocaleDateString("fr-FR")}` : ""}.
                      L&apos;artisan a été prévenu.
                    </p>
                  ) : (
                    <p className="text-sm text-ink/80">Vous avez refusé ce devis. L&apos;artisan a été prévenu.</p>
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
                      {envoiEnCours === "refuse" ? "Enregistrement…" : "Je refuse"}
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-ink/40 leading-relaxed">
                    En cliquant sur "J&apos;accepte", vous validez ce devis dans les conditions décrites
                    ci-dessus. Votre nom, l&apos;horodatage et votre signature sont enregistrés comme preuve
                    d&apos;acceptation.
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
