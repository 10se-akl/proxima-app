"use client";

import { useEffect, useRef, useState } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { Button } from "@/components/ui/Button";
import { DocumentDevis } from "@/components/devis/DocumentDevis";
import { telechargerPdfDevis } from "@/components/devis/pdf/genererPdf";
import { construireModeleDevis, sourceDepuisDevisPublic } from "@/lib/devis/modeleDocument";
import { nomEntreprise } from "@/lib/devis/mentionsLegales";
import {
  BOUTON_ALERTE,
  BOUTON_PLEIN_LARGE,
  BOUTON_TEXTE,
  CARTE_PLEINE,
  CHAMP,
  CREUX,
  ERREUR,
  ETIQUETTE,
  FOCUS,
  FORME_ETIQUETTE,
  LIBELLE,
  TITRE_CARTE,
  euros,
} from "@/components/ui/recettes";
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
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const echelleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const echelleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * echelleX, y: (e.clientY - rect.top) * echelleY };
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
    ctx.lineWidth = 3;
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

  // Design v3 (25/10) : le pavé a un contour visible (jeton `contour` :
  // avant, blanc sur blanc, on ne voyait pas où signer) et « Effacer » est
  // un petit bouton dans son coin haut droit (cible de 48 px), plutôt qu'un
  // mot souligné perdu dessous.
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={500}
        height={160}
        onPointerDown={demarrer}
        onPointerMove={dessiner}
        onPointerUp={arreter}
        onPointerLeave={arreter}
        role="img"
        aria-label="Zone de signature (facultative)"
        className="h-40 w-full cursor-crosshair touch-none rounded-[14px] bg-white ring-1 ring-inset ring-contour"
      />
      {/* Le pavé reste blanc dans les deux thèmes : le tracé est à l'encre
          sombre (strokeStyle ci-dessus), comme sur une feuille. Le bouton
          posé dessus prend donc les jetons du papier (.document-papier :
          steel = gris foncé, même en mode sombre). */}
      <span className="document-papier absolute right-1 top-1">
        <button
          type="button"
          onClick={effacer}
          className={`inline-flex min-h-12 items-center rounded-full px-3 text-[14px] font-semibold text-steel motion-safe:transition-colors active:bg-ink/10 sm:hover:bg-ink/[0.06] ${FOCUS}`}
        >
          Effacer
        </button>
      </span>
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
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [erreurPdf, setErreurPdf] = useState(false);
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

  async function telechargerPdf() {
    if (!modele) return;
    setErreurPdf(false);
    setPdfEnCours(true);
    try {
      await telechargerPdfDevis(modele);
    } catch (e) {
      console.error("PDF du devis :", e);
      setErreurPdf(true);
    } finally {
      setPdfEnCours(false);
    }
  }

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

  // Ce que la page sait déjà de la réponse — exactement les mêmes
  // conditions qu'avant, nommées une fois pour l'en-tête et le bloc du bas.
  const reponseConnue =
    !!devis &&
    !!(
      reponseEnregistree ||
      devis.devis_statut === "refuse" ||
      ["accepte", "en_cours", "termine"].includes(devis.demande_statut ?? "")
    );
  const estAccepte =
    !!devis &&
    (reponseEnregistree === "accepte" || ["accepte", "en_cours", "termine"].includes(devis.demande_statut ?? ""));
  // Les deux conditions que le client cherche avant de signer, reprises
  // telles quelles du document (aucun calcul ici).
  const validite = modele?.conditions.find((c) => c.libelle === "Validité de l'offre") ?? null;
  const acompte = modele?.conditions.find((c) => c.libelle === "Acompte à la signature") ?? null;

  return (
    // Design v3 (24/10) : la page publique prend les jetons et la police de
    // l'application (data-da="atelier", voir app/globals.css). Fond uni :
    // plus de halo orange en dégradé.
    <div data-da="atelier" className="min-h-screen bg-paper px-4 pb-12 pt-6 sm:px-6 sm:pt-12">
      <main className="mx-auto max-w-3xl">
        {chargement && (
          <p role="status" className="py-24 text-center text-[15px] text-steel">
            Chargement du devis…
          </p>
        )}

        {erreurChargement && !chargement && (
          <div className={`${CARTE_PLEINE} mt-10 text-center`}>
            <p className="text-[15px] text-steel">{erreurChargement}</p>
          </div>
        )}

        {devis && modele && !erreurChargement && (
          <>
            {/* Design v3 (24/10) : l'essentiel d'abord, avant le détail —
                qui envoie ce devis, combien, jusqu'à quand. Tout vient du
                même modèle que le document : aucun chiffre n'est recalculé. */}
            <header className="mb-6">
              <div className="flex items-center gap-3">
                {modele.emetteur.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={modele.emetteur.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-[12px] bg-white object-contain p-1"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[15px] text-steel">Devis de</p>
                  <h1 className="break-words text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
                    {modele.emetteur.nom}
                  </h1>
                </div>
              </div>

              <div className={`${CARTE_PLEINE} mt-5 sm:p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="text-[15px] text-steel">{modele.totaux.libelleTotal}</p>
                  {reponseConnue && (
                    <span className={`${FORME_ETIQUETTE} ${ETIQUETTE[estAccepte ? "succes" : "neutre"]}`}>
                      {estAccepte ? "Accepté" : "Refusé"}
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-nowrap text-[36px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
                  {euros(modele.totaux.totalTtc, true)}
                </p>
                <p className="mt-2.5 text-[15px] text-steel">
                  Devis n°&nbsp;<span className="tabular-nums">{modele.numero}</span> du {modele.date}
                </p>
                {(validite || acompte) && (
                  <dl className="mt-4 space-y-1.5 border-t border-gris-clair pt-4 text-[15px]">
                    {[validite, acompte].map((c) =>
                      c ? (
                        <div key={c.libelle}>
                          <dt className="text-steel">{c.libelle}</dt>
                          {/* L'espace fine des milliers (U+202F, presque invisible)
                              devient une insécable lisible : même texte. */}
                          <dd className="font-medium text-ink">{c.valeur.replace(/\u202f/g, "\u00a0")}</dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                )}
                {!reponseConnue && (
                  <a href="#votre-reponse" className={`${BOUTON_TEXTE} -ml-3 mt-2`}>
                    Aller à la signature
                    {/* 25/10 — la flèche dit que c'est un lien (il descend à la signature). */}
                    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-steel" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M6 13l6 6 6-6" />
                    </svg>
                  </a>
                )}
              </div>
            </header>

            {/* Sur papier, la zone "Bon pour accord" n'apparaît que si le
                client imprime : à l'écran, il signe juste en dessous. */}
            <DocumentDevis modele={modele} zoneSignature="impression" />

            <div className="mt-4">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={telechargerPdf}
                loading={pdfEnCours}
              >
                {!pdfEnCours && <IconeTelecharger />}
                Télécharger le devis en PDF
              </Button>
              {erreurPdf && (
                <p role="alert" className={ERREUR}>
                  Le PDF n&apos;a pas pu être préparé. Vérifiez votre connexion et réessayez.
                </p>
              )}
            </div>

            <section id="votre-reponse" className="mt-8 scroll-mt-6">
              {reponseConnue ? (
                // Retravaillé le 13/09 : ce bloc est le dernier écran que
                // voit le client après avoir engagé plusieurs milliers
                // d'euros. Une phrase grise dans un cadre, sans le montant
                // ni la moindre indication de la suite, faisait douter que
                // la validation soit bien passée. On confirme désormais
                // clairement, on rappelle ce qui a été accepté, et on dit
                // ce qu'il se passe ensuite.
                <div role="status" className={`${CARTE_PLEINE} px-6 py-8 text-center`}>
                  {estAccepte ? (
                    <>
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-succes-fond text-succes">
                        <IconeCoche className="h-7 w-7" />
                      </span>
                      <p className="mt-4 text-xl font-bold text-ink">Devis accepté, merci !</p>
                      <p className="mx-auto mt-2 max-w-md text-[15px] text-steel">
                        Vous avez validé le devis n°{"\u00a0"}{devis.numero} d&apos;un montant de{" "}
                        <span className="whitespace-nowrap font-semibold text-ink">
                          {euros(devis.total_estime, true)}{"\u00a0"}TTC
                        </span>
                        {devis.accepte_le
                          ? `, le ${new Date(devis.accepte_le).toLocaleDateString("fr-FR")}`
                          : ""}
                        .
                      </p>
                      <p className="mx-auto mt-3 max-w-md text-[15px] text-steel">
                        {nomArtisan} en a été prévenu et vous recontactera
                        pour convenir de la date des travaux. Vous pouvez conserver ce devis en PDF
                        avec le bouton ci-dessus.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-ink">Devis refusé</p>
                      <p className="mx-auto mt-2 max-w-md text-[15px] text-steel">
                        {nomArtisan} en a été prévenu. Si c&apos;est une
                        erreur, ou si vous souhaitez faire modifier quelque chose, contactez-le
                        directement : il peut vous envoyer un nouveau devis.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className={`${CARTE_PLEINE} sm:p-7`}>
                  <h2 className={TITRE_CARTE}>Votre réponse</h2>

                  <div className="mt-5">
                    <label htmlFor="nom-signataire" className={LIBELLE}>
                      Votre nom (requis pour accepter)
                    </label>
                    <input
                      id="nom-signataire"
                      autoComplete="name"
                      value={nomSignataire}
                      onChange={(e) => setNomSignataire(e.target.value)}
                      placeholder="Prénom Nom"
                      aria-invalid={!!erreurEnvoi}
                      aria-describedby={erreurEnvoi ? "erreur-reponse" : undefined}
                      className={CHAMP}
                    />
                  </div>

                  <div className="mt-5">
                    <p className={LIBELLE}>Signature (optionnel — dessinez avec le doigt ou la souris)</p>
                    <PavéSignature canvasRef={canvasRef} />
                  </div>

                  {erreurEnvoi && (
                    <div className="mt-3">
                      <p id="erreur-reponse" role="alert" className={ERREUR}>
                        {erreurEnvoi}
                      </p>
                    </div>
                  )}

                  {/* La mention manuscrite ("reçu avant l'exécution des
                      travaux, bon pour accord") a ici son équivalent
                      électronique : le client la déclare en cliquant.
                      Design v3 (24/10) : même texte, lu AVANT le bouton
                      plutôt qu'après, en 13 px lisible. */}
                  <p className="mt-5 text-[13px] leading-relaxed text-steel [text-wrap:pretty]">
                    En cliquant sur « J&apos;accepte ce devis », vous déclarez l&apos;avoir reçu avant
                    l&apos;exécution des travaux et vous l&apos;acceptez dans les conditions décrites
                    ci-dessus (bon pour accord). Votre nom, l&apos;horodatage et votre signature sont
                    enregistrés comme preuve d&apos;acceptation.
                  </p>

                  {confirmerRefus ? (
                    <div className={`${CREUX} mt-4 p-4`}>
                      <p className="text-[15px] font-semibold text-ink">Vous confirmez refuser ce devis ?</p>
                      <p className="mt-1 text-[15px] text-steel">
                        {nomArtisan} en sera prévenu. Il pourra vous proposer un nouveau devis.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => repondre("refuse")}
                          disabled={envoiEnCours !== null}
                          className={BOUTON_ALERTE}
                        >
                          {envoiEnCours === "refuse" ? "Enregistrement…" : "Oui, je refuse"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmerRefus(false)}
                          disabled={envoiEnCours !== null}
                          className={BOUTON_TEXTE}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Design v3 (24/10) : un seul bouton plein, pleine
                    // largeur, sous le pouce ; refuser reste visible, en
                    // toutes lettres juste dessous.
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => repondre("accepte")}
                        disabled={envoiEnCours !== null}
                        className={BOUTON_PLEIN_LARGE}
                      >
                        {envoiEnCours === "accepte" ? (
                          "Enregistrement…"
                        ) : (
                          <>
                            <IconeCoche className="h-5 w-5" />
                            J&apos;accepte ce devis
                          </>
                        )}
                      </button>
                      <p className="mt-2.5 text-center text-[13px] text-steel">
                        Aucun paiement sur cette page : rien n&apos;est prélevé.
                      </p>
                      <div className="mt-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => repondre("refuse")}
                          disabled={envoiEnCours !== null}
                          className={BOUTON_TEXTE}
                        >
                          Je refuse
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* La marque reste discrète, en pied de page : c'est l'artisan qui
            envoie ce devis. */}
        <footer className="mt-12 flex items-center justify-center gap-2 text-[13px] text-steel">
          {/* Le symbole est décoratif : le nom est déjà écrit à côté. */}
          <span aria-hidden="true" className="inline-flex">
            <CompyoMark taille={18} />
          </span>
          <span>Devis transmis avec Compyo</span>
        </footer>
      </main>
    </div>
  );
}

function IconeCoche({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function IconeTelecharger() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
    </svg>
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
