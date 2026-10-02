# Duel C — arbitrage : l'écran « Aujourd'hui »

**Verdict.** **D gagne, corrigé sur deux points non négociables** : aucun rendez-vous client n'est déplacé sans message préparé, et « Chantier terminé ? » se ferme par une vraie écriture. A sert de filet : ses corrections sont le lot 1. J'ai vérifié dans le code (02/10/2026) les affirmations de la critique qui comptent pour la décision : elles sont toutes exactes.

## 1. Notes (poids standard)

| Critère (poids) | A — rien changer | B — une liste | C — les moments | D — devant / derrière |
|---|---|---|---|---|
| Charge mentale (30) | **4** : le soir, deux grammaires pour un même rdv passé (Oui/Non s'il date d'hier, Fait/Demain s'il date d'aujourd'hui) ; « Tout est réglé » posé sur des questions (`VueAccueil.tsx:66-80`) | **4** : un rdv raté ne sort qu'en cochant « Fait », donc en mentant ; « Maintenant » = la plus vieille dette | **5** : un héros très clair quand il est juste ; sinon, le chantier deviné et le bureau caché 8 h sur 10 | **7** : une règle de présence, une liste de dettes, un repos qui est un état vrai |
| Gestes (20) | **5** : itinéraire en 2, note à demain en journée en ≥ 4, C4 en 2 sans prévenir | **4** : Demain ≥ 2, rdv raté ≥ 4, relances derrière « Voir les N » le soir | **7** : itinéraire 1, photo 2 ; relance ≥ 4 le jour | **8** : itinéraire, devis, report, confirmation en 1 |
| Lisibilité 360 px (20) | **6** : bilan sur deux lignes, titre de 5 mots | **6** : 7 lignes (règle 1), coche dans la carte (règle 5) | **7** : un titre de 30 px qui répond | **6** : deux actions par ligne, titres coupés à ~170 px |
| Risque (15) | **9** : seul C4 change un comportement | **4** : la chaîne de clôture disparaît, faux « Chantier terminé ? » | **3** : bascules d'heure, PWA figée à la reprise, rdv d'il y a une semaine reporté en 1 appui | **5** : réécrit le soir, la seule zone qui a déjà dû reculer (f8d263b) |
| Migration (10) | **10** : quelques lignes | **5** : tri pur et liste neuve | **4** : trois vues, plus `?ajouter` dans `VueProjet` | **6** : `page.tsx` restructurée, un `ARegler` |
| Cohérence (5) | **6** : `Card` ombrées dans `AConfirmer`, deux vocabulaires | **4** : écarts assumés aux règles 1 et 5 | **4** : l'écran change de forme selon l'heure | **7** : recettes ligne, trace et repos du langage |
| **Total / 100** | **60,5** | **45** | **53,5** | **66** |

## 2. Le vainqueur, ses greffes, mes corrections

**Trois greffes sur D :**
1. **De A, « Pas fait » sur un rdv client.** Il ouvre la feuille « Déplacer », avec demain à la même heure déjà rempli. Il remplace le « Demain » en un appui de D, qui déplace le client en silence (ce que fait déjà `FermerJournee.tsx:98-103`).
2. **De B, « Voir les N » qui s'ouvre sur place.** Une liste mêlée n'a pas de page « tout voir », et cela tient avec ou sans l'écran Argent du duel B.
3. **De C, le rdv en cours reste « Maintenant » jusqu'à sa fin estimée** (`duree_minutes`, sinon 60 min). C'est le chantier où l'on est, lu dans le planning, pas deviné.

**Mes corrections** (des défauts de D, pas des greffes) :
- **Après « Déplacer », la feuille enchaîne sur le message au client.**
  - On réutilise `FeuilleMessageClient`, déjà monté hors de la fiche (`AgendaMobile.tsx:326`).
  - Le modèle `decalage` reçoit la nouvelle date. Sans ça, il annoncerait comme décalée la date qu'on vient de fixer (`messagesClient.ts:74,235,267-269`).
  - Si l'artisan ferme la feuille, la trace garde « Prévenir ».
- **« Chantier terminé ? » seulement après un rdv fait postérieur à l'envoi d'un devis**, ou sur un projet accepté ou en cours. Aujourd'hui, un métré suffit (`page.tsx:236-243`).
  - « Pas encore » écrit un événement `chantier_pas_termine` : le type est libre (`schema.sql:294`), il n'y a pas de migration.
  - La question ne revient qu'après un fait nouveau.
  - Le « Plus tard » en `localStorage`, avec sa clé en UTC, disparaît (`ConfirmerClotureProjet.tsx:20-39`).
- **Une ligne relancée se tait 7 jours.** Aujourd'hui, relancer ne retire rien (`page.tsx:270-287`) : la liste ne se viderait jamais. Le signal existe déjà, c'est la trace `message_prepare` (`FeuilleMessageClient.tsx:93-123`), à laquelle on ajoute `devis_id`.
- **Retirés de D :**
  - « créé aujourd'hui par vous = absent » : c'est une vue personnelle, contraire au duel A ;
  - l'horizon de 14 jours ;
  - « Noter pour demain » : une saisie de plus, qui double le « + ».

**Chaque geste écrit quelque chose de réel :**

| Geste | Ce qu'il écrit |
|---|---|
| ✓ | la note ou l'événement passe à fait |
| Demain (note, tâche) | la date passe au lendemain |
| Déplacer | la nouvelle date, puis le message préparé |
| Sans nouvelle date | `annule`, puis le modèle `decalage` actuel |
| Oui (chantier) | la clôture existante |
| Pas encore | `chantier_pas_termine` |
| Relancer | le message préparé |

« Tout est réglé. » n'est jamais un geste.

## 3. La structure finale de l'écran

**La règle de présence** remplace les 8 `if` de `page.tsx:507-561`. Une ligne existe seulement dans trois cas :
- **(a)** son heure va passer aujourd'hui ;
- **(b)** son heure est passée sans réponse ;
- **(c)** un dossier attend un geste de l'artisan : cadrer, chiffrer, relire, envoyer, ou relancer (seuils actuels, devis à 5 j et facture échue à 3 j, sans relance depuis 7 j).

Le reste, comme un devis envoyé il y a 3 jours ou une facture non échue, vit dans Devis, Factures ou Argent.

| # | Bloc | Il apparaît si… | Lignes et actions |
|---|---|---|---|
| 0 | En-tête | toujours | la date ; « Bonjour Gérard », puis « Bonsoir » dès 17 h (Paris) |
| 1 | **Maintenant** (carte sombre, un lien) | 1. un rdv en cours ; sinon 2. le prochain rdv du jour ; sinon 3. **avant 17 h**, la 1re ligne d'« À suivre » ; sinon rien | heure, client, adresse, et « Y aller » (`EnTeteProjet.tsx:225`) s'il y a une adresse ; jamais de coche ; jamais répété plus bas |
| 1 bis | **Tout est réglé.** (à sa place) | dès 17 h, si les blocs 2 et 3 sont vides | pastille verte, puis « Demain · 8h30 · M. Durand · 14 rue des Lilas » |
| 2 | **Aujourd'hui** (devant) | un rdv, une tâche ou une note dont l'heure n'est pas passée ; un rdv fini depuis moins de 60 min y reste, en tête (`page.tsx:198`) | heure, titre, détail ; coche sur les notes **et les tâches** (les notes seulement aujourd'hui : `ListeAujourdhui.tsx:70`) |
| 3 | **À régler** (derrière) | un rdv ou une tâche passés et non confirmés (sans horizon), une note en retard, un « Chantier terminé ? » | le plus récent d'abord ; note ou tâche : ✓ et Demain ; rdv : ✓ et Pas fait ; chantier : Oui et Pas encore ; une trace après chaque geste (« Fait : … · Annuler », « Déplacé au ven. 14h · Prévenir », « Pas encore · Planifier ») |
| 4 | **À suivre** | cas (c) | le plus ancien d'abord (« 12 j ») ; Relancer en colonne de fin ; Relire et Envoyer ouvrent `/dashboard/devis/[id]` ; prénom de l'auteur quand ce n'est pas vous |

