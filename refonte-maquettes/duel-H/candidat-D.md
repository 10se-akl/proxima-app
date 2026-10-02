# Candidat D (libre) : un langage court, tenu par le code, avec ses états et son repos

**L'approche.** On garde le langage « moins mais mieux » de l'accueil et de la fiche projet, déjà partagé par cinq listes, et on le réduit à des chiffres : 5 tailles de texte (32, 20, 16, 14, 12), 2 tons (`ink`, `steel`), 2 recettes de surface (ligne, bloc) plus la feuille, un rayon de 16 px, 3 boutons dont un seul primaire, anthracite. On ajoute ce qui manque : les états (chargement, vide, erreur, hors-ligne) dans une seule grammaire, une vibration brève, un moment de repos quand tout est fait. Les règles sont tenues par des noms de tailles Tailwind et un script « cliquet » (sans dépendance), pas par un document : BRAND.md dit encore « terracotta = boutons » alors qu'une trentaine de boutons sont déjà anthracite.

**La douleur.** « *"3 devis en attente" se lit en une seconde. Une phrase de douze mots, non.* » Et : « *aucun moment où l'application dit "c'est bon, tout est rangé, rien n'est en suspens"* ». Aujourd'hui, cocher une tâche sur l'accueil la fait disparaître sans trace ni « Annuler », et l'app ne dit jamais que le réseau manque.

## Supprimé, fusionné, ajouté, perdu
- **Supprimé** : 21 des 26 tailles de texte ; 13 opacités de texte → 2 tons (plus 2 filets : 15 % et 45 %) ; 8 recettes de carte → 3 surfaces ; 9 rayons → 3 ; le terracotta plein des boutons (reste le « + ») ; `danger` plein ; le zoom au survol ; les icônes terracotta de la fiche ; les « Chargement… » ; l'emoji 👍.
- **Fusionné** : « Fait · Annuler » (déjà sur la fiche) étendu à l'accueil et à À confirmer ; « Tout est réglé » (déjà dans Fermer la journée) devient l'état de repos unique, « Chantier terminé » compris.
- **Ajouté** : bandeau hors-ligne sans bouton ; `error.tsx` et `loading.tsx` de la fiche ; `lib/retour.ts` (vibration 12 ms, ou 2 brèves en cas d'échec ; Android ; aucun son, aucun réglage) ; le cliquet `scripts/verif-langage.mjs`.
- **Gérard perd** : le terracotta des gros boutons (plus sobre ; en sombre le primaire devient clair), les textes de 10 à 13 px (plus de troncatures), l'ombre des cartes.

## Gestes (estimations de lecture du code, aucun test utilisateur)
| Tâche | Avant | Après |
|---|---|---|
| Cocher une tâche faite | 1 | 1 |
| Rattraper une coche par erreur | 3 ou plus | 1 (« Annuler », 5 s) |
| « Oui » à « Visite faite ? » | 1, cible 57 × 48 px | 1, cible 146 × 48 px |
| Ajouter une note ou des photos | 1 | 1 |
| Savoir que c'est enregistré | 0, « Enregistré » en 11 px | 0, vibration et trace |
| Découvrir qu'il n'y a plus de réseau | 2 à 3 (échec, retentative) | 0 (bandeau) |

**Aucun geste fréquent ne diminue, et la densité de l'accueil non plus** (même contenu). Le gain porte sur le rattrapage et la réassurance : accents terracotta de la fiche 10 à 15 → 1 ; phrases de plus d'une ligne dans « Maintenant » → 0 (« 12 jours » en 32 px).

## Impact technique
- **Vérifié** : le défaut « cibles tactiles sous `prefers-reduced-motion` » de l'inventaire 04 est **déjà corrigé** (commit 7e51a30, `globals.css:259`). Reste le plancher à 44 px au lieu de 48 (`:298`, `button, a[role=button]` seulement). Confirmés : 0 `navigator.vibrate`, 0 écoute de `onLine`, aucun `error.tsx`, aucun `loading.tsx` sur `demandes/[id]`.
- **Fichiers** : `tailwind.config.ts` (noms `text-chiffre`… en `extend`, marketing intact), `globals.css`, `components/ui/{Button,Card,Skeleton,SquelettePageListe}`, `ListeAujourdhui`, `AConfirmer`, `FermerJournee`, `EnTeteProjet`, `Sidebar`, `BRAND.md`, 5 fichiers nouveaux. Ni migration, ni route retirée, ni RLS, ni dépendance, ni couleur nouvelle (alias `.texte-alerte` = `signal-fonce` / `signal-clair`).
- **Contrastes calculés** : `ink` 13,9:1 ; `steel` 4,9:1 ; blanc sur `signal` 3,7:1 (le « + » seul, jamais du texte) ; `succes` 3,8:1 et `alerte-orange` 2,7:1 (coche et point, jamais du texte) ; `ink/60` 4,0:1 (d'où 2 tons).
- **Risques** : ~50 `<Button>` primaires changent de couleur d'un coup ; le plancher 48 px peut déplacer des contrôles ; `navigator.onLine` est peu fiable en 4G faible. Le bandeau ne dira « vos saisies sont gardées » qu'une fois vérifié que c'est vrai partout (devis compris). Aucune idée écartée n'est rouverte : il montre un état, il ne promet pas de mode hors-ligne.

## Lots
1. **Garde-fous, sans changement visible** : noms de tailles, cliquet et sa base, plancher 48 px, BRAND.md aligné.
2. **États, ajouts purs** : `error.tsx`, `loading.tsx`, squelette à la forme de la ligne, bandeau (« Pas de réseau » seul).
3. **Boutons et cartes**, le seul saut visible : `Button`, `Card`, focus `ink`, retrait du zoom.
4. **Retours et repos** : `retour.ts`, « Fait · Annuler » accueil et À confirmer, repos, « Chantier terminé ».
5. **Migration écran par écran** (accueil, fiche, listes, devis, planning, réglages) ; chaque PR fait baisser le cliquet ; les 28 couleurs en dur deviennent des jetons.

## Auto-évaluation (poids standard ; cohérence lue comme applicabilité)
Charge mentale 7 (21) · Gestes 5 (10) · Lisibilité 8 (16) · Risque 7 (10,5) · Migration 6 (6) · Applicabilité 8 (4) = **≈ 68/100**.

**Deux faiblesses.** (1) La plus lourde des synthèses : cinq ajouts et un changement d'identité (primaire anthracite sur ~50 boutons) pour un duel de langage ; un candidat plus soustractif passe avec moins de risque, et « plus de plaisir » n'est pas mesuré. (2) Preuves manquantes : lisibilité au soleil et vibration non testées sur un vrai Android ; bords de ligne à 1,3:1 (on compte sur 64 px de haut et 8 px d'espace) ; l'accueil garde deux masses sombres (« Maintenant » et « Oui »), à la limite de « un seul primaire » ; vue ordinateur non montrée.
