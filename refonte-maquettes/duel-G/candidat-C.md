# Candidat C — La semaine en sept lignes

**Approche.** Sur téléphone, l'unité du planning devient le **jour avec son chantier**, plus l'heure : sept jours glissants à partir d'aujourd'hui, une ligne chacun (« Dupont · 8h · Cloisons »), les jours vides dits « Rien de prévu ». La bande de jours, le jour choisi et la grille disparaissent : tout tient sur un écran. Le même **sélecteur de sept jours** sert à créer et à reporter, et chaque report ou annulation enchaîne sur « Prévenir le client ? » avec le texte déjà prêt (`decalage`).

**Douleur.** Le silence avec le client : « Un seul message au bon moment aurait sauvé la relation. » Aujourd'hui annuler (2 appuis) et reporter (≈ 7) ne proposent jamais de prévenir. Seconde douleur : « quand es-tu libre ? » oblige à ouvrir les jours un par un.

**Supprimé, fusionné, ajouté.**
- Supprimé : la bande de 7 onglets et son état « jour choisi » ; « Modifier ou déplacer » (devient « Reporter » + « Modifier ») ; la météo en phrase dans la feuille (elle passe sur la ligne).
- Fusionné : créer et reporter partagent un seul sélecteur de jours ; l'ancien formulaire `planning/nouveau` reste pour « Modifier » et les tâches (aucune route supprimée).
- Ajouté : le sélecteur, une feuille « Planifier », la question d'annulation, « Qui ? » seulement à partir de 2 membres.
- L'artisan perd : l'accès direct à un jour lointain (il passe par ‹ ›), l'heure en gros comme titre, la bande de points.

**Gestes** (envoi dans l'application SMS compté ; avant = inventaire §6).

| Tâche | Avant | Après |
|---|---|---|
| Où suis-je mercredi ? Mardi est-il libre ? | 1 à 2 | 0 |
| Créer depuis la fiche projet | ≈ 8 | 3 (2 si « demain, journée » convient) |
| Créer depuis le planning | ≈ 9 | 3 (ligne vide, chantier, Planifier) |
| Reporter à demain et prévenir | ≈ 11 (7 + 4) | 5 (ligne, Reporter, bouton, SMS, envoi) |
| Prévenir pour la pluie | 4 | 3 (bulle sur la ligne, SMS, envoi) |
| Annuler | 2, sans question ni message | 5 (ligne, Annuler, Oui, SMS, envoi) ; 4 avec « Pas maintenant » : voulu |

**Impact technique.**
- `app/dashboard/planning/page.tsx` : fenêtre aujourd'hui → +6 j (`?debut=`), une seule requête couvrant aussi la semaine de la grille ; prénoms des membres si ≥ 2.
- Nouveaux : `SemaineLignes.tsx`, `ChoisirJour.tsx`, `FeuillePlanifier.tsx` (écrit comme `planning/nouveau/page.tsx:295-300` ; titre = type de chantier, 8h, journée). Modifiés : `FeuilleDeplacer.tsx` (champs date remplacés par `ChoisirJour`), feuille d'actions de `AgendaMobile.tsx` (réutilisée), bouton « Planifier » de la fiche.
- Annulation : **aucun nouveau modèle** (`messagesClient.ts` en gèle sept) : on réutilise `decalage` sans date. À valider : annuler promet « une nouvelle date ».
- Équipe (lot 4 seulement) : `assigne_a uuid` nullable, contrainte `evenements_planning_pas_de_chevauchement` refaite sur `coalesce(assigne_a, artisan_id)` (`schema.sql:1834-1841`). La RLS reste par organisation. « Les deux » = deux lignes fusionnées à l'affichage.
- Risques : fuseau (la semaine serveur est calculée en UTC), le report échoue encore en `23P01` si l'heure est prise, régression sur les rendez-vous créés depuis l'accueil.

**Lots.** 1) Question d'annulation + « Prévenir » après report depuis le planning (vue inchangée, utile même si C perd). 2) Vue en sept lignes, météo sur la ligne, `sm:hidden` sur l'ancienne. 3) `ChoisirJour` + « Planifier » (fiche et planning). 4) Équipe : migration, prénom, « Qui ? ».

**Auto-évaluation** : charge mentale 8 · gestes 8 · lisibilité 7 · risque 6 · migration 5 · cohérence 6 → **71/100**.

**Deux faiblesses réelles.**
1. **« Rien de prévu » n'est pas « libre ».** Gérard ne note pas tout, et un chantier de trois jours reste trois rendez-vous indépendants : reporter le lundi ne déplace pas le mardi. Au-delà de 3 ou 4 événements par jour, la semaine en sept lignes devient la liste du candidat B.
2. **L'équipe coûte cher et la logique du temps se dédouble.** Il faut une migration et une fusion à l'affichage ; le téléphone montre des jours glissants, l'ordinateur une grille lundi-dimanche, que la conjointe lit le soir.
