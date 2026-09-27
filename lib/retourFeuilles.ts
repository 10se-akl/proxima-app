// ============================================================
// Le geste « retour » du téléphone ferme la feuille ouverte (27/09).
//
// Remonté par Axel : en dictant une note sur la fiche projet, le geste
// retour (ou le bouton retour d'Android) quittait la fiche et ramenait à
// l'accueil, au lieu de simplement fermer la feuille — comme le fait
// n'importe quelle application sur Android.
//
// Principe : tant qu'au moins une feuille est ouverte, une entrée
// d'historique à la même adresse est posée par-dessus. « Retour » la
// retire : on ferme alors la dernière feuille ouverte, et la page reste.
// Fermée autrement (✕, voile, action), l'entrée est retirée par nous.
//
// Les cas délicats, tous traités ici :
// - une feuille qui en remplace une autre dans le même geste (« Ajouter »
//   puis « Photos ») réutilise la même entrée : décision prise au tour
//   suivant, une fois les deux changements faits ;
// - une feuille fermée par une navigation (lien vers un autre écran) :
//   l'entrée n'est plus en haut, on n'y touche pas — et si l'on y revient
//   plus tard par « retour », on la saute ;
// - nos propres retours arrière ne ferment rien.
//
// Next.js (14.2) recopie son état interne dans l'entrée posée (voir
// window.history.pushState, qu'il enveloppe) : revenir dessus restaure la
// même page, sans rechargement.
// ============================================================

type Ouverte = { fermer: () => void };

let ouvertes: Ouverte[] = [];
let entreePosee = false;
let retoursANous = 0;
let installe = false;
// Un lien vers un autre écran vient d'être touché dans une feuille : la
// navigation est en cours, surtout ne pas revenir en arrière par-dessus
// (Next.js l'annulerait). L'entrée reste derrière et sera sautée.
let navigationAnnoncee = false;

/** Un lien vers un autre écran a été touché dans une feuille. */
export function annoncerNavigation() {
  navigationAnnoncee = true;
}

const MARQUE = "compyoFeuille";

function estNotreEntree(etat: unknown): boolean {
  return Boolean(etat && typeof etat === "object" && (etat as Record<string, unknown>)[MARQUE]);
}

function poser() {
  window.history.pushState({ [MARQUE]: true }, "");
  entreePosee = true;
}

function retirer() {
  entreePosee = false;
  retoursANous += 1;
  window.history.back();
}

function installer() {
  if (installe || typeof window === "undefined") return;
  installe = true;
  window.addEventListener("popstate", (e) => {
    if (retoursANous > 0) {
      retoursANous -= 1;
      return;
    }
    if (entreePosee) {
      // « Retour » : notre entrée vient d'être retirée par le téléphone.
      entreePosee = false;
      ouvertes.pop()?.fermer();
      // S'il reste une feuille ouverte dessous, elle garde sa protection.
      setTimeout(() => {
        if (ouvertes.length > 0 && !entreePosee) poser();
      }, 0);
      return;
    }
    // Revenu sur une ancienne entrée de feuille (quittée par un lien) :
    // rien à fermer, on la saute pour ne pas imposer un retour « à vide ».
    if (ouvertes.length === 0 && estNotreEntree(e.state)) retirer();
  });
}

/** À appeler à l'ouverture d'une feuille ; renvoie la fonction à appeler
 *  à sa fermeture (quelle qu'en soit la raison). */
export function protegerFeuilleDuRetour(fermer: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  installer();
  const moi: Ouverte = { fermer };
  ouvertes.push(moi);
  if (!entreePosee) {
    navigationAnnoncee = false;
    poser();
  }
  return () => {
    ouvertes = ouvertes.filter((o) => o !== moi);
    // Au tour suivant : une autre feuille a pu s'ouvrir entre-temps.
    setTimeout(() => {
      if (ouvertes.length > 0 || !entreePosee) return;
      if (navigationAnnoncee || !estNotreEntree(window.history.state)) {
        // Une navigation part (ou est déjà passée par-dessus) : on la
        // laisse faire ; l'entrée restée derrière sera sautée au retour.
        navigationAnnoncee = false;
        entreePosee = false;
        return;
      }
      retirer();
    }, 0);
  };
}
