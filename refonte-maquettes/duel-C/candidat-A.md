# Duel C — Candidat A : ne rien changer (les bugs seulement)

## L'approche
On garde l'écran tel quel : cinq blocs au plus, « Maintenant » (ou « Fermer la journée » dès 17 h), mêmes règles d'apparition, même ordre. On corrige cinq défauts : **C1** plafond d'« À confirmer » (5 lignes, puis « Et N de plus. ») ; **C2** « Relire le devis » (et les lignes « Devis à relire / à envoyer ») ouvre `/dashboard/devis/[id]`, pas la fiche ; **C3** bornes du jour en heure de Paris (`minuitParis`, déjà utilisé plus bas dans la même page) ; **C4** « Demain » ne déplace plus un rendez-vous client en silence ; **C5** « Voir les N » d'« En attente du client » mène à la liste du bon type. Hypothèse nulle du duel : tout autre candidat doit battre ça, migration comprise.

## La douleur traitée
« Le réveil à 3 heures du matin, c'est très souvent une liste non fermée. » (recherche, « la journée qui ne se ferme jamais »). Et le principe 2 : « Une information n'apparaît que si elle risque d'être oubliée. » L'écran les tient déjà : chaque bloc se tait quand il est vide ; « Tout est réglé » arrive de lui-même et seulement quand « En suspens » est vide (f8d263b : le bouton « C'est bon pour aujourd'hui » ne changeait rien de réel, A n'y revient pas). Il respecte le budget « cinq blocs sur l'accueil au maximum ». Aucun retour d'artisan du dépôt ne met la structure en cause ; les défauts relevés sont des bugs.

## Supprimé, fusionné, ajouté, perdu
- Supprimé / fusionné : rien. Ajouté : « créé par Raph » sur les lignes de projets créés par l'autre (donnée `artisan_id` déjà chargée ; le prénom demande une jointure `profils`, RLS à vérifier).
- C4 : un rendez-vous client a « Pas fait » (feuille « Replanifier », demain même heure déjà rempli, « Le client n'est pas prévenu. »). Une note ou une tâche garde « Demain ». **Perdu : le raccourci à un geste sur les rendez-vous clients.**
- C5 : un lien par type quand des lignes des deux types sont cachées (deux lignes au lieu d'une).
- La maquette applique le langage visuel décidé (20/16/14 px, cibles 48-64, un ton de détail) : c'est le même coût pour tous les candidats, pas un changement de structure.

## Gestes (avant → après)
| Tâche | Avant | Après |
|---|---|---|
| Savoir quoi faire à 8 h 10 | 0 (lire la carte) | 0 |
| Ouvrir le devis à relire depuis « Maintenant » | 1 + ≥ 1 dans la fiche | 1 |
| Confirmer un rendez-vous fait / cocher une note | 1 | 1 |
| Relancer une facture ou un devis | 3 | 3 |
| Atteindre les factures cachées d'« En attente » | 3 (Voir les N → devis, Plus, Factures) | 1 |
| Répondre à 12 « À confirmer » en retard | 12 cartes à défiler | 5 visibles, 1 geste chacune |
| Fermer la journée : note ou tâche en suspens | 1 | 1 |
| Fermer la journée : rendez-vous client pas fait | 1 (silencieux) | 2 (Pas fait, Replanifier) |

## Impact technique
- Fichiers : `app/dashboard/page.tsx` (bornes via `debutJourParis` / `finJourParis − 1 ms` pour la requête du jour et `notesAujourdhui` ; URL du devis ; `type` sur les lignes d'attente), `components/accueil/VueAccueil.tsx` (plafond, liens typés), `Blocs.tsx` (`lienTous` devient une liste), `FermerJournee.tsx` (`clientRdv` sur `ElementSuspens`, bouton « Pas fait »), `AConfirmer.tsx` (même feuille pour « Non »). Aucune migration, aucune dépendance, aucune écriture nouvelle.
- Régression : faible. Le seul comportement qui change est C4. À tester : un rendez-vous à 01 h 30 (Paris) tombe dans le bon jour.
- Lots indépendants : **L1** C3 + C2 (page.tsx, réversible) ; **L2** C1 + C5 (affichage pur) ; **L3** C4 (seul changement de comportement) ; L4 « créé par » si le fondateur le garde.

## Auto-évaluation (sur 100)
| Critère | Note |
|---|---|
| Charge mentale (30) | 18 |
| Gestes (20) | 14 |
| Lisibilité à 360 px (20) | 14 |
| Risque technique (15) | 14 |
| Coût de migration (10) | 10 |
| Cohérence (5) | 5 |
| **Total** | **75** |

**Faiblesse 1 : l'écran ne change pas avec le moment.** 8 h 10 et 10 h 30 sont presque le même écran ; rien pour la route ni le chantier ; le soir arrive à 17 h pile, même un dimanche ; « Tout est réglé » s'affiche avec « À faire » et « En attente » encore dessous (maquette 5), ce qui dilue « La réussite se mesure le soir ». Le bureau du soir (maquette 9) n'a rien de pensé pour la conjointe.

**Faiblesse 2 : une liste de listes, avec des défauts de fond que A ne corrige pas.** Les questions sur hier (« À confirmer ») passent avant la liste d'aujourd'hui ; un rendez-vous apparaît deux fois à 10 h 30 (« Aujourd'hui » et « À confirmer ») ; « Maintenant » prend le « premier » devis dans l'ordre non trié de la base ; un projet capté ce matin reste affiché dans « À faire », contre le principe 2 ; « À faire de votre côté » fait cinq mots pour un titre de deux ou trois ; le bilan du soir se replie sur deux lignes. Chacun se corrige en quelques lignes (version « A+ ») sans changer l'écran, mais ce n'est pas A tel que défini.
