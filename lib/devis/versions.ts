// ============================================================
// Plusieurs versions d'un même devis (12/11).
//
// « Nouvelle version » crée un second devis sur le même projet, l'original
// reste intact. Avant cette règle, trois choses pouvaient mal tourner :
// - le client signait l'ANCIEN lien (encore dans ses SMS) alors qu'une
//   version plus récente lui avait été envoyée ;
// - la fiche facturait toujours la DERNIÈRE version, même si le client
//   avait signé la précédente (ou même un brouillon jamais envoyé) ;
// - un acompte facturé sur la version 1 n'était pas déduit du solde de la
//   version 2 : le client payait deux fois l'acompte.
//
// Fonctions pures, sans base : les mêmes règles servent à la fiche (écran)
// et aux routes serveur. Tests : lib/devis/versions.test.mjs.
// ============================================================

export type VersionDevis = {
  id: string;
  statut: string;
  created_at: string;
  envoye_le: string | null;
  signe_le: string | null;
};

const temps = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/**
 * Le devis que l'on facture sur un projet accepté : celui que le client a
 * signé en ligne s'il y en a un (le plus récent), sinon la dernière version
 * envoyée (acceptation notée à la main par l'artisan). Jamais un brouillon
 * ni un devis refusé : ils n'ont pas été acceptés.
 */
export function choisirDevisAFacturer<T extends VersionDevis>(versions: T[]): T | null {
  const signes = versions.filter((v) => v.signe_le);
  if (signes.length > 0) {
    return signes.reduce((a, b) => (temps(b.signe_le) > temps(a.signe_le) ? b : a));
  }
  const envoyes = versions.filter((v) => v.statut === "envoye");
  if (envoyes.length === 0) return null;
  return envoyes.reduce((a, b) =>
    temps(b.envoye_le ?? b.created_at) > temps(a.envoye_le ?? a.created_at) ? b : a
  );
}

/**
 * Vrai si ce devis, pas encore signé, a été remplacé : une autre version du
 * même projet a été envoyée au client APRÈS lui. Le client ne doit plus
 * pouvoir le signer depuis l'ancien lien.
 */
export function estRemplace<T extends VersionDevis>(devis: T, autresVersions: T[]): boolean {
  if (devis.signe_le) return false;
  const envoiCeDevis = temps(devis.envoye_le ?? devis.created_at);
  return autresVersions.some(
    (v) => v.id !== devis.id && v.statut === "envoye" && temps(v.envoye_le ?? v.created_at) > envoiCeDevis
  );
}

/**
 * Une autre version du même projet a déjà été signée par le client : celle-ci
 * ne l'a pas été. Sert à ne pas écrire « Vous avez validé le devis n° X »
 * sur la page d'une version que le client n'a jamais signée.
 */
export function autreVersionSignee<T extends VersionDevis>(devis: T, autresVersions: T[]): T | null {
  if (devis.signe_le) return null;
  return autresVersions.find((v) => v.id !== devis.id && v.signe_le) ?? null;
}
