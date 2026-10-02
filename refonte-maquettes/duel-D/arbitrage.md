# Duel D — Arbitrage : la fiche projet

> Juge. J'ai lu le protocole, les consignes, le brief (poids standard), `docs/langage-interface.md`, les quatre candidats, leurs rendus et la critique, puis revérifié dans le code ce qui décide (références au 02/10). Décisions amont : duel A (un seul espace, pas de vue terrain, prénom seulement si l'auteur n'est pas vous) et duel B (« Argent » en 5e case, à valider). Cet arbitrage tient dans les deux cas.

## La décision en bref

1. **Vainqueur : D, « ordre fixe, blocs qui n'existent que s'ils ont du contenu », 69,5/100.** Suivent B (55,5), C (54,5) et A (53).
2. **Trois greffes.**
   - De B : « Bien reçu » devient l'action de Maintenant.
   - De C : « Avant de chiffrer » tient en une ligne.
   - De C encore : sur le chantier, la tuile Photo est le bouton plein.
3. **Corrections imposées à D** (ce ne sont pas des greffes) :
   - la dictée ne démarre seule que sans brouillon ;
   - la tuile Photo garde le champ `capture` ;
   - Argent garde `FacturesProjet` entier et l'ancre `#facturation` ;
   - une facture se crée après une question ;
   - **le Carnet reste replié (27/09)**.
4. **Trois lots.** Le prénom vient du lot 4 du duel A. Seul le lot 2 exige un vrai Android avant livraison.

## 1. Les notes

| Critère (poids) | A | B | C | D |
|---|---|---|---|---|
| Charge mentale (30) | 4 | 6 | 5 | 7 |
| Gestes (20) | 3 | 6 | 5 | 7 |
| Lisibilité 360 px, soleil, gants (20) | 4 | 7 | 7 | 8 |
| Risque technique (15) | 9 | 4 | 5 | 6 |
| Coût de migration (10) | 10 | 4 | 6 | 6 |
| Cohérence (5) | 7 | 3 | 4 | 7 |
| **Total /100** | **53** | **55,5** | **54,5** | **69,5** |

**A.**
- *Charge 4* : six blocs, et le Carnet à 1 274 px.
- *Gestes 3* : seule la relance IA baisse.
- *Lisibilité 4* : le premier écran, c'est l'en-tête et Maintenant ; sept accents et trois cibles de 28 px restent.
- *Risque 9* : des retouches locales, mais la feuille Message a cinq appelants.
- *Coût 10.*
- *Cohérence 7* : l'écran est touché sans passer sous les règles du duel H.

**B.**
- *Charge 6* : le fil est net, mais la vue d'argent disparaît, et un bloc sans titre mêle mémo, tâches et rendez-vous.
- *Gestes 6* : photo −2, galerie enterrée sous ⋯ (7) ; « Dicter 3 » repose sur un fait faux (F1) ; « Écrire » crée une tâche.
- *Lisibilité 7* : la barre au pouce est excellente, mais ⋯, en haut à droite, porte dix fonctions.
- *Risque 4* : F1 est bloquante ; la barre globale est remplacée sur une seule page (`Sidebar.tsx:209`, `compyo:capture`, retour Android).
- *Coût 4* : onze fichiers, deux types d'entrée.
- *Cohérence 3* : plus de navigation sur la fiche ; le 27/09 est rouvert ; « Facturation », que vise le lot 4 du duel B, est retiré.

**C.**
- *Charge 5* : la forme dépend d'un `statut` que Gérard oublie, et les trois étapes ressemblent à des onglets qu'on ne peut pas toucher.
- *Gestes 5* : la prise de vue empire (12 contre 11), « retrouver » ne bouge pas, et la facture se crée en 1 appui.
- *Lisibilité 7* : un premier écran net, et le reste à facturer en 30 px.
- *Risque 5* : `prochaineAction.ts` n'est pas « tel quel », et les factures sont à remonter.
- *Coût 6.*
- *Cohérence 4* : le [+] devient « Nouveau » sur la fiche, contre le 26/09 et le duel B.

**D.**
- *Charge 7* : un ordre qu'on mémorise, et la règle 12 appliquée à la fiche ; mais deux portes d'ajout.
- *Gestes 7* : photo 5→3, dictée 5→3 (sous condition), note 4→3, retrouver 4→2 ; mais des bases gonflées (15 au lieu de 11).
- *Lisibilité 8* : quatre blocs par étape, des tuiles de 56 à 60 px ; la loupe est hors du pouce.
- *Risque 6* : F1 et le champ photo se corrigent, et les lots sont bien coupés.
- *Coût 6* : dix fichiers, aucune migration.
- *Cohérence 7* : le [+] « Ajouter », Argent et le prénom sont gardés ; le 27/09 est renversé, ce que je ne retiens pas.

