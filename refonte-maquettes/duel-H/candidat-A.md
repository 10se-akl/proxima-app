# Duel H, candidat A : ne rien changer, écrire ce qui existe

**Approche.** Le langage actuel est déjà bon là où il a été pensé : la génération 2 (accueil, fiche projet, listes, agenda, barre du bas). On l'écrit tel quel en onze règles lues dans le code (`candidat-A.html` : trois écrans annotés, planche des états, tableau des règles), avec des exemples bon / mauvais qui existent déjà. Les écrans en retard (devis, notes, équipe, compte) sont remis sous la règle quand on les touche, sans réécriture dédiée.

**Douleur traitée.** La recherche pose « Des chiffres et des pastilles plutôt que des phrases. » Tolteck, le plus simple du marché, a la meilleure note. L'accueil actuel le fait déjà : aucun texte sur plusieurs lignes, environ 20 éléments au premier écran, lignes tronquées. A ne traite donc pas une douleur nouvelle : il empêche la dérive (deux générations, 26 tailles de texte, 8 recettes de carte, deux couleurs de « primaire »).

**Supprimé, fusionné, ajouté.** Supprimé : rien. Fusionné : la « ligne » (recette partagée par 5 listes) devient la forme officielle ; `<Card>` (47 usages) la rejoint au passage. Ajouté : une page de règles. L'artisan ne perd rien et ne gagne rien de visible, hormis les correctifs des lots 0 et 1.

**Gestes, avant → après.** Cocher une tâche du jour : 1 → 1. « Oui » dans À confirmer : 1 → 1. Ouvrir un chantier et lancer son action principale : 2 → 2. Rattraper une coche faite par erreur : environ 3 (ouvrir le projet, retrouver la note, décocher ; estimation) → 1 avec « Fait · Annuler » (lot 1). A n'économise aucun geste.

**Impact technique.**
- A pur : `docs/langage-interface.md`, écrit après l'arbitrage. Aucun code, aucune migration de données, risque de régression nul.
- Lot 0, valable quel que soit le gagnant : sortir le filet tactile 44/48 px du bloc `prefers-reduced-motion` (`app/globals.css:234-334`). Aujourd'hui, un artisan qui réduit les animations perd les zones tactiles.
- Lot 1, conformité (petits lots indépendants) : `app/dashboard/error.tsx` ; `loading.tsx` de la fiche (`demandes/[id]`) ; bandeau hors ligne ; « Fait · Annuler » sur `ListeAujourdhui.tsx` et `AConfirmer.tsx` ; `danger` distinct du terracotta dans `Button.tsx` ; erreurs en `signal-fonce`.
- Lot 2, au fil de l'eau : on migre un écran de génération 1 quand on le touche. Jamais de big bang.
- Les lots 0 et 1 corrigent des défauts, ils ne changent pas le langage. Mais dès le lot 1, A n'est plus strictement « ne rien changer » : c'est « A plus ».

**Auto-évaluation (sur 100).**

| Critère | Note |
|---|---|
| Charge mentale (30) | 13 |
| Gestes des tâches fréquentes (20) | 10, neutre : rien ne bouge |
| Lisibilité, accessibilité (20) | 11, le lot 0 et les libellés de 10 px pèsent |
| Risque technique (15) | 14 |
| Coût de migration (10) | 9 |
| Applicabilité à l'existant (5) | 5 |
| **Total** | **62** |

**Deux faiblesses principales.**
1. **Elle ne soulage pas le critère le plus lourd.** La fiche projet (au moins six accents au premier écran, 7 à 9 textes sur plusieurs lignes) et le devis (environ 100 éléments, libellés de 10 px) restent hors règle. Avec 163 boutons bruts et 26 tailles de texte, la règle écrite sera fausse pour une grande partie du code tant que la migration au fil de l'eau n'a pas eu lieu, et le devis, écran le plus délicat, passera en dernier.
2. **Elle est muette là où le brief demande des décisions.** Retours tactiles et sonores (0 vibration, 0 son), hors ligne (aucun bandeau), soulagement (un seul bon modèle, sur la fiche), double primaire (anthracite pour trancher, terracotta pour avancer) : cette lecture est déduite du code, jamais décidée, et plusieurs écrans la contredisent (« Partager » le devis en terracotta, créer un rendez-vous en anthracite). Combler ces trous, c'est inventer des règles, donc ce n'est plus formaliser.
