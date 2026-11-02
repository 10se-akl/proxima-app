// ============================================================
// Les idées soumises au vote sur l'accueil (« Pas encore dans Compyo »,
// 01/11/2026). Une seule liste, lue par la page (components/marketing/
// carnet/AccueilCarnet.tsx) et par la route des résultats (app/api/
// votes-idees) : la route ne renvoie que ces idées-là, jamais un chemin
// /vote/… inventé par quelqu'un.
// ============================================================

export type Idee = { id: string; titre: string; detail: string };

export const IDEES_VOTEES: Idee[] = [
  {
    id: "assistant-telephone",
    titre: "Un assistant qui répond au téléphone pendant vos chantiers.",
    detail:
      " Avec vos mots : il dit au client quand vous rappelez et lui demande l’adresse ou une photo. Les urgences vous sonnent toujours, et vous pouvez le couper.",
  },
  {
    id: "anciens-devis",
    titre: "Vos anciens devis repris.",
    detail: " Une photo, un PDF ou un fichier Word : vos prix et vos postes habituels sont là dès le premier jour.",
  },
  {
    id: "avis-google",
    titre: "L’avis Google, demandé au bon moment.",
    detail: " En fin de chantier, seulement si vous le voulez, au client que vous choisissez.",
  },
];

export type ResultatVote = { oui: number; non: number };

/** Le décompte, partagé par /api/votes-idees et /admin/statistiques.
 *  Chaque vote est une visite /vote/<idée>/<oui|non> ; un vote retiré (on
 *  touche à nouveau la même réponse) ou un changement d'avis envoie
 *  /vote/<idée>/annule-<oui|non>, qui le retire du total. Jamais sous 0. */
export function compterLesVotes(chemins: string[], seulement?: string[]): Record<string, ResultatVote> {
  const r: Record<string, ResultatVote> = {};
  for (const id of seulement ?? []) r[id] = { oui: 0, non: 0 };
  for (const chemin of chemins) {
    const [, , idee, action] = chemin.split("/");
    if (!idee || (seulement && !seulement.includes(idee))) continue;
    const annule = action?.startsWith("annule-");
    const choix = annule ? action.slice(7) : action;
    if (choix !== "oui" && choix !== "non") continue;
    const e = (r[idee] ??= { oui: 0, non: 0 });
    e[choix] += annule ? -1 : 1;
  }
  for (const e of Object.values(r)) {
    e.oui = Math.max(0, e.oui);
    e.non = Math.max(0, e.non);
  }
  return r;
}
