# Candidat B — trois destinations et la capture, sans « Plus »

**Approche.** La barre du bas ne garde que le travail : Aujourd'hui · Projets · [+] · Planning, même ordre qu'aujourd'hui, seule la case « Plus » en moins. Devis, facture, photo et note de chantier sont des objets du projet ; ce qui attend d'être envoyé, facturé ou relancé est déjà sur Aujourd'hui, et chaque ligne de Projets dit où en est l'argent. Ce qui se fait une fois ou une fois par mois (Paramètres, Mon équipe, Bilan du mois, Guide, avis, thème, déconnexion) vit derrière l'avatar, en haut.

**Douleur.** « Devis et Factures en entrées séparées doublent l'accès aux documents, qui sont déjà dans chaque projet. » (recherche §3). La barre doit répondre à « où est mon chantier ? », jamais à « quel type de papier ? ». Honnêteté : la recherche (§4.1) garde un « Plus » ; le retirer est ma décision, pas la sienne.

## Supprimé, fusionné, ajouté
- **Retiré de la navigation** (routes intactes) : « Plus » et ses 7 entrées ; Devis, Factures, Notes comme destinations ; Carte mentale (lien en pied de « Donner mon avis », à trancher).
- **Fusionné** : les listes de documents deviennent un fil, Projets, dont chaque ligne porte un état d'argent. « Voir les N → » de l'accueil l'ouvre réduit (`?etat=`) ; aujourd'hui celui de « En attente du client » mène à la liste des devis, même pour une facture (`VueAccueil.tsx:101`). Équipe : un seul endroit.
- **Ajouté** : avatar et feuille de 4 lignes ; « Juste une note ou un rappel » dans le [+] ; état d'argent sur la ligne projet ; accueil en deux colonnes dès 1024 px (CSS) ; en option « Terminé, à facturer ».
- **L'artisan perd** : l'accès à deux appuis aux listes Devis et Factures filtrées, à la page Notes et au Guide.

## Gestes (un appui = un geste)
| Tâche | Avant | Après |
|---|---|---|
| Facture impayée, depuis l'accueil | 1 | 1 |
| … depuis ailleurs | Plus → Factures → Émises → ligne : 4 | Projets → ligne : 2 |
| Relancer (message, envoi) | 3 | 3 |
| Ajouter une note | Plus → Notes → Nouvelle : 3 | [+] → Note : 2 |
| Atteindre Équipe | Plus → Paramètres → Équipe → dépli : 4 | Avatar → Mon équipe : 2 |
| Bilan, Paramètres | 2, 2 | 2, 2 |
| Retrouver un devis précis | Plus → Devis → ligne : 3 | Projets → client → Devis : 3 à 4 |
| Conjointe : à facturer, à relancer | 2 pages ; « à facturer » n'existe pas | 0 clic ; 1 pour la liste réduite |

Les cibles permanentes ne baissent pas (5 cases + cloche, puis 4 + cloche + avatar) : le gain est de sens, pas de nombre.

## Équipe, terrain, conjointe
- **Équipe** : « Mon équipe » sous l'avatar, une page (les deux composants fusionnent). « Espace partagé » : liste et invitation. « Terrain / bureau » : un rôle par membre dans la même liste. La barre ne change dans aucun cas.
- **Terrain** : même barre, même fiche ; le rôle retire des blocs (Devis, Facturation, montants), pas des destinations. Masquage en base (RLS), pas seulement ici : chantier du duel A.
- **Conjointe** : son soir tient sur l'accueil à 1440 px (maquette 7).

## Impact technique
`Sidebar.tsx` (4 cases, feuille compte via `Feuille`, parents d'onglet : Devis et Factures allument Projets), `FeuilleCapture.tsx` (+1 ligne), `VueAccueil.tsx` (liens, 2 colonnes), `demandes/page.tsx`, `ListeProjetsRecherchable.tsx`, `DemandeCard.tsx` (état d'argent : le seul vrai travail, requêtes déjà écrites pour l'accueil). Ni migration, ni dépendance, ni route supprimée. À surveiller : `--barre-bas`, effacement pendant la saisie, événements `compyo:capture` et `compyo:ouvrir-retour`, retour Android des feuilles.

## Lots (les remplaçants avant la soustraction)
1. **Remplacer** : liens corrigés, `?etat=`, état d'argent, ligne Note, accueil à 2 colonnes. Rien ne disparaît.
2. **Soustraire** : « Plus » devient l'avatar, 4 cases, barre latérale épurée, Équipe fusionnée. Retour arrière : un fichier.
3. **Ménage** : composants morts, note générale avec rappel par défaut demain 8 h.
4. **Optionnel, après test chez une conjointe** : « Terminé, à facturer ».

## Auto-évaluation (poids du duel)
Charge mentale 9/10 (27) · Gestes 7 (14) · Lisibilité 8 (12) · Risque 7 (7) · Migration 7 (7) · Habitude 5 (7,5) · **≈ 75 / 100**.

**Faiblesse 1 : la conjointe pense « factures », pas « chantiers ».** B lui retire les listes Devis et Factures en un clic, là où l'écran a la place de les garder. Si le test du soir échoue, la seule retouche honnête est un lien « Factures » côté ordinateur, et B perd sa cohérence téléphone-ordinateur. Les testeurs actuels perdent aussi trois entrées connues.

**Faiblesse 2 : tout repose sur un état d'argent par projet qui n'existe pas.** `DemandeCard` n'affiche que le statut du projet. Un « à facturer » faux (acompte déjà émis) ruinerait la confiance, d'où le lot 4 optionnel. Aussi : l'avatar est en haut à droite, hors du pouce, comme le menu que la recherche critiquait (4 lignes rares, feuille qui monte du bas) ; une note sans projet ni rappel perd sa porte ; Planning et Aujourd'hui font toujours doublon.
