# Candidat D — Le planning : une liste, et chaque changement propose de prévenir

## L'approche
Sur téléphone, le planning devient **une seule liste « à venir »** (aujourd'hui, demain, la suite), sans bande de 7 jours. **Décaler** et **Annuler** mènent toujours à « Message au client », texte prêt, que Gérard envoie lui-même depuis son SMS ou WhatsApp (on réutilise `FeuilleDeplacer` et `FeuilleMessageClient`, déjà livrées). **Planifier** se fait dans une feuille déjà remplie (demain, même heure que la dernière visite, 1 h) : 2 appuis. Pour une équipe, on ne crée **aucune colonne par personne** : on lève seulement le faux conflit, et deux chantiers à la même heure se voient d'un trait.

## La douleur
Le silence avec le client (★★★★☆) : « Un seul message au bon moment aurait sauvé la relation. » Aujourd'hui, on décale en 7 gestes sans jamais proposer de prévenir, et on annule en 2 gestes sans confirmation ni message.

## Décisions
- **Vue par défaut : la liste.** Pas de jour seul (on ouvre le samedi sur un lundi vide : cf. commentaire d'`AgendaMobile`), pas de grille de semaine (7 colonnes illisibles à 360 px). La météo reste un mot d'alerte sur la ligne ; le détail est dans la feuille.
- **Pas de glisser-déposer** : gants, défilement vertical, 4G, aucune alternative accessible. « Demain » en une puce fait mieux.
- **« Prévenir » s'enchaîne** après Décaler et Annuler, jamais d'envoi sans geste. Nouveau modèle « annulation » (une fonction dans `lib/messagesClient.ts`). Défaut constaté dans la feuille livrée : elle n'affiche que la première phrase, donc la **nouvelle date n'est pas visible** avant d'envoyer ; D montre les deux phrases (seule exception à « une ligne »).
- **Chevauchement** : un avertissement d'une ligne (« Même heure que Mme Garnier (9h00). »), plus un blocage. En base, la contrainte d'organisation entière est remplacée par « même chantier, même créneau » (garde-fou du double appui).

## Supprimé, fusionné, ajouté — ce que l'artisan perd
- **Supprimé** : la bande des 7 jours, la ligne de semaine, « Revenir à aujourd'hui », « Supprimer » dans la feuille (reste dans « Modifier »), le blocage de chevauchement.
- **Fusionné** : « Modifier ou déplacer » devient « Décaler » (+ « Modifier » en lien discret) ; trois manières de choisir une date deviennent une rangée de puces.
- **Ajouté** : `ChoixJour` (puces), `FeuillePlanifier`, confirmation d'annulation.
- **Perdu** : voir d'un coup d'œil les points de la semaine sur téléphone ; l'ordinateur et la fiche projet gardent l'historique. Un solo perd l'obstacle dur au double rendez-vous.

## Gestes (avant → après)
| Tâche | Avant | Après |
|---|---|---|
| Créer depuis la fiche | ≈ 8 | **2** (3 si autre jour) |
| Créer depuis le planning | ≈ 9 | **3** |
| Décaler à demain **et prévenir** | 7 + 4 = 11 | **5** (ligne, Décaler, bouton, SMS, Envoyer) |
| Annuler **et prévenir** | 2 (sans message, 6 avec) | **5** (ligne, Annuler, Oui, SMS, Envoyer) |
| Annuler seul | 2 | 4 (question + fermer le message) — le prix de la sécurité |

## Impact technique
- Touchés : `planning/page.tsx` (fenêtre mobile de 14 jours), `AgendaMobile.tsx` (réécrit), `FeuilleDeplacer.tsx`, nouveaux `ChoixJour`, `FeuillePlanifier`, `lib/messagesClient.ts`, `ConfirmationRdv.tsx` et `planning/nouveau/page.tsx` (avertissement), fiche projet (`planifier`), `schema.sql` (un module).
- **Migration** : une contrainte remplacée. Plus faible que l'ancienne, donc aucune donnée ne peut la violer ; à déployer **avant** le code.
- Route `/planning/nouveau` conservée (modifier, tâches). Grille ordinateur inchangée : ses menus ouvrent les mêmes feuilles (lot 2).
- Risques : fuseaux (UTC serveur / Paris), deux surfaces de création le temps du lot 3.

## Lots (aucun big bang)
1. **Sans migration** : `?projetId=` préremplit titre, jour, heure, durée ; confirmation d'annulation ; « Supprimer » déplacé.
2. **Prévenir** : Décaler et Annuler chaînés au message ; `ChoixJour` ; modèle « annulation ».
3. **Liste à venir** + bouton en bas + `FeuillePlanifier`.
4. **Chevauchement** : migration, puis avertissement non bloquant.
5. *(Seulement si le duel A l'autorise)* « Avec Raph » : une initiale, une colonne `pour_id` nullable.

## Auto-évaluation
Charge mentale 4,5/5 · Gestes 4,5/5 · Lisibilité 4/5 · Risque 3/5 · Migration 3,5/5 · Cohérence 4,5/5 → **≈ 81/100**.

**Deux faiblesses.** (1) Sans « qui y va », la vue à deux reste anonyme : D lève le bug mais ne dit pas qui va où ; la variante « Avec Raph » frôle l'assignation que le duel A exclut. (2) On change une garantie en base et on affaiblit le blocage du double rendez-vous pour les solos ; la saisie de la feuille n'a pas de brouillon local (elle est courte, mais la règle « rien ne se perd » n'est tenue qu'à moitié).
