# Duel C — critique adverse (écran « Aujourd'hui »)

Je ne défends personne. Références : code au 02/10/2026.

## Recompte des gestes (le mien)

| Geste | A | B | C | D |
|---|---|---|---|---|
| 8 h 10 : journée + itinéraire | 2 | **2** (jamais compté par B) | 1 si le rdv a une adresse | 1 si adresse |
| 10 h 30 : cocher | 1, **notes seulement** (`ListeAujourdhui.tsx:70`) | 1 (idem) | 1 (idem) | 1, tâches aussi (ajout réel) |
| 18 h 45 : rdv passé | 1 | 1 | 1 | 1 |
| 18 h 45 : note en retard à reporter | 1 | **≥ 2** (aveu) | 1 | 1 |
| 18 h 45 : rdv client raté, reporter + prévenir | 2 sans prévenir ; ~6 avec | ≥ 4 ; ~8 avec | 1 sans prévenir ; ~5 avec | 1 sans prévenir ; 4 avec « Prévenir » (lot 5 facultatif) |
| Relancer une facture | 3 | 3 ; 4 derrière « Voir les N autres » | 3 le soir ; ≥ 4 le jour | 3 |

« Prévenir » = fiche, Message, modèle `decalage` (`lib/messagesClient.ts:74`), envoi (estimation).

## A — ne rien changer

1. **Sérieuse. « Tout est réglé » faux.** `suspens` = notes dues + rdv *d'aujourd'hui* (`page.tsx:473-486`). Les rdv plus anciens et « Chantier terminé ? » restent dessous (`VueAccueil.tsx:68-80`) : le repos s'affiche avec 4 à 12 questions sous lui (maquette 5). La douleur « journée qui ne se ferme jamais » reste entière.
2. **Sérieuse. C4 avertit sans agir.** « Le client n'est pas prévenu. » puis rien, alors que `decalage` existe. Le geste passe de 1 à 2 sans rien retirer ; « Non » (`AConfirmer.tsx:128-132`) déplace déjà sans prévenir.
3. **Sérieuse. Le jour ne change pas.** Rdv en double à 10 h 30 (`page.tsx:340`) ; « Maintenant » = `devisAValider[0]` d'une requête sans `order` (`:99-102,532`) ; itinéraire en 2 gestes.
4. **Mineure.** « Et N de plus. » sans lien cache les plus anciens, donc les plus oubliés. « À faire de votre côté » fait 5 mots, le bilan se replie sur 2 lignes (règles 1, 2). C5 devient caduc si « Argent » reprend « En attente du client » (duel B).

Vérifié, exact : C1 (`AConfirmer.tsx:150`), C2 (`page.tsx:533` ; la route `devis/[id]` existe), C3 (`:64-67` contre `72-74`), C5 (`VueAccueil.tsx:101`), `profils` lisible entre membres (`schema.sql:649-656`).

## B — une seule liste

1. **Bloquante. La clôture du soir n'est possible qu'en mentant.** Plus de « Demain » ni de « Non » : un rdv ou une note qui ne se fait pas ne part que par la coche. Un rdv raté coché « Fait » passe `termine`, entre dans `idsAvecRdvConfirme` et fait naître un faux « Chantier terminé ? » (`page.tsx:217,236-243`). Sinon la ligne reste au rang 1 pour toujours. Pire qu'aujourd'hui (`FermerJournee.tsx:87-104`).
2. **Sérieuse. « Maintenant » = la plus vieille ligne en retard.** Une note de 9 jours prend la carte sombre devant le rdv de 14 h ; à 18 h 45 elle dit « MAINTENANT 14h00 » (maquette). Pas d'itinéraire.
3. **Sérieuse. « Tout est réglé. » avec 6 lignes cachées** (relances, devis, « Chantier terminé ? ») derrière « Voir les 6 autres ». L'argent passe après l'agenda dès 17 h ; le bilan du soir est remplacé par des traces qui s'effacent.
4. **Sérieuse. Règles 1 et 5.** 7 lignes (aveu ; « 1 + 5 » suffisait) et une coche dans la carte « Maintenant ».
5. **Mineure.** Le « 2 j » de « Chantier terminé ? » n'existe pas : la requête ne ramène que `demande_id` (`page.tsx:125-130`). « Oui » (projet `termine`, rdv faits, timeline : `ConfirmerClotureProjet.tsx:54-77`) tient dans 56 px d'une liste qui défile.

## C — l'écran suit la journée

