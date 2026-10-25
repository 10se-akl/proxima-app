// Les initiales du client (ou de l'artisan), en CSS seul.
//
// 22/10 (panel de 18 faux clients) — les cinq teintes pastel tirées du nom
// faisaient « appli de rencontre » et n'aidaient pas à reconnaître un
// client. Une seule teinte neutre, aux couleurs de l'application ; `carre`
// donne la forme des miniatures de « Mes projets » (même liste, même
// forme), le rond reste pour une personne (le compte, l'équipe).
//
// 25/10 — une seule règle d'initiales dans toute l'appli (avant : « BE » sur
// Projets, « MB » dans Devis pour « M. Bernard ») : la civilité ne compte
// pas ; un seul mot donne ses deux premières lettres.
const CIVILITES = new Set(["m", "m.", "mr", "mr.", "mme", "mme.", "mlle", "monsieur", "madame", "mademoiselle", "et", "&"]);

export function initiales(nom: string): string {
  const mots = nom
    .trim()
    .split(/\s+/)
    .filter((m) => m && !CIVILITES.has(m.toLowerCase()));
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

export function Avatar({
  nom,
  taille = 36,
  className = "",
  carre = false,
}: {
  nom: string;
  taille?: number;
  className?: string;
  /** Une ligne de dossier (devis, facture) : coins arrondis, pas un rond. */
  carre?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-paper-warm font-display font-semibold text-steel ${carre ? "rounded-xl" : "rounded-full"} ${className}`}
      style={{ width: taille, height: taille, fontSize: Math.max(13, Math.round(taille * 0.4)) }}
      aria-hidden
    >
      {initiales(nom)}
    </span>
  );
}
