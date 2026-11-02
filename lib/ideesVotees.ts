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
