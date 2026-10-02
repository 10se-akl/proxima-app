# Duel H, candidat C : « gros boutons de chantier »

## L'approche
Trois tailles de texte seulement (32 / 20 / 14 px), une seule recette pour tout ce qu'on touche (la **ligne** pleine largeur, 64 px au moins, sans carte), un seul bouton plein par écran (anthracite, 64 px). Le terracotta plein ne sert qu'au « + » de la barre du bas. L'appui inverse la ligne (visible au soleil), un « fait » se rattrape par « Annuler » pendant 6 s au lieu d'une confirmation, et le soulagement est du vide : « Tout est réglé. » en 32 px et beaucoup de blanc. Maquette : `candidat-C.html` (clair et sombre, planche des états).

## La douleur
La journée qui ne se ferme jamais, et le principe de la recherche : « Des chiffres et des pastilles plutôt que des phrases. » Aujourd'hui, finir une tâche sur l'accueil fait *disparaître* la ligne sans un mot (`ListeAujourdhui.tsx`, vérifié) : rien ne dit à Gérard que c'est réglé, ni qu'il peut se rattraper. Et 40 % des tailles de texte font 12,5 px ou moins (inventaire 04).

## Supprimé, fusionné, ajouté, perdu
- **Supprimé** : les 8 recettes de carte (une seule reste : la ligne), 26 tailles de texte (3), la police mono dans l'app connectée (la requête de police ne disparaît que si le site public ne s'en sert plus non plus), les variantes de bouton `ghost`/`danger` (une ligne, ou une ligne en texte d'alerte), l'avatar « MR », la barre à 5 segments, `BoutonCapture` en double du « + », les pastilles terracotta de la barre.
- **Fusionné** : « Maintenant » devient la première ligne de la liste ; les blocs de plus de 3 lignes deviennent une ligne « Voir les N ».
- **Ajouté** : `Ligne.tsx`, une bande hors-ligne d'une ligne, `error.tsx`, `loading.tsx` de la fiche, « Annuler » 6 s, une vibration de 10 ms (Android, aucun son : bruit de chantier).
- **L'artisan perd** : l'enveloppe visuelle des cartes (donc un peu de « chaleur »), l'heure en mono alignée, l'avatar de reconnaissance, et un peu de densité (voir plus bas).

## Gestes (avant → après)
| Tâche | Avant | Après |
|---|---|---|
| Cocher une tâche du jour | 1 | 1, plus « Fait · Annuler » |
| Rattraper une coche faite par erreur | 4 ou plus, et seulement si on y pense (fiche, carnet, décocher) | 1 (Annuler) |
| Répondre « Visite faite ? » | 1 (deux petits boutons collés) | 1 (deux boutons de 56 px, 12 px d'écart) |
| Lire le numéro du client | 1, via le composeur | 0 (affiché sur la ligne) |
| Savoir si une saisie est partie hors-ligne | impossible avant l'erreur | 0 (bande fixe) |
| Modifier une ligne de devis | 1 (champ en place) | 2 **si** le devis adopte la « ligne puis feuille » : je le déconseille tant que le duel Devis n'a pas tranché |

C ne réduit pas les gestes : il les garde et retire des erreurs et des lectures.

## Impact technique
Aucune migration, aucune route, aucune RLS, aucune dépendance. Environ 20 fichiers : `tailwind.config.ts` (3 `fontSize` nommées), `components/ui/Ligne.tsx` (nouveau, reprend `LigneAccueil`), `Button.tsx` (primaire anthracite, fin du zoom au survol), `Skeleton.tsx`, `EtatErreur.tsx`, `BandeauHorsLigne.tsx` + `app/dashboard/layout.tsx`, `app/dashboard/error.tsx`, `lib/retour.ts` (`vibrer`, coupé si mouvement réduit), `accueil/Blocs.tsx`, `ListeAujourdhui.tsx`, `AConfirmer.tsx`, `VueAccueil.tsx`, `projet/Blocs.tsx`, `EnTeteProjet.tsx`, `VueProjet.tsx`, `Sidebar.tsx`, les 4 listes et `AgendaMobile.tsx`. Aucun nouveau token : l'alerte reste `text-signal-fonce dark:text-signal-clair`, écrit une fois dans `Ligne`. Déjà fait, vérifié : le plancher tactile sort du bloc `prefers-reduced-motion` (`globals.css` l. 255-300) ; il reste à passer de 44 à 48 px.
**Risques** : régression visuelle sur les écrans denses qu'on ne touche pas ; la bande hors-ligne ne doit promettre « vos saisies sont gardées » que le jour où c'est vrai partout (sinon : « Pas de réseau. » seul) ; la vibration est ignorée sur iPhone.

## Lots (jamais de big bang)
1. Socle : tailles, `Ligne`, `vibrer`, `error.tsx`, `loading.tsx` fiche, bande hors-ligne, plancher 48 px.
2. Accueil : lignes, « Annuler », « Tout est réglé », Oui/Non empilés.
3. Fiche projet : lignes d'action, primaire anthracite.
4. Les 4 listes et l'agenda mobile (retrait de `rounded-2xl ring-1`).
5. Optionnel : `Button.tsx` et les ~30 `<button bg-ink>` bruts ; barre du haut claire. **Hors C** : éditeur de devis, grille du planning, bilan, paramètres.

## Auto-évaluation (sur 100)
Charge mentale **24/30** · gestes **14/20** · lisibilité **18/20** (jamais testé avec des gants : tailles tirées des recommandations, pas de mesure sur appareil) · risque **8/15** · migration **5/10** · applicabilité **3/5**. **Total 72.**

**Faiblesses.**
1. **Il ne couvre pas les écrans à tableau ou formulaire** (devis, grille du planning, bilan, paramètres) : « une action par ligne » y est inapplicable ou coûte un geste. Sur ordinateur (le bureau du soir de la conjointe), les lignes pleine largeur deviennent une colonne étroite à plafonner à 720 px : le langage est pensé pour le téléphone.
2. **Coût et ton.** Une réécriture de ~20 fichiers, avec trois langages qui coexistent (génération 1, 2 et C) tant qu'on s'arrête en route, et un rendu sec, sans cartes, qui sert moins le « plaisir » (8e règle). Côté densité, mesure sur la maquette : à 360×780 le même nombre de lignes qu'aujourd'hui (3), à 360×640 environ 1,4 ligne d'« Aujourd'hui » au lieu de 1,7. Les noms plus gros se tronquent plus tôt (~23 caractères).
