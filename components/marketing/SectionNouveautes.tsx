import { Reveal, SectionLabel } from "./Cadre";

// ============================================================
// SEO/GEO (06/09) — le featureList JSON-LD de /fonctionnalites a été
// étendu avec la facturation électronique, le devis express, l'alerte
// météo, le rappel client et la couverture des 19 corps de métier ; un
// schema sans contenu visible correspondant est traité comme trompeur par
// les moteurs (même règle déjà suivie sur /comparatif et /confiance) — ce
// bloc est ce contenu visible. Grille de cartes sobre, même traitement que
// SectionSecurite, plutôt qu'une nouvelle démo interactive par
// fonctionnalité : ce sont des ajouts récents, pas encore le cœur du
// produit présenté plus haut sur la page.
// ============================================================

const nouveautes = [
  {
    titre: "Facturation électronique",
    description:
      "Du devis accepté à la facture : numérotation légale automatique, gestion des acomptes et avoirs, mentions légales figées à l'émission, export comptable.",
  },
  {
    titre: "Devis express",
    description:
      "Pour un dépannage déjà chiffré sur place (serrurier, vitrier, urgence) : un devis vide à remplir directement, sans passer par l'analyse IA.",
  },
  {
    titre: "19 corps de métier couverts",
    description:
      "Champs, checklists et catégories de chantier adaptés à chaque métier — un carreleur et un paysagiste n'ont pas les mêmes besoins, Compyo ne leur montre pas les mêmes options.",
  },
  {
    titre: "Alerte météo sur le planning",
    description:
      "Pour les chantiers extérieurs sensibles (terrassement, maçonnerie, façade, toiture, charpente...) : un signal si la météo prévue met le rendez-vous à risque, avec un message client pré-rempli en un clic.",
  },
  {
    titre: "Rappel client récurrent",
    description:
      "Utile pour l'entretien saisonnier (paysagiste) ou annuel (chauffagiste, climaticien) : programmez un rappel de suivi dans 3, 6 ou 12 mois en un clic.",
  },
  {
    titre: "Anti-oubli sur devis",
    description:
      "Au moment de générer le devis, Compyo signale les postes probablement oubliés (dépose manquante, protection de chantier, évacuation des déchets...) — à ajouter ou ignorer en un clic, jamais ajoutés seuls.",
  },
  {
    titre: "Journal chantier vocal",
    description:
      "Dictez un compte-rendu de fin de visite : Compyo en tire les tâches restantes, un brouillon de message client à valider, et détecte quand le chantier semble terminé.",
  },
  {
    titre: "Signature électronique du devis",
    description:
      "Un lien à envoyer au client : il consulte le devis, signe au doigt ou à la souris, accepte ou refuse — sans imprimer, sans appel téléphonique à programmer.",
  },
  {
    titre: "Vos postes fréquents",
    description:
      "Compyo retient les postes que vous chiffrez souvent — un clic pour les reprendre avec le même prix, plutôt qu'une bibliothèque générique qui ne connaît pas vos vraies habitudes.",
  },
];

export function SectionNouveautes() {
  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <SectionLabel>Nouveau</SectionLabel>
            <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight">
              Compyo évolue régulièrement
            </h2>
            <p className="mt-5 text-base text-ink/60 leading-relaxed">
              Le produit avance vite, avec les retours des artisans bêta-testeurs. Voici les
              derniers ajouts.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {nouveautes.map((n, i) => (
            <Reveal key={n.titre} delay={i * 60}>
              <div className="h-full rounded-2xl border border-ink/10 bg-paper p-6">
                <h3 className="font-display text-lg font-semibold tracking-tight">{n.titre}</h3>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">{n.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
