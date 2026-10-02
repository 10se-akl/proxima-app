# Duel C — candidat B : une seule liste ordonnée

Maquette : `candidat-B.html` (8 h 10, 10 h 30, 18 h 45 avant et après, jour vide, bureau du soir, clair et sombre).

## L'approche
Cinq blocs deviennent **une liste de 7 lignes au plus, « Maintenant » comprise** : « Maintenant » est la ligne 1, en sombre. Un seul ordre, quatre rangs : **0** le rendez-vous qui commence dans l'heure ; **1** ce qui est passé sans être réglé (note en retard, « Fait ? »), le plus ancien d'abord ; **2** le reste d'aujourd'hui, à l'heure ; **3** ce qui attend (relances, devis à relire), le plus ancien d'abord. Une colonne dit pourquoi la ligne est là : « 14h00 », « Retard », « Hier », « 18 j ».
Matin, journée, soir : la même liste, recalculée sur l'horloge. Après 17 h, le rang 3 se replie derrière « Voir les N autres » (le compte reste visible) ; « Bonsoir » remplace « Bonjour ». Coéquipier : même espace, aucun rôle ; seule la mention « par Lucas » apparaît quand l'auteur n'est pas vous (`notes.artisan_id` existe).

## La douleur
« Le réveil à 3 heures du matin, c'est très souvent une liste non fermée. » Et : « Une information n'apparaît que si elle risque d'être oubliée. » Une chose est listée si elle porte une heure, franchit un seuil (devis 3 j, facture échue) ou attend l'artisan. **Aucun bouton de clôture** (leçon de `f8d263b`) : quand plus rien n'est dû aujourd'hui, le titre devient « Tout est réglé. » avec « Demain · 7h30 · Mme Faure ». Chaque coche laisse « Fait : … · Annuler ».

## Supprimé, fusionné, ajouté, perdu
- **Fusionnés** : À confirmer, Aujourd'hui, À faire de votre côté, En attente du client, Fermer la journée.
- **Supprimés** : titres et compteurs de bloc ; bilan du soir (remplacé par les traces) ; « Nouveau projet » du jour vide (doublon du « + »).
- **Ajoutés** : colonne « quand », trace « Fait », « Tout est réglé. », « Voir les N autres » sur place.
- **L'artisan perd** : « Non » avec date et heure sur l'accueil ; **« Demain » sur la ligne** (faiblesse 1) ; « Plus tard » sur « Chantier terminé ? ». Un « Demain » qui déplaçait le rendez-vous du client sans le prévenir disparaît : c'est un gain.

## Gestes (avant → après)
| Tâche | Avant | Après |
|---|---|---|
| Voir ce qui m'attend | 5 blocs, jusqu'à 25 lignes | 1 liste, 7 lignes |
| Ouvrir le prochain rendez-vous · cocher une note · relancer | 1 · 1 · 3 | 1 · 1 · 3 |
| Confirmer un rendez-vous fait | 1, puis 1 à 2 questions imposées | 1 ; « Chantier terminé ? » devient une ligne |
| Rendez-vous non fait, replanifier | ≥ 4 | ≥ 4 |
| Fermer la journée, par élément | Fait 1 ou Demain 1 | Fait 1 ; Demain ≥ 2 |

## Impact technique
- **Fichiers** : `app/dashboard/page.tsx` (une construction de lignes et un tri remplacent quatre listes et la cascade de `if`), `VueAccueil.tsx` réduit, nouveaux `lib/accueil/ordre.ts` (fonction pure) et `components/accueil/ListeUnique.tsx`. `ListeAujourdhui`, `FermerJournee`, `AConfirmer`, `ConfirmerClotureProjet` quittent la page ; aucune route retirée.
- **Données** : aucune migration ; `devis.created_at` en lecture. Mêmes écritures, même RLS : pas de surface de sécurité nouvelle.
- **Corrigés au passage** : bornes du jour en heure de Paris (`debutJourParis` existe déjà), plafond d'« À confirmer », lien « Relire » vers le devis.
- **Risques** : la chaîne Oui → « chantier terminé ? » → « planifier ? » disparaît ; toute la logique tient dans le tri, à vérifier par scénarios (matin, 10 h 30, soir, vide).
- **Lots** : 0) bornes Paris et lien du devis, utiles à tous ; 1) `ordre.ts` et scénarios, écran intact ; 2) `ListeUnique` à la place des blocs 2 à 5 ; 3) « Maintenant » = ligne 1, « Tout est réglé. », repli après 17 h, retrait de `FermerJournee`. Chaque lot se défait seul.

## Auto-évaluation (sur 100)
Charge mentale 25/30 · gestes 14/20 · lisibilité 16/20 · risque 9/15 · coût 6/10 · cohérence 4/5 = **74**. Écarts assumés : 7 lignes contre 5 à la règle 1 du langage (1 + 5 la respecterait) ; la carte « Maintenant » porte une coche.

## Les deux vraies faiblesses
1. **Le soir ne se ferme que par des actes.** Sans « Demain », on ne vide la liste qu'en faisant ou en ouvrant chaque ligne. « Tout est réglé. » ne veut dire que « rien n'est dû aujourd'hui » : six relances attendent derrière un lien. La douleur ★★★★★ n'est traitée qu'à moitié.
2. **L'argent passe après l'agenda.** Le rang 3 est en dernier : un jour chargé repousse relances et devis derrière « Voir les N autres », là où le silence du client coûte le plus. La liste mélange questions, tâches et attentes que les blocs séparaient, et « Maintenant » peut être une vieille ligne en retard.
