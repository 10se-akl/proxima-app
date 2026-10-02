# Duel H — Candidat B : deux tailles, un plein, une carte

## L'approche
Huit règles qu'on peut réciter : **2 tailles de texte** (17 et 28 px), **2 couleurs de texte** (`ink`, `steel`), **1 carte** (surface, filet `gris-clair`, rayon 16, sans ombre), **1 plein par écran** (fond `ink` = la chose à faire), contour 2 px pour le reste. Le terracotta ne sert plus qu'au « + » et au mot d'alerte. Un état = une recette (squelette = la vraie forme vidée, vide = une phrase, erreur = un mot + « Réessayer », hors-ligne = un bandeau) et le soulagement, c'est **l'écran qui se vide** : « Tout est réglé. », une coche, rien d'autre.

## La douleur
« Des chiffres et des pastilles plutôt que des phrases. "3 devis en attente" se lit en une seconde. » (principe 8). B touche la douleur n°1, « la journée qui ne se ferme jamais », seulement en fin de journée : c'est un langage, pas un parcours.

## Supprimé, fusionné, ajouté
- **26 tailles → 2** (seule exception : 13 px dans la barre du bas) ; 13 opacités de texte → 0 ; plus de mono, de capitales, de 11 px.
- **8 recettes de carte → 1** ; 9 rayons → 2 ; ombres → 0 ; 11 opacités de bordure → 1 token.
- **4 boutons → 2** (plein, contour) + l'icône nue. `danger` disparaît : on confirme par une feuille, pas par la couleur.
- 28 hex, avatars hors palette, priorité à 3 couleurs → « Urgent » seul marqué. **Zéro nouveau token.**
- Ajouté : `error.tsx`, `loading.tsx` de la fiche, bandeau hors-ligne, « Fait · Annuler », une vibration de 10 ms, aucun son.
- **L'artisan perd :** la barre haute et son logo, « Bonjour Gérard », l'avatar, la jauge à 5 segments, la nuance « important / normal ». Du caractère.

## Gestes
| Tâche | Avant | Après |
|---|---|---|
| Cocher une tâche d'accueil | 1 ; faux appui : ≈ 3-4 pour la retrouver (non mesuré) | 1 ; faux appui : 1 (« Annuler ») |
| « Oui » à À confirmer | 1 (cible 48) | 1 (cible 56) |
| Ajouter une note depuis la fiche | 1, sans défiler | 1, sans défiler |
| Savoir qu'on est hors-ligne | aucun indicateur : essai, échec, essai (≥ 2) | 0 |
| Aller à « À faire de votre côté » | 1 défilement | 1 défilement |

Gain net sur les gestes nominaux : quasi nul. Il est sur le rattrapage et la lisibilité.

## Impact technique
- Touchés : `tailwind.config.ts` (`fontSize.texte|titre`), `components/ui/{Button,Card,Skeleton,EtatErreur,Avatar}.tsx`, `Sidebar.tsx:197` (barre haute mobile), `app/layout.tsx:92` (`themeColor` sombre, aujourd'hui `#1F2937`), hex de priorité (`lib/notes/index.ts:194`, `GrilleAgenda.tsx:30`, `planning/nouveau/page.tsx:17`). Nouveaux : `app/dashboard/error.tsx`, `demandes/[id]/loading.tsx`, un bandeau, un `vibrer()` sous `prefers-reduced-motion`.
- Codemod d'environ 856 déclarations `text-*` (hors marketing et admin). La config sert aussi le site vitrine : **de nouvelles classes, jamais d'écrasement de `text-sm`**.
- Vérifié : le filet tactile de `globals.css` n'est déjà plus sous `prefers-reduced-motion` (bloc « Refonte (01/10) ») ; l'inventaire 04 est périmé là-dessus. Aucune migration, aucune dépendance, aucune idée écartée rouverte.
- Risques : débordements à 17 px (éditeur de lignes, grille d'agenda, Bilan) ; 50 boutons changent de couleur d'un coup ; bande de statut PWA ; « rien n'est perdu » n'est vrai que si la file hors-ligne l'est.

## Lots
0. Classes `text-texte|titre`, `error.tsx`, `loading.tsx`, `vibrer()` : **aucun changement visible**.
1. Accueil, fiche, listes (déjà proches) ; barre haute retirée ; « Fait · Annuler ».
2. `Button` à 2 variantes (alias temporaires), primaire anthracite, priorités, avatars.
3. Génération 1 (Notes, Équipe, Compte, Bilan), puis Devis en dernier.
4. Retrait des anciennes tailles ; bandeau « rien n'est perdu » seulement avec la file qui tient sa promesse (sinon « Hors connexion » seul).

## Auto-évaluation (total 64,5 / 100)
Charge mentale **8** · Gestes **5** · Lisibilité **7** · Risque **6** · Migration **4** · Applicabilité **7**.

**Faiblesse 1 : le langage ne tient pas sur les écrans denses.** À 17 px, l'éditeur de devis (≈ 10 contrôles par ligne), la grille d'agenda et le Bilan débordent : soit « sauf le devis » (ce n'est plus un langage), soit on les redessine, hors périmètre. Chaque écran perd ≈ 25 % de lignes, donc plus de défilement ; et la densité ne baisse pas seule : même contenu, mêmes éléments.

**Faiblesse 2 : froideur et cartes fantômes au soleil.** Le filet `gris-clair` sur `paper` fait ≈ 1,2:1 (calcul) : sans ombre, la structure repose sur le texte et l'espace. En mode sombre, « Maintenant » devient un grand aplat clair. « Oui » et « Non » pèsent pareil : le cas le plus fréquent n'a plus d'accent.
