# Décisions de la refonte : les duels de l'arène

*Branche `refonte-app`. Chaque duel a son dossier dans `refonte-maquettes/duel-<X>/` :*
- *le brief ;*
- *les candidats (maquette `.html` à 360 px et argumentaire `.md`) ;*
- *les rendus PNG, hors dépôt, régénérables par `refonte-maquettes/outils/captures.mjs` ;*
- *la critique adverse ;*
- *l'arbitrage complet.*

*Ce document en est le résumé.*

## Comment l'arène a été conduite

Le skill `arena-mode` est installé, mais seul le fondateur peut le déclencher : il porte `disable-model-invocation`. Le même protocole a donc été appliqué à la main, avec des agents indépendants (`refonte-maquettes/_commun/protocole.md` et `critique-et-arbitrage.md`) :

1. **Un brief par duel.** Le problème, la douleur citée, l'état réel du code (vérifié par cinq inventaires préalables, `refonte-maquettes/_inventaire/`), les contraintes et les critères pondérés.
2. **Quatre solveurs isolés par duel.** Aucun ne voit le travail des autres. Ce sont toujours :
   - A : ne rien changer ;
   - B : le plus soustractif ;
   - C : une logique différente ;
   - D : libre.
3. **Un critique adverse** attaque tous les candidats, revérifie leurs affirmations dans le code et recompte les gestes.
4. **Un juge** (le modèle le plus fort) note sur les 6 critères. Il désigne un vainqueur, lui greffe au plus trois éléments pris aux perdants, et consigne la dissidence, ce qui le ferait changer d'avis, et les lots.

**Critères et poids :** charge mentale 30 · gestes 20 · lisibilité 20 · risque 15 · migration 10 · cohérence 5. Les poids sont ajustés pour les duels A et B (voir leur brief).

---

## Duel H : le langage visuel et tactile

**Problème.** Deux générations de design coexistent : 26 tailles de texte, 8 recettes de carte, aucun état hors-ligne, aucun retour tactile. Tous les autres écrans s'appuieront sur ce langage.

**Candidats.**
- A : formaliser l'existant, 59.
- B : 2 tailles, 1 carte, 1 plein, 49.
- C : « gros boutons de chantier », listes plein écran, 60.
- **D : synthèse, 66.**

**Vainqueur : D, amendé.**
- **Ce qu'il fait :** il garde la « génération 2 » (accueil, fiche, listes) et la réduit à :
  - 5 tailles Tailwind par défaut et 2 tons de texte ;
  - une seule recette de ligne et un seul bouton plein par écran ;
  - le terracotta plein réservé au « + » ;
  - une grammaire d'états unique, et le soulagement en trois temps : fait, trace, repos.