**Intégrité.** Le solveur D avait vu une capture de C. Leurs points communs ont tous une source commune :
- la bande : le brief et `VueProjet.tsx:264-272` ;
- « Pas encore chiffré » : `prochaineAction.ts:213`, que B reprend aussi ;
- « photos ajoutées » : `PhotosProjet.tsx:153` ;
- le solde : `FacturesProjet.tsx:198`.

Je n'applique aucune pénalité. Mais je crédite C, pas D, pour le « reste à facturer en tête ».

## 2. Ce qui est décidé

### L'ordre des blocs : le même pour tout projet ; un bloc vide ne s'affiche pas

1. **En-tête.**
   - « ‹ Projets », la loupe (seulement si le Carnet a plus de cinq entrées), puis « … ».
   - Le nom en 30 px, puis le type et l'adresse ; « Urgent » s'écrit en mot.
   - Appeler · Message · Itinéraire, puis les cinq segments d'avancement.
2. **Maintenant.**
   - Une phrase, un détail.
   - Au plus un bouton plein et un bouton texte. Les autres secondaires vont dans « … » : Démarrer maintenant, Facturer un acompte, Dupliquer ou Repartir du devis.
3. **La bande Photo · Dicter · Note.** Elle remplace le « + Ajouter » du Carnet et l'« Ajouter » d'À faire.
4. **À faire** : les tâches et les rendez-vous à venir. Avant le devis, une seule ligne « À vérifier avant de chiffrer · 3 » (greffe C) ouvre une feuille : la demande, puis les trois listes de `Blocs.tsx:293-340`.
5. **À retenir** : le mémo seul. S'il est vide, il se crée par « … ».
6. **Argent** : la ligne du devis, puis `FacturesProjet` **entier** (payée, avoir, CSV, acompte), sous `id="facturation"`.
   - Sans le duel B, le bloc s'appelle « Devis et facture ».
   - Après la signature, l'alerte « changé depuis le devis signé » devient le détail de la ligne du devis.
7. **Carnet** : une ligne « Photos · 12 › » (la feuille actuelle : galerie, ✕), puis la recherche et les périodes. La demande et le résumé IA deviennent la plus ancienne entrée.

**Ordinateur** : la grille actuelle. À gauche, Maintenant, la bande, À faire et le Carnet ; à droite, collants, À retenir puis Argent.

Le Dossier quitte l'affichage ; aucune donnée, aucune route ne disparaît. « Déjà N chantiers ensemble » passe dans « Infos du client ».

### À 360 × 740, sans défiler

Hauteurs de la maquette D : barre du haut 48 px, en-tête 190, écarts de 12 ; la barre du bas commence à 668.

| Projet | Ce qu'on voit |
|---|---|
| **Nouveau**, juste capturé | En-tête · « Nouvelle demande. », **SMS** (plein), WhatsApp, puis « Préparer le devis » (texte) · bande · « À vérifier · 3 » · titre du Carnet |
| **Nouveau**, ensuite | En-tête · « Pas encore chiffré. », **Préparer le devis**, « Vous relisez avant l'envoi. » · bande · « À vérifier · 3 » (la demande à un appui) · titre du Carnet |
| **En chantier** | En-tête · « Chantier, jour 12. Prochain passage : lundi 8 h », sans bouton · bande, **Photo** en plein · À faire et deux lignes · titre d'À retenir. Sans passage prévu, « Terminer le chantier » (contour) s'ajoute |
| **À facturer** | En-tête · « Reste 5 075 € à facturer. », **Préparer la facture** · bande · Argent : le devis et l'acompte. S'il reste des reprises, À faire passe devant |

Un seul plein par écran ; le [+] ne compte pas. Les accents se réduisent au [+], à « Urgent » et à « Retard ».

### Photo, note, dictée : la bande, à mi-hauteur (350 à 480 px), sous le pouce

Le [+] reste « Ajouter » sur la fiche (décision du 26/09, confirmée par le duel B) : c'est la seconde porte, celle de l'habitude.