Chaque bloc montre 5 lignes au plus, puis « Voir les N », qui s'ouvre sur place (le planning, pour « Aujourd'hui »). Il y a 4 blocs au plus : la règle 1 est tenue.

**Matin, journée, soir : la même page, le contenu glisse.**
- **8 h 10** : Maintenant montre le premier rdv avec « Y aller » ; dessous, le reste du jour et les restes d'hier.
- **10 h 30** : Maintenant montre le rdv en cours ; le rdv fini glisse dans « À régler » une heure après sa fin, sans doublon ; s'il ne reste aucun rdv, le dossier le plus ancien prend sa place.
- **18 h 45** : plus de dossier en vedette ; quand rien n'est ni devant ni derrière, le repos apparaît, et « À suivre » reste dessous.

**Les autres cas.**
- **Jour vide** : « Rien d'urgent. » et la ligne « Demain ». Le second « Nouveau projet » disparaît, sauf au tout premier projet.
- **Coéquipier** : le même écran (l'espace partagé du duel A), avec le prénom de l'auteur seulement.
- **Sylvie, 20 h 40, sur ordinateur** : deux colonnes ; à gauche, Maintenant ou le repos, Aujourd'hui et À régler ; à droite, À suivre.
- **Duel B validé ou non** : l'accueil ne change pas. Argent montre tout l'argent, y compris les lignes sans geste, avec la même fonction de calcul.

**Retirés de l'accueil (rien en base)** :
- la carte « Fermer la journée » et son bilan (une requête, `page.tsx:157-164`) ;
- la chaîne « Oui → terminé ? → planifier ? » (`AConfirmer.tsx:67-116`) ;
- le formulaire de replanification en ligne ;
- les titres « À faire de votre côté » et « En attente du client ».

| Gestes | Avant | Après |
|---|---|---|
| Itinéraire du prochain rdv | 2 | 1 |
| Relire le devis du jour | 2-3 | 1 |
| Note à demain, en journée | ≥ 4 | 1 |
| Rdv client raté : déplacer et prévenir | 1 sans prévenir, ~6 avec | 4 (Pas fait, Déplacer, SMS, Envoyer) |
| Chantier pas fini | 2, et la question revient demain | 1 |
| Relancer | 3 | 3, puis la ligne se tait 7 j |

## 4. Dissidence (valable contre le vainqueur)

- **A.** On réécrit le soir. C'est pour ça que les lots 1 à 3 se livrent sur l'écran actuel, et que seul le lot 4 change une habitude.
- **B et la critique.** Deux cibles contiguës sous des gants, et des titres coupés : ce n'est pas testé. L'écran actuel a déjà ce défaut (`FermerJournee.tsx:190-211`).
- **B.** Un jour chargé, au téléphone, l'argent passe sous le pli. Il n'est rattrapé que par Maintenant avant 17 h, et par la colonne de droite sur ordinateur.
- **C.** À 10 h 30, sur le chantier, l'écran montre du travail de bureau qu'on ne peut pas faire. Et le matin ressemble à la journée.
- **La critique.** Sylvie voit des « Fait ? » que seul le terrain peut trancher, donc son repos dépend de Gérard. De même, Lucas voit le rdv de Gérard en Maintenant (conséquence du duel A).

## 5. Ce qui me ferait changer d'avis

- **Un test au soleil, avec des gants, sur 5 artisans** : plus d'un appui raté sur 5 entre ✓ et Demain ou Pas fait. Alors : une seule colonne, et le report passe dans une feuille.
- **La base, avant le lot 4** : plus de 10 rdv `a_faire` de plus de 14 jours par organisation, en médiane. « À régler » ne se viderait jamais ; il faudrait une question unique de rattrapage.
- **Le lot 2 après 2 semaines** : plus de 80 % des feuilles de message fermées sans envoi. Les artisans préviennent par téléphone ; on garde « Prévenir » dans la trace, sans l'enchaînement.
- **Des artisans, ou la conjointe, disent regarder le bilan du soir** : il revient, en une ligne sous le repos.

## 6. Les lots (chacun laisse l'application cohérente)

1. **Corrections, sans changer la structure.**
   - Ce que fait le lot :
     - les bornes du jour en heure de Paris (`page.tsx:64-67`, utilisées en `:108` et `:260`) ;
     - les liens vers le devis (`:533,537`, `VueAccueil.tsx:91`) ;
     - le plafond de 5 lignes sur « À confirmer » ;
     - plus de rdv en double (`page.tsx:246-249`) ;
     - `adresse_client` dans la requête du jour (`:105`) ;
     - un `RafraichirAuRetour.tsx` (`router.refresh()` au retour après plus de 5 min ; aucun écouteur aujourd'hui).
   - Risques : un rdv entre 0 h et 2 h ; un rafraîchissement pendant qu'une feuille est ouverte.
2. **Aucun rdv client déplacé en silence.**
   - Ce que fait le lot :
     - un `FeuilleDeplacer.tsx` neuf, branché sur le « Non » d'`AConfirmer.tsx:223` et sur le « Demain » des rdv (`FermerJournee.tsx:199-211`) ; les tâches gardent « Demain » ;
     - `decalage` reçoit `nouvelleDate`, et `prioritaire` accepte `decalage` (tests purs) ;
     - l'enchaînement vers `FeuilleMessageClient`.
   - Risques : un refus pour chevauchement (`schema.sql:1835-1840`) ; dans ce cas, la feuille reste ouverte avec « Déjà pris à cette heure. ». Un rdv sans projet n'a pas de message.
3. **« Chantier terminé ? » honnête.**
   - Ce que fait le lot :
     - `page.tsx:123-130` (ajouter `date_heure`), `:139-144` (ajouter le type) et `:236-243` ;
     - « Pas encore » dans `ConfirmerClotureProjet.tsx`, et le `localStorage` retiré ;
     - le type dans `types/index.ts:276`, masqué au carnet.
   - Risque : un chantier dont le devis a été fait hors de Compyo n'est plus jamais proposé à la clôture.
4. **La structure D.**
   - Ce que fait le lot :
     - `page.tsx` : la partition devant / derrière, Maintenant en 3 règles, la pause de 7 j (une requête `message_prepare` à la place de celle du bilan) ;
     - `VueAccueil.tsx`, et un `ARegler.tsx` neuf qui absorbe `FermerJournee`, `AConfirmer` et `ConfirmerClotureProjet` sur l'accueil ;
     - `Blocs.tsx` (deux colonnes de fin, ouverture sur place) et `ListeAujourdhui.tsx` (coche sur les tâches) ;
     - `devis_id` dans `tracerMessagePrepare` ;
     - les bancs `app/apercu-moins` et `app/apercu-guide`, qui importent `FermerJournee` ;
     - le guide (`lib/guide/contenu.ts:207-209`) et sa capture.
   - Risques : la trace doit vivre dans un parent toujours monté, sinon `router.refresh()` l'efface ; la règle de Maintenant.
5. **L'auteur, avec le module 48 du duel A.**
   - Ce que fait le lot : « · Lucas » quand `artisan_id` n'est pas vous, par une jointure sur `profils` (lisible entre membres : `schema.sql:649-656`).
   - Risque : un ancien membre n'affiche rien.

## 7. Décisions du fondateur (hors code)

1. **Les titres des blocs** : « À régler » et « À suivre ».
2. **Le texte du décalage avec une nouvelle date** : « Bonjour, je dois décaler notre rendez-vous du 2 octobre. Je vous propose le 3 octobre à 14h. Cela vous convient-il ? »
3. **Le bilan du soir disparaît**, alors que la vitrine promet « Votre journée… le résumé est prêt » (`TelephoneSoir.tsx:26`). Faut-il retirer la promesse, ou garder une ligne de bilan ?
4. **Les réglages fixes** : 17 h tous les jours, dimanche compris, et la pause de 7 jours après une relance.
5. **Ce que voit le coéquipier** : faut-il accepter que Maintenant montre le prochain rdv de toute l'équipe ?
