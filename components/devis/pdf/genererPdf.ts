import { createElement } from "react";
import type { ModeleDevis } from "@/lib/devis/modeleDocument";

// ============================================================
// Fabrication du PDF d'un devis, dans le navigateur (17/09).
//
// Le moteur (@react-pdf/renderer) et le gabarit ne sont téléchargés qu'au
// premier devis affiché : le reste de l'application n'en paie jamais le
// poids.
// ============================================================

let policesEnregistrees = false;

async function moteur() {
  const [renderer, gabarit] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/devis/pdf/DocumentDevisPdf"),
  ]);

  if (!policesEnregistrees) {
    const base = window.location.origin;
    renderer.Font.register({
      family: "Inter",
      fonts: [
        { src: `${base}/fonts/pdf/inter-400.woff`, fontWeight: 400 },
        { src: `${base}/fonts/pdf/inter-500.woff`, fontWeight: 500 },
        { src: `${base}/fonts/pdf/inter-600.woff`, fontWeight: 600 },
        { src: `${base}/fonts/pdf/inter-700.woff`, fontWeight: 700 },
      ],
    });
    renderer.Font.register({
      family: "Manrope",
      fonts: [
        { src: `${base}/fonts/pdf/manrope-700.woff`, fontWeight: 700 },
        { src: `${base}/fonts/pdf/manrope-800.woff`, fontWeight: 800 },
      ],
    });
    // Sans cela, le moteur coupe les mots selon les règles de l'anglais
    // ("carre-lage") : un mot entier passe simplement à la ligne.
    renderer.Font.registerHyphenationCallback((mot) => [mot]);
    policesEnregistrees = true;
  }

  return { pdf: renderer.pdf, DocumentDevisPdf: gabarit.DocumentDevisPdf };
}

// Le moteur PDF ne lit que le PNG et le JPEG ; un logo peut être en WebP ou
// en SVG. On le redessine donc en PNG, à une taille raisonnable (un logo de
// 4 000 px alourdirait chaque devis pour rien). null si l'image ne se
// charge pas : un devis sans logo vaut mieux qu'un devis qui ne sort pas.
const imagesConverties = new Map<string, Promise<string | null>>();

function imagePourPdf(url: string): Promise<string | null> {
  const enCache = imagesConverties.get(url);
  if (enCache) return enCache;

  const promesse = new Promise<string | null>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cote = 360;
        const echelle = Math.min(1, cote / Math.max(img.naturalWidth || cote, img.naturalHeight || cote));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || cote) * echelle));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || cote) * echelle));
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imagesConverties.set(url, promesse);
  return promesse;
}

// Le format français sépare les milliers par une espace fine insécable
// (U+202F), absente des polices du PDF : "1 234,56 €" y devenait
// "1234,56 €". L'espace insécable ordinaire garde le même rôle.
function sansEspacesFines(modele: ModeleDevis): ModeleDevis {
  return JSON.parse(JSON.stringify(modele).replace(/\u202f/g, "\u00a0")) as ModeleDevis;
}

export async function genererPdfDevis(modeleOriginal: ModeleDevis): Promise<Blob> {
  const modele = sansEspacesFines(modeleOriginal);
  const { pdf, DocumentDevisPdf } = await moteur();
  const logo = modele.emetteur.logoUrl ? await imagePourPdf(modele.emetteur.logoUrl) : null;
  // createElement plutôt que du JSX : ce fichier reste un module .ts simple.
  const document = createElement(DocumentDevisPdf, { modele, logo });
  return pdf(document as Parameters<typeof pdf>[0]).toBlob();
}

export function nomFichierDevis(modele: ModeleDevis): string {
  const propre = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  return `Devis-${propre(modele.numero)}-${propre(modele.client.nom) || "client"}.pdf`;
}

// Téléchargement, et partage direct depuis un téléphone (WhatsApp, mail…)
// quand le navigateur sait le faire.
export async function telechargerPdfDevis(modele: ModeleDevis): Promise<void> {
  const blob = await genererPdfDevis(modele);
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichierDevis(modele);
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function partageDeFichierPossible(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([""], "test.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}

// false si le client a fermé la feuille de partage : ce n'est pas une erreur.
export async function partagerPdfDevis(modele: ModeleDevis): Promise<boolean> {
  const blob = await genererPdfDevis(modele);
  const fichier = new File([blob], nomFichierDevis(modele), { type: "application/pdf" });
  try {
    await navigator.share({ files: [fichier], title: `Devis ${modele.numero}` });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    throw e;
  }
}
