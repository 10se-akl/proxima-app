# Duel C, candidat D : la même page, du devant vers le derrière

**Approche.** Quatre blocs dans un ordre fixe toute la journée : *Maintenant*, *Aujourd'hui* (ce qui est devant), *À régler* (ce qui est derrière), *À suivre* (les dossiers qui traînent). Le soir n'est pas un autre écran : « devant » se vide, « derrière » monte tout seul, et quand il est vide l'écran dit « Tout est réglé. » avec la suite. Une seule règle de présence remplace les huit `if` de « Maintenant » et les deux grammaires de « À confirmer » et « En attente » : une ligne n'existe que si son heure va passer, si son heure est passée sans réponse, ou si un dossier traîne (un projet créé aujourd'hui *par vous* n'y est pas : « l'artisan le sait »).

**La douleur.** « Le réveil à 3 heures du matin, c'est très souvent une liste non fermée. » (douleur ★★★★★, la journée qui ne se ferme jamais). Le retrait de `f8d263b` avait raison : un bouton « C'est bon pour aujourd'hui » ne changeait rien de réel. Ici la fermeture est un **état vrai**, produit par des gestes réels (✓ ou Demain sur chaque ligne). Un seul geste de plus, facultatif : « Noter pour demain », qui écrit ce que l'app ne sait pas encore.

## Supprimé, fusionné, ajouté
- **Supprimé** : la carte « Fermer la journée » et son bilan chiffré (une requête en moins), le formulaire de replanification en ligne (date, heure), la chaîne « chantier terminé ? puis planifier ? » dans `AConfirmer` (déjà redite par `ConfirmerClotureProjet`), `determinerProchaineAction` (8 cas), le second bouton « Nouveau projet » du jour vide.
- **Fusionné** : « À confirmer », « En suspens » et les notes en retard en un bloc « À régler » (✓ et Demain, un seul vocabulaire). « À faire de votre côté » et « En attente du client » en « À suivre », trié du plus ancien au plus récent. « Maintenant » devient : la prochaine chose devant vous ; s'il n'y a rien et avant 17 h, le dossier qui traîne le plus.
- **Ajouté (petit)** : « Y aller » sur la carte (itinéraire, comme la fiche), la ligne « Demain · 8h30 · … » (ou le jour suivant), le prénom de l'auteur quand ce n'est pas vous, la trace « Fait : … · Annuler », « Bonsoir ».
- **Ce que l'artisan perd** : la replanification à une date précise depuis l'accueil (reste par le planning), le bilan du soir, la distinction visible « à faire de mon côté / chez le client ».

## Gestes, avant et après
| Tâche | Avant | Après |
|---|---|---|
| Itinéraire du prochain RDV | 2 (carte, puis fiche) | 1 |
| RDV fait, lié à un projet | 1 à 3 questions enchaînées | 1 ; « chantier terminé ? » est une ligne à part |
| RDV pas fait : le reporter | 4 (Non, date, heure, Replanifier) | 1 (Demain) ; autre date : 3 ou plus |
| Reporter une note à demain | 1 le soir seulement, sinon 4 ou plus | 1 à toute heure |
| Relire le devis du jour | 3 (carte, fiche, devis) | 1 |
| Relancer | 3 | 3 (inchangé) |
| Fermer le soir, 3 éléments | 3 gestes, trois sections à lire | 3 gestes, une liste |
| Noter ce qui trotte | 5 ou plus | 3 |

## Impact technique
- **Fichiers** : `app/dashboard/page.tsx` (restructuré, 11 requêtes au lieu de 12), `components/accueil/VueAccueil.tsx`, `Blocs.tsx` (deux colonnes de fin, auteur), `ListeAujourdhui.tsx` (coche aussi sur les tâches), nouveau `ARegler.tsx` (remplace `FermerJournee.tsx` et `AConfirmer.tsx` sur l'accueil, reprend la logique de `ConfirmerClotureProjet`). **Aucune migration, aucune dépendance.** Auteur : `artisan_id` existe déjà ; `profils` est lisible entre membres d'une même organisation, un ancien membre n'affiche rien.
- **Risques** : l'état du soir (la seule partie qui a un historique de retours) ; la trace doit vivre dans un parent client qui survit à `router.refresh()` ; « Demain » modifie un rendez-vous client (annulable, mais le client n'est pas prévenu sans « Prévenir ») ; une ligne masquée par la règle « créé aujourd'hui par vous » doit rester trouvable dans Projets.
- **Lots** :
  1. *Sans changement visible* : bornes du jour en heure de Paris (`page.tsx` 64-67, et `toISOString().slice(0,10)` dans `ConfirmerClotureProjet`), « Relire le devis » vers `/dashboard/devis/{id}`, plafond de 5 lignes sur « À confirmer ».
  2. *« À régler »* : `ARegler.tsx`, trace et repos, retrait de `FermerJournee` et du bilan.
  3. *« Maintenant » en deux règles*, « Y aller », ligne « Demain », fusion « À suivre », « Bonsoir ».
  4. *Auteur affiché* (à livrer avec le duel A).
  5. *Facultatif* : « Noter pour demain », « Prévenir » (feuille de message existante, envoi par l'artisan). Le candidat tient sans ce lot.

## Auto-évaluation
| Critère | Note | Raison |
|---|---|---|
| Charge mentale (30) | 8 | un vocabulaire, une liste de dettes, un état de fin vrai ; 4 blocs au lieu de 5 plus une carte |
| Gestes (20) | 8 | report et confirmation à 1 ; relance inchangée |
| Lisibilité à 360 px (20) | 6 | voir faiblesse 1 |
| Risque de régression (15) | 6 | touche le soir et `page.tsx` |
| Coût de migration (10) | 6 | une page réécrite, deux composants remplacés, pas de base |
| Cohérence (5) | 8 | recette de ligne, trace et repos du langage ; deux colonnes sur grand écran seulement |

Total estimé (notes pondérées) : **71 sur 100**.

**Faiblesse 1 : la ligne à deux actions au pouce.** ✓ et « Demain » dans une ligne de 328 px laissent environ 170 px au titre (« SCI Les Jardins d… » est coupé) et deux cibles voisines sous des gants. Non testé au soleil.
**Faiblesse 2 : des règles invisibles et un matin peu différent du reste de la journée.** Le projet créé aujourd'hui n'apparaît dans « À suivre » que demain, et l'horizon de 14 jours de « À régler » cache des vieux rendez-vous ; sur un jour chargé, les relances sont sous le pli. Le matin ne se distingue du milieu de journée que par « Y aller » : c'est voulu (le contenu évolue avec l'heure, l'écran non), mais cela répond moins au brief que le candidat C.
