// ============================================================
// Où en est un devis, en un mot — partagé par la liste des devis, l'espace
// devis et la fiche projet.
//
// Le statut du devis (en base) ne distingue pas "envoyé, en attente" de
// "envoyé, accepté" — c'est le projet qui porte l'acceptation. On combine
// les deux pour donner une vraie photo de la situation, sans obliger
// l'artisan à comprendre la mécanique interne.
// ============================================================

export type DevisPourStatut = {
  statut: "brouillon" | "a_valider" | "envoye" | "refuse";
  notifie_relance_j5_le?: string | null;
  notifie_relance_j10_le?: string | null;
};

const PROJET_ENGAGE = ["accepte", "en_cours", "termine"];

export function devisAccepte(d: DevisPourStatut, statutProjet: string | null | undefined): boolean {
  return d.statut === "envoye" && PROJET_ENGAGE.includes(statutProjet ?? "");
}

export function statutAffiche(
  d: DevisPourStatut,
  statutProjet: string | null | undefined
): { texte: string; classe: string } {
  if (d.statut === "brouillon") return { texte: "Brouillon", classe: "bg-ink/10 text-ink/60" };
  if (d.statut === "a_valider") return { texte: "Prêt à envoyer", classe: "bg-alerte-orange/15 text-alerte-orange" };
  if (d.statut === "refuse") return { texte: "Refusé", classe: "bg-signal/10 text-signal" };
  if (devisAccepte(d, statutProjet)) return { texte: "Accepté", classe: "bg-succes/15 text-succes" };
  // Relance (11/09) — le devis est toujours en attente, mais l'artisan a
  // déjà reçu une proposition de relance (voir app/api/cron/relance-devis).
  // "Relancé" signifie ici "relance proposée à l'artisan" — Compyo n'envoie
  // jamais rien de lui-même au client.
  if (d.notifie_relance_j10_le) return { texte: "Relancé J+10", classe: "bg-steel/15 text-steel" };
  if (d.notifie_relance_j5_le) return { texte: "Relancé J+5", classe: "bg-steel/15 text-steel" };
  return { texte: "Envoyé — en attente", classe: "bg-steel/15 text-steel" };
}
