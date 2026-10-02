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
