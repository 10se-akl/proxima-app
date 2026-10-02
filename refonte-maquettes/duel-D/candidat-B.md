# Duel D, candidat B : un en-tête, une action, un fil

## L'approche
La fiche projet ne garde que trois choses : un en-tête (nom, adresse, Appeler / Message / Itinéraire), une seule carte « Maintenant » avec au plus un bouton plein, et le **Carnet comme fil unique** où tout arrive : photos, notes, dictées, rendez-vous, devis, factures. Une barre au pouce, **Photo · Dicter · Écrire**, remplace le [+], la feuille « Ajouter au projet » et les boutons d'ajout éparpillés. Les blocs À retenir, Dossier et Facturation deviennent des lignes du fil ou des entrées du menu ⋯. Pas de vue terrain distincte (duel A) : le fil affiche le prénom des autres auteurs. Argent est la 5e case (duel B) ; devis et facture restent dans la fiche.

## La douleur
Information éparpillée (★★★★★) : « Deux mois plus tard, le client demande ce qui avait été convenu pour tel détail, et l'artisan doit fouiller partout. » Aujourd'hui le Carnet est le dernier bloc de `VueProjet.tsx`, trois à quatre écrans plus bas. Ici il est la fiche, et la loupe est sur le premier écran.

## Supprimé, fusionné, ajouté, perdu
- **Supprimé de l'affichage** (données et routes intactes) : progression à 5 segments, bloc « Dossier », bloc « Facturation » séparé, feuille « Ajouter au projet », feuille IA « à copier » (la feuille « Message au client » est unique : modèles SMS/WhatsApp), boutons secondaires de « Maintenant » (ils passent dans ⋯).
- **Fusionné** : mémo, tâches et prochains rendez-vous en un bloc sans titre ; demande et résumé IA en lignes du Carnet ; priorité, infos client, photos du projet, acompte, terminer dans une feuille ⋯.
- **Ajouté** : types « devis » et « facture » dans le fil, filtre Argent (remplace Suivi), prénom des autres auteurs, confirmation avant « Terminer le projet », brouillon local du mémo.
- **L'artisan perd** : la vue d'ensemble « devis + acomptes + solde » d'un coup d'œil (il lit une phrase et un filtre), la barre de navigation à 5 cases sur la fiche, l'import depuis la galerie passe par ⋯ › Photos du projet (4 gestes, comme avant, sans gain), le Carnet « tout replié » demandé le 27/09 (`Carnet.tsx:200-205`) : je le **rouvre** et le justifie par la suppression de quatre blocs, pas par le masquage du fil.

## Gestes (360 px, d'une main)
| Tâche | Avant | Après |
|---|---|---|
| 1 photo | 5 | 3 (Photo, déclencheur, valider) |
| 3 photos | 11 | 9 |
| Dicter une note | 5 | 3 (Dicter écoute déjà, Arrêter, Enregistrer) |
| Note écrite | 4+ | 3 |
| Retrouver « la fenêtre » | ~5 (3 défilements, champ, saisie) | 2 (loupe, saisie) |

Sans défiler : avant, l'en-tête (260 px) et le haut de « Maintenant » ; après, l'en-tête (152 px), « Maintenant », mémo et tâches, début du Carnet. Un seul bouton plein par écran.

## Impact technique (vérifié dans le code)
- `entreesCarnet.ts:17,32-39` : 5 types, ni devis, ni facture, ni auteur ; filtres Tout / Notes / Photos / Suivi. À étendre (fonctions pures, testables).
- `page.tsx:199-204` ne charge que le dernier devis (`limit(1)`) : il faut tous les devis et les factures du projet (aujourd'hui lues dans `FacturesProjet`). Les évènements `devis_*` et `facture_*` sont déjà des lignes du fil.
- Auteur : `artisan_id` existe sur `NoteVocale`, `Note`, `EvenementProjet` (`types/index.ts`) ; les photos sont rangées sous `${user.id}/…` (`PhotosProjet.tsx:97`). Pas de migration, mais il faut la liste des membres du duel A pour les prénoms.
- La barre mobile globale est fixe (`Sidebar.tsx:209`) et le [+] est intercepté (`VueProjet.tsx:146-163`) : à remplacer par une barre propre à la fiche.
- `NotesVocales.tsx:238` démarre sur un bouton « Dicter une note » : écoute dès l'ouverture, repli sur la saisie si la reconnaissance vocale manque. `PhotosProjet.tsx:188-206` : le champ `capture` sort de la feuille, déclenché depuis la barre (appui direct, donc geste autorisé).
- Fichiers touchés : `VueProjet`, `EnTeteProjet`, `Blocs`, `Carnet`, `entreesCarnet`, `prochaineAction`, `FormulaireNote`, `NotesVocales`, `PhotosProjet`, `Sidebar`, `page.tsx`. Aucune migration de données.
- Risques : « Réessayer » sur une photo en échec exige de garder les fichiers en mémoire (pas de file d'attente, `sw.js`) ; permission micro à la première dictée ; mémo en une ligne (appui = feuille d'édition).

## Lots livrables
1. **Barre Photo · Dicter · Écrire**, écoute immédiate, une seule feuille « Message au client », confirmation de fin, brouillon du mémo. Les anciens blocs restent.
2. **En-tête allégé, « Maintenant » à une action, ⋯ en feuille** ; retrait de Dossier et Facturation de l'affichage.
3. **Carnet complet** : devis, factures, filtre Argent, 5 lignes puis « Voir les N », première période ouverte, prénoms (après le duel A).

## Auto-évaluation (sur 100)
Charge mentale 27/30 · Gestes 18/20 · Lisibilité 17/20 · Risque technique 9/15 · Coût de migration 5/10 · Cohérence 4/5 = **80**.
**Faiblesses.** 1) L'argent n'a plus de lieu : Sylvie, le soir, lit un fil et un filtre au lieu d'un récapitulatif ; cela tient seulement si Argent (duel B) est une vraie destination. 2) Le Carnet devient lourd : deux nouveaux types, tous les devis et factures à charger, auteurs, barre globale masquée, et une décision du 27/09 renversée à faire valider.
