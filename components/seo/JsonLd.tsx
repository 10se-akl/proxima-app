// Des données structurées (Schema.org) dans la page. Le « < » est
// échappé : un texte de contenu ne peut pas fermer la balise <script>.
export function JsonLd({ donnees }: { donnees: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, "\\u003c") }}
    />
  );
}