| Tâche | Aujourd'hui | Après |
|---|---|---|
| 1 photo à l'appareil · 3 photos | 5 · 11 | **3 · 9** |
| 3 photos de la galerie | 7 | 7 par le [+], 6 par « Photos · N » |
| Dicter | 5 | **3** ; 4 si le test Android échoue |
| Note écrite | 4 | **3** |
| Retrouver « la fenêtre » | ≈4 | 2 (pour les dictées seulement) |
| Terminer le chantier | 1, sans question | 2 ; 3 par « … » |
| Facturer le solde | 2 | 2 (Préparer, « Oui ») |
| Relance IA envoyée | ≈7, copier-coller | 3 (Message, Écrire avec l'IA, SMS) |

### Les greffes et les corrections

**Les greffes.**
- **(B)** Juste après une capture (`?cree=1`, téléphone connu, aucun message encore), « Bien reçu » remplace la carte séparée (`VueProjet.tsx:296-320`) et devient le plein. D perdait ce rappel.
- **(C)** « Avant de chiffrer » tient en une ligne.
- **(C)** En `en_cours`, Photo est pleine. L'action la plus probable prend la place que D donnait à « Terminer », un geste irréversible.

**Les corrections imposées.**
- **La dictée.** Elle ne démarre à l'ouverture que si aucun brouillon n'est restauré : sinon `demarrer()` l'efface (`NotesVocales.tsx:60-86`, `:111`). `abort()` à la fermeture.
- **La photo.** Le champ `capture="environment"` (`PhotosProjet.tsx:188-196`) sort de la feuille, qui rend `null` une fois fermée (`Feuille.tsx:89`) ; l'envoi, l'erreur et « Réessayer » remontent avec lui. Je refuse le pari d'un champ unique pour l'appareil et la galerie.
- **La facture.** Elle se crée après « Facture de solde : 5 075 € ? ». Aujourd'hui, c'est un appui, sans question (`FacturesProjet.tsx:87`).
- **Terminer.** « Chantier terminé ? », depuis Maintenant comme depuis « … » (`VueProjet.tsx:242`), sans « Annuler ».
- **Le message.** `FeuilleMessageClient` reçoit une prop optionnelle « Écrire avec l'IA », que seule la fiche passe. La feuille IA (`page.tsx:1236-1259`) garde son champ éditable ; « Copier le texte » devient SMS et WhatsApp, et « Copier » reste en bouton texte.
- **Rien ne se perd.** Le mémo et le texte IA retouché passent par `lib/brouillonLocal.ts`. Aucune promesse « la photo reste dans la galerie » tant qu'elle n'est pas vérifiée.

### Le coéquipier, le duel B, le 27/09

- **Le coéquipier** voit la même fiche, avec les mêmes montants. Le Carnet ajoute « Gérard · note dictée » quand l'auteur n'est pas lui ; c'est le lot 4 du duel A. L'artisan seul n'en voit jamais.
- **Le duel B, validé ou non.** S'il est validé : Argent, comme la 5e case, et « Facturer » arrive sur `#facturation`. Sinon : « Devis et facture », et « Plus » reste. La fiche ne dépend de rien d'autre.
- **Le Carnet replié (27/09) : je ne le renverse pas.**
  - B et D répondent par un autre argument que celui d'Axel (« pour que la fiche reste propre », `Carnet.tsx:200-205`).
  - Ce serait le troisième changement en six jours, et c'est la recherche qui sert à retrouver.
  - Seule précision : une période unique s'ouvre (projet neuf).
  - Ouvrir la dernière période (5 lignes) reste une **décision du fondateur à confirmer**.

## 3. La dissidence : ce qui reste valable contre D

- **A.** Dix fichiers sur l'écran le plus ouvert, et des gains suspendus à deux paris d'appareil. S'ils échouent, D revient à A dans un autre ordre.
- **B.** Plus riche qu'un fil : jusqu'à six blocs sur un gros chantier, deux portes d'ajout, et une loupe hors du pouce.
- **C.** La greffe Photo dépend de `en_cours`. Un projet jamais « démarré » garde ses tuiles en contour : sans gravité, mais la fiche reste à la merci du statut.
- **La critique (F3).** La recherche ignore le mémo, les tâches actives et les lignes de devis. « Ce qui avait été convenu » n'est retrouvable que s'il a été dicté.

## 4. Ce qui me ferait changer d'avis

- **Un Android d'entrée de gamme** qui recharge l'onglet au retour de l'appareil photo plus d'une fois sur dix : Photo revient dans la feuille, et le lot 2 se réduit à la dictée.
- **Des testeurs** qui n'utilisent que le [+] après deux semaines : la bande saute, et les tuiles directes passent dans la feuille du [+] (4 gestes).
- **Un chiffre en base** : plus de 30 % des projets encore `accepte` alors que leur premier passage est échu. Photo devient alors pleine dès `accepte`.
- **Des testeurs** qui ouvrent la première période du Carnet à chaque visite : je recommande de l'ouvrir.

## 5. Les lots, dans l'ordre

1. **Même écran, sans pièges.**
   - Ce que fait le lot :
     - les questions avant Terminer et avant la facture ;
     - les brouillons du mémo et du texte IA ;
     - une seule entrée « Message » ;
     - Maintenant limité à un plein et un bouton texte, le reste dans « … » ;
     - les règles 3, 4, 9 et 17 (`Blocs.tsx:133,286,418` passent à 48 px).
   - Fichiers : `VueProjet.tsx`, `Blocs.tsx`, `EnTeteProjet.tsx`, `prochaineAction.ts`, `FeuilleMessageClient.tsx`, `[id]/page.tsx`, `FacturesProjet.tsx`.
   - Risques :
     - les cinq appelants de la feuille Message, et les bancs `apercu-moins` et `apercu-guide` ;
     - une action secondaire oubliée hors de « … » ;
     - le geste retour sur les questions.
2. **Les trois gestes directs** (vrai Android obligatoire).
   - Ce que fait le lot : la bande, Photo pleine en `en_cours`, le champ `capture` remonté, la dictée à l'ouverture (protégée), et deux portes en moins.
   - Fichiers : `VueProjet.tsx`, `PhotosProjet.tsx`, `NotesVocales.tsx`, `Blocs.tsx`, `[id]/page.tsx`.
   - Risques :
     - le brouillon effacé ;
     - le micro resté ouvert ;
     - `signalerModification()` appelé à chaque photo (`page.tsx:1069,1086`).
3. **Argent et Carnet.**
   - Ce que fait le lot :
     - le Dossier devient Argent, avec l'ancre gardée ;
     - « Photos · N » ;
     - la demande devient une entrée du Carnet ;
     - la ligne « À vérifier » ;
     - « Bien reçu » dans Maintenant ;
     - « Reste X € », que `FacturesProjet` remonte par un rappel, sans second chargement ;
     - la loupe ; le Carnet reste replié.
   - Fichiers : `Blocs.tsx`, `VueProjet.tsx`, `entreesCarnet.ts` (fonctions pures), `Carnet.tsx`, `prochaineAction.ts`, `FacturesProjet.tsx`, `EnTeteProjet.tsx`.
   - Risques :
     - une fonction de facturation sans place ;
     - le lot 4 du duel B ;
     - le banc `apercu-moins?ecran=fiche-*`.

**Avant de livrer le lot 2, sur 2 ou 3 Android d'entrée de gamme** (2 à 3 Go, Android 11 à 14, Chrome et Samsung Internet), en 4G faible, avec des gants :
1. Le champ `capture`, hors de la feuille, ouvre l'appareil arrière, et l'onglet survit au retour.
2. Trois prises de suite : « 3 photos ajoutées », puis « Pas enregistré · Réessayer ». La photo est-elle dans la galerie ?
3. L'écoute à l'ouverture : la permission la première fois, puis l'erreur `network` et le repli « Écrire à la place ».
4. Le geste retour ferme la feuille **et** coupe le micro.
5. Un appel pendant la dictée : le brouillon revient, et l'écoute ne repart pas.
6. Pour tous les lots : les 740 px avec la police Android à 115 % et à 130 %.

## 6. Ce que le fondateur doit trancher (hors code)

1. **Le Carnet du 27/09** : il reste replié. Ouvrir la dernière période serait un renversement, à confirmer.
2. **Le mot de la troisième tuile** : « Note » (le libellé actuel) ou « Rappel » (ce que la tuile crée vraiment, F3).
3. **Le titre du bloc** : « Argent » ou « Devis et facture », selon le duel B.
4. **L'alerte « changé depuis le devis signé »** pendant le chantier : la garder sur la ligne du devis, ou ne l'afficher qu'avant le démarrage ?
5. **« Chantier terminé » est sans retour** (`page.tsx:754`). Faut-il promettre « Rouvrir le chantier » dans « … » ? Ce serait une écriture nouvelle.
6. **Les textes des deux questions** : « Chantier terminé ? » et « Facture de solde : 5 075 € ? ».
