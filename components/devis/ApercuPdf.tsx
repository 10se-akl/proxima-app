"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as PdfJs from "pdfjs-dist";
import { DocumentDevis } from "@/components/devis/DocumentDevis";
import { genererPdfDevis } from "@/components/devis/pdf/genererPdf";
import type { ModeleDevis } from "@/lib/devis/modeleDocument";

// ============================================================
// Aperçu du devis (17/09) — pas une imitation : on fabrique le vrai PDF,
// celui que le client recevra, et on en affiche les pages. Ce qui est vu
// ici est, au pixel près, ce qui part.
//
// pdf.js est chargé tel quel depuis /pdfjs/ (copié par
// scripts/copier-ressources-pdf.mjs), hors de webpack.
// ============================================================

type ModulePdfJs = typeof PdfJs;

let chargementPdfJs: Promise<ModulePdfJs> | null = null;

function chargerPdfJs(): Promise<ModulePdfJs> {
  if (!chargementPdfJs) {
    const adresse = "/pdfjs/pdf.min.mjs";
    chargementPdfJs = (import(/* webpackIgnore: true */ adresse) as Promise<ModulePdfJs>)
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        return pdfjs;
      })
      .catch((e) => {
        chargementPdfJs = null;
        throw e;
      });
  }
  return chargementPdfJs;
}

async function pagesEnImages(blob: Blob, largeurCss: number): Promise<string[]> {
  const pdfjs = await chargerPdfJs();
  const donnees = new Uint8Array(await blob.arrayBuffer());
  // isEvalSupported: false — aucun code du PDF n'est jamais exécuté (voir
  // CVE-2024-4367), même si ce PDF-ci est fabriqué par nous.
  const pdf = await pdfjs.getDocument({ data: donnees, isEvalSupported: false }).promise;
  const urls: string[] = [];
  try {
    // Au moins 1,5 : même sur un écran standard, les petites mentions du
    // bas de page restent nettes une fois l'image réduite.
    const densite = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min((largeurCss / base.width) * densite, 3) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const contexte = canvas.getContext("2d");
      if (!contexte) throw new Error("Canvas indisponible");
      await page.render({ canvasContext: contexte, viewport }).promise;
      const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (image) urls.push(URL.createObjectURL(image));
      page.cleanup();
    }
    return urls;
  } catch (e) {
    urls.forEach((u) => URL.revokeObjectURL(u));
    throw e;
  } finally {
    await pdf.destroy();
  }
}

type Etat = "chargement" | "pret" | "mise_a_jour" | "erreur";

export function ApercuPdf({ modele, delai = 450 }: { modele: ModeleDevis; delai?: number }) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [etat, setEtat] = useState<Etat>("chargement");
  const pagesRef = useRef<string[]>([]);
  const tourRef = useRef(0);

  // Le modèle est reconstruit à chaque frappe : on ne relance le PDF que
  // si son CONTENU a changé.
  const cle = useMemo(() => JSON.stringify(modele), [modele]);

  // Largeur arrondie par paliers : redimensionner la fenêtre ne doit pas
  // relancer un rendu à chaque pixel. Largeur nulle = aperçu masqué (onglet
  // "Modifier" sur téléphone) : aucun PDF n'est fabriqué pour rien pendant
  // la saisie ; il le sera en ouvrant l'onglet.
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return;
    const mesurer = () =>
      setLargeur(el.clientWidth === 0 ? 0 : Math.max(240, Math.round(el.clientWidth / 80) * 80));
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    if (!largeur) return;
    const tour = ++tourRef.current;
    setEtat((e) => (e === "chargement" ? e : "mise_a_jour"));

    const minuterie = setTimeout(async () => {
      try {
        const blob = await genererPdfDevis(JSON.parse(cle) as ModeleDevis);
        if (tour !== tourRef.current) return;
        const urls = await pagesEnImages(blob, largeur);
        if (tour !== tourRef.current) {
          urls.forEach((u) => URL.revokeObjectURL(u));
          return;
        }
        pagesRef.current.forEach((u) => URL.revokeObjectURL(u));
        pagesRef.current = urls;
        setPages(urls);
        setEtat("pret");
      } catch (e) {
        console.error("Aperçu PDF du devis :", e);
        if (tour === tourRef.current) setEtat("erreur");
      }
    }, delai);

    return () => clearTimeout(minuterie);
  }, [cle, largeur, delai]);

  useEffect(
    () => () => {
      pagesRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    []
  );

  return (
    <div ref={conteneurRef} className="relative">
      {etat === "erreur" && pages.length === 0 ? (
        // Le PDF n'a pas pu être fabriqué (réseau coupé au premier
        // chargement, navigateur trop ancien) : on montre le même devis en
        // version web plutôt qu'un écran vide.
        <div>
          <p className="mb-3 rounded-xl border border-alerte-orange/30 bg-alerte-orange/5 px-3 py-2 text-xs text-ink/70">
            L&apos;aperçu PDF n&apos;a pas pu s&apos;afficher. Voici le même devis en version web.
          </p>
          <DocumentDevis modele={modele} id="devis-apercu-secours" />
        </div>
      ) : pages.length === 0 ? (
        <div className="aspect-[210/297] w-full animate-pulse rounded-md bg-surface ring-1 ring-ink/10">
          <p className="pt-[40%] text-center text-xs text-ink/40">Préparation du PDF…</p>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity duration-200 ${etat === "mise_a_jour" ? "opacity-75" : ""}`}>
          {pages.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Page ${i + 1} sur ${pages.length} du devis`}
              className="block w-full rounded-[3px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_10px_30px_-12px_rgb(0_0_0/0.25)] ring-1 ring-black/5"
            />
          ))}
        </div>
      )}

      {etat === "mise_a_jour" && pages.length > 0 && (
        <span className="absolute right-3 top-3 rounded-full bg-anthracite/85 px-2.5 py-1 text-[11px] text-white">
          Mise à jour…
        </span>
      )}
      {etat === "erreur" && pages.length > 0 && (
        <p className="mt-2 text-xs text-signal">
          La dernière modification n&apos;a pas pu être affichée. Elle sera reprise à la prochaine.
        </p>
      )}
    </div>
  );
}