- **Retiré de D :**
  - le script de contrôle au build ;
  - les nouveaux noms de taille ;
  - « Chantier terminé · Annuler » ;
  - la promesse « vos saisies sont gardées » (fausse : aucune écriture n'est mise en file) ;
  - le minuteur de la trace.
- **Greffes :**
  - l'application au fil de l'eau (de A) ;
  - l'erreur qui reste dans la ligne avec « Réessayer » (de B) ;
  - l'appui visible par la couleur sur toute la ligne (de C).

**Livrable :** [`docs/langage-interface.md`](langage-interface.md), 18 règles avec des exemples bons et mauvais tirés du code.

**Dissidence valable.**
- « Un seul plein par écran » plie sur l'accueil : « Maintenant » et « Oui » font deux masses sombres. C'est une exception assumée.
- Cinq tailles, ce n'est pas vraiment « très grand / très petit ».
- La lisibilité au soleil n'a pas été testée.

**Ce qui ferait changer d'avis.** Un test au soleil avec des gants. Si le détail en 14 px ne se lit pas, on passe à l'échelle de C, sans rien sous 16 px.

**Lots.**
1. Document, cibles de 48 px, squelettes `motion-safe` : fait.
2. États (erreur, chargement, hors-ligne) : fait.
3. Retours tactiles et soulagement : après le duel C.
4. Boutons et surfaces : attend la décision du fondateur sur la couleur de l'action principale.
5. Migration écran par écran.

Arbitrage complet : `refonte-maquettes/duel-H/arbitrage.md`.

---

## Duel A : le modèle d'équipe *(point d'arrêt : en attente de validation)*

**Problème.** Une organisation, deux rôles, tout le monde voit tout, rien ne dit qui a fait quoi, deux interfaces d'équipe. Sous le capot, une dizaine de failles (inventaire 03).

**Candidats.**
- **A : un seul espace partagé, failles corrigées, 70.**
- B : une seule personne en plus, sans rôle, 59,5.
- C : terrain / bureau avec restriction en base, 43.
- D : « porte de chantier » sans compte pour le coéquipier, 44.

**Vainqueur : A, avec trois greffes.**
- **L'auteur sur le carnet** (de B) : « créé par Raph », seulement quand ce n'est pas vous. L'artisan seul n'en voit jamais.
- **Une invitation qu'on accepte** (de B) : plus de rattachement direct. La réponse est identique que l'adresse ait un compte ou non. WhatsApp sert à prévenir, avec un texte préparé, sans lien.
- **La matrice d'isolation** (de C), rejouée sur une copie de la base avant chaque migration.

**Corrections imposées à A :**
- aucun fichier n'est déplacé : les nouveaux vont sous `{organisation}/{auteur}/…`, et les anciens sont rattachés par une table ;
- l'IBAN est vraiment protégé ;
- la signature publique ne peut plus être appelée en direct ;
- les notifications ne cassent plus sur un ordinateur partagé.

**Réponses tranchées :**
- un espace unique, aucun rôle affiché ;
- tout le monde voit tout, ce que l'invitation dit en une ligne ;
- le coéquipier capte, valide et écrit au client depuis son propre téléphone ;
- l'e-mail reste le canal d'identité ;
- multi-organisation écartée explicitement, expert-comptable toujours prématuré (l'export existe) ;
- à la sortie, rien n'est perdu : les clés passent en `NO ACTION`, une table `anciens_membres` garde le nom, les rappels vont au propriétaire ;
- tarif inchangé : un siège payant doublerait le prix d'un couple, c'est au fondateur de décider.

**Pourquoi pas C ou D.**
- C rouvrait une faille de la classe F2 (compte créé sans preuve de la boîte mail), oubliait les photos partagées dans son stockage par chantier, et touchait environ 40 fichiers sans aucun test.
- D ouvrait cinq fonctions aux visiteurs anonymes, un lien qui n'expire jamais une fois ouvert, et un cache hors ligne qui survit au retrait.

**Dissidence valable.**
- Un salarié hors famille voit les prix et le bilan : la confiance reste sociale.
- L'e-mail est fragile pour ce public.
- Il n'y a pas de transfert de propriété dans l'interface.

**Ce qui ferait changer d'avis.**
- Deux artisans sur cinq ayant un salarié refusent qu'il voie les prix : on ajoute une restriction par tables séparées, jamais par masque.
- Plus de 30 % des invitations restent en attente au-delà de 48 h : on passe au lien WhatsApp lié à l'adresse.

**Migrations (45 à 52) et lots (0 à 8)** : voir la synthèse du point d'arrêt et `refonte-maquettes/duel-A/arbitrage.md` (§ 4 à 7).

---

## Duel B : la navigation *(point d'arrêt : en attente de validation)*

**Problème.** Il y a 10 destinations sur téléphone, dont 7 de même poids derrière « Plus ». Devis et Factures doublent l'accès aux documents du projet. Rien ne répond à la question de la conjointe le soir : « qu'est-ce qui est à relancer, à facturer ? ».

**Candidats.**
- A : ne rien changer, sauf Guide et Carte mentale hors navigation, 65,5.
- B : 3 destinations et [+], le compte derrière un avatar, 56.
- C : Aujourd'hui · Projets · Bureau, le Planning sort de la barre, 48,5.
- **D : « Argent » à la 5e case, le compte derrière un avatar, 67,5.**

**Vainqueur : D.**
- **La barre :** Aujourd'hui · Projets · [+] · Planning · Argent. L'avatar ouvre Paramètres, Guide et Avis.
- **La page Argent :** le total à encaisser, « En attente du client » avec Relancer, « Devis à envoyer », plus tard « À facturer », et en pied les listes complètes.
- **Greffes :**
  - « Une note ou un rappel » dans le [+] (de B) ;
  - Paramètres à un clic sur ordinateur (de C) ;
  - la Carte mentale sort de l'application (de A).
- **Corrections dues aux duels A et H :**
  - ni vue réduite ni « Mon équipe » ;
  - une seule colonne ;
  - aucune pastille.

**Gestes.** Relancer hors de l'accueil passe de 7 à 4. Voir tout ce qu'on me doit tient en 1 geste. Aucune tâche ne coûte plus cher.

**Dissidence valable.**
- A perd de 2 points : rien de mesuré ne montre que « Plus » gêne.
- L'avatar est hors de portée du pouce.
- Argent répète des lignes d'Aujourd'hui.
- « À facturer » dépend du oui / non de fin de chantier.

**Ce qui ferait changer d'avis.**
- Les visites de `/dashboard/devis|factures|notes|bilan`, déjà mesurées dans `visites`.
- Une vraie conjointe qui ne trouve pas ses factures sous « Argent » en dix secondes.
- Des artisans seuls qui regrettent « Plus » : on s'arrête alors au lot 2.

**Lots.**
1. Le compte en haut.
2. La page Argent, en ajout.
3. La bascule, réversible.
4. « À facturer ».

Arbitrage complet : `refonte-maquettes/duel-B/arbitrage.md`. Synthèse pour validation : [`docs/point-arret-equipe-navigation.md`](point-arret-equipe-navigation.md).

---

## Duel C : l'écran « Aujourd'hui »

**Problème.** L'écran doit répondre à une seule question, « qu'est-ce que je dois faire ? », le matin, sur le chantier et le soir, sans geste de clôture qui ne change rien (leçon de `f8d263b`).

**Candidats.**
- A : l'écran actuel avec les bugs corrigés, 60,5.
- B : une seule liste de 7 lignes, 45.
- C : l'écran change avec l'heure, 53,5.
- **D : « devant / derrière », 66.**

**Vainqueur : D.**
- **Les blocs :** l'en-tête, puis Maintenant (ou « Tout est réglé. » dès 17 h), puis Aujourd'hui (ce qui est devant), À régler (ce qui est derrière : passé non confirmé, notes en retard, « Chantier terminé ? »), et À suivre (les dossiers qui attendent un geste).
- **Le volume :** 4 blocs, 5 lignes chacun.
- **Les moments :** c'est la même page du matin au soir, seul le contenu glisse.
- **Greffes :**
  - « Pas fait » ouvre une feuille « Déplacer » préremplie (de A) ;
  - « Voir les N » s'ouvre sur place (de B) ;
  - le rendez-vous en cours reste « Maintenant » (de C).
- **Corrections :**
  - un rendez-vous déplacé enchaîne toujours sur le message au client, avec la nouvelle date ;
  - « Chantier terminé ? » ne se pose qu'après un rendez-vous fait postérieur à un devis envoyé, et « Pas encore » s'écrit en base ;
  - une ligne relancée se tait 7 jours.
- **Retiré de D :**
  - le filtre « créé par vous » (contraire au duel A) ;
  - l'horizon de 14 jours ;
  - « Noter pour demain ».

**Dissidence valable.**
- Deux actions par ligne avec des gants : non testé.
- L'argent passe sous la ligne de flottaison un jour chargé.
- Des « Fait ? » que la conjointe ne peut pas trancher.
- Le rendez-vous de Gérard apparaît en Maintenant chez le coéquipier.

**Ce qui ferait changer d'avis.** Des artisans qui ne trouvent plus leurs relances le soir : on remonterait « À suivre » au-dessus d'« À régler » après 17 h.

**Lots.**
1. Corrections : bornes du jour en heure de Paris, lien du devis, plafond, doublon, rafraîchissement au retour. **Fait : `ac10567`.**
2. Plus aucun rendez-vous client déplacé en silence. **Fait : `6a2f1c0`.**
3. Un « Chantier terminé ? » honnête. **Fait : `a30f12d`.**
4. La structure D.
5. L'auteur, avec le duel A.

Arbitrage complet : `refonte-maquettes/duel-C/arbitrage.md`.

---

## Duel D : la fiche projet

**Problème.** À 360 px, on ne voit que l'en-tête et « Maintenant ». Le Carnet commence à 1 274 px. Photo, note et dictée demandent environ 5 gestes. Deux feuilles portent le même titre « Message au client ».

**Candidats.**
- A : l'existant corrigé, 53.
- B : le Carnet comme fil unique, 55,5.
- C : la fiche change selon l'étape, 54,5.
- **D : ordre fixe, un bloc vide ne s'affiche pas, 69,5.**

**Vainqueur : D.**
- **L'ordre :** en-tête, puis Maintenant (au plus un bouton plein et un bouton texte, le reste dans « … »), puis la bande Photo · Dicter · Note sous le pouce, puis À faire, À retenir, Argent (le devis et `FacturesProjet` entier, avec l'ancre `#facturation`), et enfin le Carnet.
- **Greffes :**
  - « Bien reçu » devient l'action de Maintenant juste après une capture (de B) ;
  - « À vérifier avant de chiffrer » tient en une ligne (de C) ;
  - Photo devient le bouton plein en chantier (de C).
- **Corrections :**
  - la dictée ne démarre seule que sans brouillon à restaurer ;
  - le champ `capture` est gardé ;
  - une question avant de créer une facture ;
  - « Chantier terminé ? » avant de terminer ;
  - un brouillon local pour le mémo et le texte IA.
- **Le Carnet reste replié** (décision du 27/09 non renversée). L'ouvrir sur la dernière période est une décision à confirmer par le fondateur.

**Gestes.**
- 1 photo : 5 → 3.
- Dicter : 5 → 3, ou 4 si le test Android échoue.
- Note : 4 → 3.
- Relance IA : environ 7 → 3, sans copier-coller.
- Terminer le chantier : 1 → 2, voulu (c'est un geste irréversible).

**Dissidence valable.**
- Une fiche riche peut montrer 7 blocs.
- Le [+] et la bande font deux portes.
- Trois paris à tester sur un vrai Android : l'ouverture de l'appareil photo, l'écoute à l'ouverture, le geste retour qui coupe le micro.

**Lots.**
1. Même écran, sans pièges.
2. Les trois gestes directs (**vrai Android obligatoire avant livraison**).
3. Argent et Carnet.

Arbitrage complet : `refonte-maquettes/duel-D/arbitrage.md`.

---

## Duel E : la capture

**Problème.** La capture est l'avantage le plus fort de Compyo, mais le geste le plus fréquent (une demande qui arrive pendant le travail) prend 6 gestes ou plus. L'accusé de réception n'apparaît que si le message contient un numéro.

**Candidats.**
- **A : réparer le parcours actuel, 62.**
- B : une seule porte « Reçu », 61.
- C : l'accusé d'abord, le rangement plus tard, 52,5.
- D : une synthèse, 54.

**Vainqueur : A.** Sur le cas courant, B fait aussi 7 gestes, avec le même lien `wa.me` non testé. En plus, B réécrit le partage et la page `nouvelle`, qui perdrait l'alerte de doublon et l'atterrissage des erreurs.
- **Greffes :**
  - quand l'IA échoue, on reste sur la même revue, déjà remplie du message (de B) ;
  - un partage abandonné devient une ligne « Reçu » dans « À faire de votre côté », pendant 7 jours, pour le compte qui a capté seulement, sans changer la RLS (de B) ;
  - « Bien reçu » s'affiche après tout message reçu : un rendez-vous détecté, ou un ajout à un projet existant (de D).
- **Un seul atterrissage : la fiche**, où le duel D place déjà « Bien reçu » en action de Maintenant.
- **Le grand micro ne revient pas** (retiré par `91bc744`).

**Dissidence valable.**
- Le cas « partage sans numéro » n'a jamais été observé : on suppose qu'il est courant.
- Un client connu, partagé sans numéro, devient un doublon dans toutes les versions. Le rapprochement par nom avait été refusé par écrit, et il n'est pas rouvert.

**Test T1, sur deux Android d'entrée de gamme avec la PWA installée, avant le lot 4.**
- `wa.me/?text=` sans numéro ouvre-t-il le sélecteur de WhatsApp ?
- La conversation qu'on vient de quitter est-elle en tête de liste ?
- Que fait `sms:?body=` sans numéro ?
- Que contient vraiment un partage WhatsApp ?

**Lots.**
1. Rien ne se perd.
2. La ligne « Reçu ».
3. « Bien reçu » quand le numéro est connu.
4. « Bien reçu » sans numéro, **bloqué jusqu'au test T1**.

Arbitrage complet : `refonte-maquettes/duel-E/arbitrage.md`.

---

## Duel F : le devis sur téléphone

**Problème.** Éditer, vérifier et valider au pouce, sans que la vérification ligne par ligne annule le gain de temps. C'est le reproche n°1 fait au devis vocal des concurrents. Il y a aussi un bouton qui ment : « Envoyer au client » n'envoie rien.

**Candidats.**
- A : les libellés corrigés seulement, 48.
- B : un seul écran, seules les lignes à vérifier mises en avant, 62.
- C : des cartes une à une, 53,5.
- **D : l'envoi direct, 74.**

**Pourquoi D, et pas B ni C.** Le lien de signature ne marche que si le devis est « envoyé » (`schema.sql:2405`, `:1638`). B et C laissaient le devis « à valider » jusqu'à une question de retour, et le client aurait reçu un lien mort.

**Vainqueur : D.**
- Un appui fige le devis, puis ouvre WhatsApp au numéro du client, message et lien prêts. C'est l'artisan qui envoie.
- **Greffes :**
  - toutes les lignes visibles au premier écran (5 au plus), les douteuses en tête (de B) ;
  - un signal « Prix Compyo » sur les prix qui ne viennent pas de l'artisan, sans migration SQL (de C) ;
  - des libellés honnêtes partout (de A).
- **Corrections :**
  - une question avant de figer si une mention obligatoire manque ;
  - les paramètres relus en base avant le gel ;
  - « Rien d'inhabituel » supprimé (une fausse assurance) ;
  - un seul prix par ligne, avec la recomposition jusqu'au TTC.

**Le modèle d'états, sans migration.**
- `a_valider` s'affiche « À envoyer ».
- `envoye` s'affiche « En attente » et « Noté envoyé le… », avec « Pas parti ? Rouvrir ».
- Après relance, la pastille dit « Sans réponse · 5 j ».

**Gestes jusqu'au message prêt dans WhatsApp.** Aujourd'hui 7 ; 3 après le lot 1 ; 1 après le lot 3 (4 avec une correction).

**Dissidence valable.**
- « Envoyé » est noté au toucher, pas au départ réel du message.
- Une quantité fausse mais plausible n'est signalée par aucune règle.
- « Prix Compyo » risque de lasser tant que les prix de l'artisan ne sont pas appliqués dès la génération.

**Lots.**
1. Envoi direct et mots vrais. **Fait : `147f1ec`.**
2. Extraire l'état de `ValiderDevis`.
3. La revue sur téléphone.
4. « Prix Compyo ».
5. Les prix de l'artisan dès la génération (si la mesure le justifie).

Arbitrage complet : `refonte-maquettes/duel-F/arbitrage.md`.

---

## Duel G : le planning sur téléphone

**Problème.** Créer un rendez-vous demande 8 à 9 gestes. Déplacer ou annuler ne propose pas de prévenir le client. La règle anti-chevauchement porte sur toute l'entreprise.

**Candidats.**
- A : l'existant corrigé, avec un chevauchement par créateur, 55.
- B : une seule liste « à venir », 64.
- **C : la semaine en sept lignes, 69,5.**
- D : une synthèse, chevauchement réduit à « même chantier », 61.

**Vainqueur : C, sans son lot 4.**
- **La vue par défaut :** sept jours glissants à partir d'aujourd'hui, une ligne par rendez-vous. Un jour vide affiche « Rien de prévu » avec un « + ».
- **Pourquoi :** l'accueil montre déjà la journée, le Planning sert à voir la semaine. Le sélecteur de jours montre ce qui est pris avant de choisir.
- **Greffes :**
  - « Annuler » sur la grille de l'ordinateur passe par la question et le message (de B) ;
  - `?projetId=` préremplit le formulaire (de D) ;
  - « Supprimer » quitte la feuille du téléphone (de B).
- **Corrections :**
  - pas de huitième modèle de message (l'annulation réutilise une phrase neutre) ;
  - une puce « À l'heure… » ;
  - pas de « Pluie 70 % » inventé ;
  - les dates à l'heure de Paris ;
  - `AgendaMobile` garde ses props, pour ne pas casser le banc d'aperçu.
- **« Modifier » :** si la date d'un rendez-vous lié à un projet change, l'enregistrement propose de prévenir le client. C'est le dernier déplacement silencieux, et aucun candidat ne le traitait.
- **Chevauchement : inchangé, à l'échelle de l'entreprise, sans migration.**
  - Cette règle protège l'artisan seul et le couple « un terrain, un bureau ».
  - La clé « créateur » de A cassait la protection du couple.
  - Seul le message d'erreur change, pour « Déjà pris à cette heure. ».
- **Équipe :** le planning reste partagé, sans prénom. « Pour qui » est une décision du fondateur ; le juge recommande non pour l'instant. Le Module 53 (une colonne « pour qui » et une contrainte par personne) est écrit dans l'arbitrage, mais il n'est pas retenu.

**Gestes.**
- Voir la semaine : jusqu'à 7 → 1.
- Créer depuis une fiche : ≈ 8 → 3.
- Reporter à demain en prévenant : 11 → 5.
- Annuler en prévenant : 2, sans un mot, → 5.
- Prévenir pour la météo : 4 → 3.

**Dissidence valable.**
- « Rien de prévu » ne veut pas dire « libre ».
- Au-delà de 3 ou 4 rendez-vous par jour, la vue redevient la liste de B.
- À deux, le planning ne dit pas qui y va.

**Lots.**
1. Prévenir après chaque changement (feuille, grille, Modifier), sans migration.
2. La semaine en sept lignes.
3. Planifier en trois appuis.
4. « Pour qui », seulement si le fondateur dit oui.

Arbitrage complet : `refonte-maquettes/duel-G/arbitrage.md`.