1. **Bloquante. « Le chantier en cours » est une devinette double.** `en_cours` n'est posé que par « Démarrer » à la main (`demandes/[id]/page.tsx:726`). « Modifié le plus récemment » lit `derniere_modification_le`, écrite seulement par notes, photos, imports (`:325,831`). Avec deux chantiers, ou sans « Démarrer », le héros de 30 px et le bouton plein sont faux ou absents de 9 h à 17 h.
2. **Bloquante. « Demain » sur rdv client sans prévenir, non traité (aveu).** C l'étend aux rdv des jours précédents, que le code excluait exprès (`page.tsx:471-472`) : un rdv d'il y a une semaine devient « demain, même heure » (`FermerJournee.tsx:67-73`). La base peut refuser (exclusion org-wide, `schema.sql:1835-1840`) : « Pas enregistré. Réessayez. » sans issue (`FermerJournee.tsx:126-133`).
3. **Sérieuse. « Non » sur « Chantier terminé ? » = le défaut de f8d263b.** `pasEncore` n'écrit rien (`ConfirmerClotureProjet.tsx:102-104`) ; « Plus tard » est un `localStorage` d'appareil, clé UTC (`:21`). Compté dans « 5 à régler. », il ne descend jamais et revient sur le PC de la conjointe.
4. **Sérieuse. Écran lié à l'heure, rendu une fois** (`page.tsx:52,75`). Une PWA rouverte à 10 h 30 montre « Dans 20 min » périmé, rien ne rafraîchit à la reprise ; à 9 h 01 pour un rdv à 9 h 30, « Y aller » disparaît quand on roule.
5. **Sérieuse. Le bureau disparaît 8 h sur 10.** Relances et devis sont derrière « Ce soir », cible non définie ; le lot 5 est « optionnel », donc 1 à 4 laissent un trou.
6. **Mineure.** « Y aller » exige `adresse_client` : le rdv n'a pas d'adresse (`schema.sql:216-227`), la requête du jour ne ramène que `nom_client` (`page.tsx:105`).

## D — la même page, du devant vers le derrière

1. **Bloquante. « Demain » déplace le rdv client à une heure qu'il n'a pas acceptée.** « Prévenir » est le lot 5, facultatif (« tient sans »), et `?message=decalage` n'existe pas (`VueProjet.tsx:136-139` : relances seulement). Lots 1 à 4 : rdv déplacé en silence, puis « Maintenant 15h · Y aller » chez un client qui ne vous attend pas. L'horizon de 14 jours aggrave.
2. **Bloquante. « À régler » absorbe « Chantier terminé ? »** (maquette 3). Même inférence fragile (`page.tsx:236-243`, aucun filtre de statut : un métré suffit), devenue dette qui bloque « Tout est réglé. » : on ferme un chantier (irréversible) ou on crée un rdv pour retrouver le repos.
3. **Sérieuse. Règle invisible « créé aujourd'hui par vous = absent ».** Le projet capté ce matin est ce qu'on oublie ce soir, et le bilan « 2 projets captés » est supprimé. Filtre par auteur = vue personnelle, que le duel A écarte (le prénom seulement).
4. **Sérieuse. Deux actions par ligne** (coche + « Demain », 328 px) : titre ≤ 170 px, deux cibles contiguës sous gants (aveu, non testé).
5. **Sérieuse. « Noter pour demain » (lot 5)** : nouvelle saisie, dictée avec repli manuel, brouillon restauré, rappel à 8 h ; absent des fichiers listés. Sans lui, aucun geste de clôture n'écrit rien de nouveau.

Vérifié, exact : 8 `if` de `determinerProchaineAction`, 11 requêtes, `toISOString().slice(0,10)` UTC (`ConfirmerClotureProjet.tsx:21`), coche sur tâche (manque réel, `ListeAujourdhui.tsx:70`).

## Ce qu'aucun candidat ne traite

- **Un « Non » qui persiste.** « Pas terminé » et « pas fait » ne s'écrivent nulle part de réel : coche mensongère, `localStorage` ou bouton qui n'écrit rien.
- **L'inférence « Chantier terminé ? »** : personne ne la restreint aux statuts `accepte` ou `en_cours`.
- **Prévenir le client à chaque report** : `decalage` existe, aucune route n'y mène (D seul, en option).
- **La conjointe à 20 h 40** : elle voit des « Fait ? » que seul le terrain tranche ; ses relances sont sous le pli (seul D met deux colonnes).
- **Duel B** : tous gardent « En attente du client » (25 à 40 % de l'écran). A le supprime d'un bloc ; B et D doivent scinder leur liste.
- **Reprise de la PWA et refus de la base sur « demain, même heure »** : aucun repli.
