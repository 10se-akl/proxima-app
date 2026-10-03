# Duel G — Candidat B : une seule liste « à venir », et on ne bouge rien sans prévenir

## L'approche
Sur téléphone, le Planning devient une liste chronologique unique (Aujourd'hui, Demain, Ensuite), sans bande de 7 jours, sans flèches de semaine, sans grille. Créer, c'est trois appuis : « Ajouter », le chantier, « Enregistrer » : le jour, l'heure et la durée sont déjà remplis. Déplacer ou annuler un rendez-vous client enchaîne toujours sur « Prévenir M. Dupont ? », avec le texte prêt ; Gérard envoie lui-même depuis sa messagerie, ou touche « Pas besoin ».

## La douleur
Le silence avec le client. « Un seul message au bon moment aurait sauvé la relation. » Et : « Si prévenir un client devient un geste d'une seconde avec un texte déjà prêt, l'artisan le fait » (`recherche-douleurs-artisans.md` l. 96-98). Aujourd'hui, déplacer ne propose rien et annuler est muet, sans confirmation.

## Supprimé, fusionné, ajouté
- **Supprimé** : la bande des 7 jours, les flèches de semaine, « Revenir à aujourd'hui », le titre du jour, le bouton « + Ajouter » du haut, le titre à saisir, la date et l'heure vides, le « Modifier ou déplacer » qui ouvrait un formulaire de 7 champs, et « Supprimer » dans la feuille (annuler suffit, rien n'est effacé ; il reste au menu de la grille).
- **Fusionné** : « Modifier ou déplacer » devient « Déplacer » (la feuille déjà livrée pour l'accueil). Les lignes reprennent la recette de l'accueil (`ListeAujourdhui`) : une coche d'un appui sur les lignes d'aujourd'hui.
- **Ajouté** : une feuille « Nouveau rendez-vous », une question « Annuler le rendez-vous ? », un modèle de message « annulation », et « Pas besoin » sous le message. Pour une équipe seulement : la ligne « Pour » et le prénom sur la ligne.
- **Gérard perd** : la vue d'ensemble de la semaine d'un coup d'œil, la navigation semaine par semaine, le formulaire complet comme chemin par défaut (il reste, route intacte, derrière « Autre chantier »). Pas de glisser-déposer : gants, défilement et lâcher raté.
- **Les routes restent** : `planning/nouveau` (y compris `?eventId=`) et la grille de l'ordinateur ne bougent pas.

## Deux personnes (Gérard et Raph), sans Gantt
Même liste, même ordre. Le prénom ouvre la ligne de détail quand ce n'est pas vous (« Raph · Plafond »). À la création, une ligne « Pour : Moi · Raph » n'existe que s'il y a deux membres ou plus, par défaut « Moi ». Le chevauchement devient **par personne** (colonne `assigne_a`) : Gérard et Raph peuvent être à 8 h sur deux chantiers.

## Gestes (envoi dans la messagerie compté)
| Tâche | Avant | Après |
|---|---|---|
| Voir demain | 2 à 3 (bande) | 0 |
| Créer depuis le planning | ≈ 9 | **3** |
| Créer depuis la fiche | ≈ 8 | **2** (3 si autre jour) |
| Déplacer à demain et prévenir | ≈ 7 + 4 = 11 | **5** |
| Annuler et prévenir | 2 muet (+ 4) | **5** ; sans prévenir : 4 |
| Fait (aujourd'hui) | 2 | **1** |

L'annulation sans prévenir coûte 2 appuis de plus : c'est voulu, c'est la protection.

## Impact technique
- **Touchés** : `app/dashboard/planning/page.tsx` (fenêtre d'aujourd'hui à J+9, fuseau Paris), nouveau `components/planning/ListeAVenir.tsx` (remplace `AgendaMobile`), `FeuilleActions` (extraite d'`AgendaMobile`), `FeuilleAnnuler`, `FeuilleNouveauRdv`, `FeuilleDeplacer` inchangée ; `lib/messagesClient.ts` (+ modèle `annulation`) ; `FeuilleMessageClient.tsx` (option « un seul message »). Le menu « Annuler » de `GrilleAgenda` passe par la même feuille.
- **Migration** (lot 4 seulement) : `evenements_planning.assigne_a uuid` (rempli avec `artisan_id`), contrainte d'exclusion sur `(assigne_a, periode)` à la place de `(organisation_id, periode)`, et un contrôle que `assigne_a` est membre de l'organisation. La contrainte par personne est plus faible que l'actuelle : elle ne peut pas échouer sur les données existantes.
- **Régressions** : rendez-vous au-delà de J+9 (le lien « Voir la suite » charge 14 jours de plus) ; l'heure suit le fuseau de l'appareil dans `AgendaMobile` (on passe à Paris) ; « Annuler » ne propose rien sans projet ni numéro.

## Lots
1. **Prévenir** (indépendant, urgent) : `FeuilleAnnuler`, « Déplacer » dans la feuille actuelle, modèle `annulation`, menu de la grille.
2. **Liste** : `ListeAVenir` à la place de la bande, la feuille d'actions reprise telle quelle.
3. **Créer en 3 gestes** : `FeuilleNouveauRdv` depuis le Planning et la fiche projet.
4. **Équipe** : migration, prénom, « Pour », chevauchement par personne.

## Auto-évaluation
Charge mentale 8/10 (24/30) · Gestes 9/10 (18/20) · Lisibilité 8/10 (16/20) · Risque 6/10 (9/15) · Migration 6/10 (6/10) · Cohérence 8/10 (4/5) : **77/100**.

## Les deux vraies faiblesses
1. **La vue d'ensemble disparaît.** « Suis-je libre jeudi ? » exige de défiler, et un rendez-vous dans trois semaines est invisible sans « Voir la suite ». Seule parade : une ligne dans la feuille de création (« Pris jusqu'à 12 h. Libre dès 14 h. »). À trois personnes ou plus, la liste mélange tout, sans filtre « Moi » (refusé : un filtre est une option).
2. **L'équipe rouvre une décision.** Le chevauchement par personne demande `assigne_a`, alors que l'arbitrage du duel A écrit « pas d'assignation de tâches » (ici : rendez-vous seulement). Repli sans colonne : contrainte par auteur (`artisan_id`) ; elle laisse la conjointe, qui saisit le soir pour Gérard, sans protection.

Réserves mineures : « toujours prévenir » peut agacer sur un décalage de 15 minutes (« Pas besoin » doit rester à un appui) ; « Aujourd'hui » répète le bloc de l'accueil ; la météo reste celle de la ville du siège (corrigeable avec `extraireVilleDepuisAdresse` sur l'adresse du chantier).
