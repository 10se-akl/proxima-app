// Petit cercle coloré avec les initiales du client — pattern très courant
// dans les SaaS modernes (Linear, Notion, Stripe...), utilisé partout où
// un nom de client apparaît (listes de projets, devis, planning). Aucune
// dépendance externe (pas de bibliothèque d'avatars/photos), juste du CSS.
// Couleur dérivée du nom (hash simple) plutôt que toujours la même teinte,
// pour distinguer visuellement les clients d'un coup d'œil dans une liste.
const TEINTES = [
  "bg-signal/15 text-signal-fonce",
  "bg-[#2F8F5B]/15 text-[#2F8F5B]",
  "bg-[#3B6FA0]/15 text-[#3B6FA0]",
  "bg-[#8B5CF6]/15 text-[#8B5CF6]",
  "bg-[#D9861A]/15 text-[#D9861A]",
];

function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

function teinteDe(nom: string): string {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = (hash + nom.charCodeAt(i)) % TEINTES.length;
  return TEINTES[hash];
}

export function Avatar({
  nom,
  taille = 36,
  className = "",
}: {
  nom: string;
  taille?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display font-semibold shrink-0 ${teinteDe(nom)} ${className}`}
      style={{ width: taille, height: taille, fontSize: taille * 0.4 }}
      aria-hidden
    >
      {initiales(nom)}
    </span>
  );
}
