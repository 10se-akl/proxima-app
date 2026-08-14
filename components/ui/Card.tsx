export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // rounded-2xl ajouté ici (base commune à ~35 endroits dans l'app) plutôt
  // que répété au cas par cas : avant ça, l'app entière avait des coins
  // droits partout, contrairement à la landing page (rounded-2xl partout)
  // — un vrai décalage visuel entre le site vitrine et le produit, relevé
  // directement par l'artisan qui teste l'app.
  return (
    <div className={`bg-surface border border-ink/10 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
