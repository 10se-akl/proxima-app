// ============================================================
// "Premier contact sans friction" (27/08) — astuces contextuelles des
// premiers jours (voir components/onboarding/AstucePartage.tsx). Règle
// explicite : jamais de popup agressive, une astuce s'affiche un nombre
// limité de fois puis disparaît définitivement, qu'elle ait été fermée à
// la main ou simplement vue plusieurs fois — jamais reproposée à l'infini
// à un artisan qui a déjà compris ou qui a choisi de l'ignorer.
// ============================================================

const CLE_AFFICHAGES = "compyo-astuce-partage-affichages";
const CLE_MASQUEE = "compyo-astuce-partage-masquee";
const MAX_AFFICHAGES = 4;

export function peutAfficherAstucePartage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(CLE_MASQUEE) === "1") return false;
    const affichages = Number(window.localStorage.getItem(CLE_AFFICHAGES) ?? "0");
    return affichages < MAX_AFFICHAGES;
  } catch {
    return false;
  }
}

export function enregistrerAffichageAstucePartage() {
  try {
    const affichages = Number(window.localStorage.getItem(CLE_AFFICHAGES) ?? "0");
    window.localStorage.setItem(CLE_AFFICHAGES, String(affichages + 1));
  } catch {
    // Sans conséquence grave : au pire l'astuce s'affiche un peu plus
    // longtemps que prévu, jamais bloquant pour l'artisan.
  }
}

export function masquerAstucePartageDefinitivement() {
  try {
    window.localStorage.setItem(CLE_MASQUEE, "1");
  } catch {
    // Idem — pas critique si ça échoue.
  }
}
