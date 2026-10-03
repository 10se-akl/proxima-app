# Duel G (planning sur téléphone) : critique adverse

Décisions déjà prises : duel A = espace partagé, pas d'assignation de tâches (`duel-A/arbitrage.md:153`) ; duel C = `FeuilleDeplacer` et message avec la nouvelle date déjà livrés (`FermerJournee.tsx:129-139`).

## Ce que change chaque règle de chevauchement

Aujourd'hui : `exclude (organisation_id =, periode &&)` sur les rendez-vous non annulés (`schema.sql:1834-1841`), doublée côté client (`nouveau/page.tsx:253`, `ConfirmationRdv.tsx:80`). Elle protège toute l'organisation : l'artisan seul et la conjointe qui saisit le soir.

| | Clé | Artisan seul | Conjointe au bureau | Gérard planifie pour Raph |
|---|---|---|---|---|
| A | `artisan_id` = créateur (forcé par trigger) | intact | **perdue** | **toujours bloqué** |
| B | `assigne_a`, nouvelle colonne | intact si « Moi » | défaut « Moi » = elle | réglé si « Pour » choisi |
| C | `coalesce(assigne_a, artisan_id)` | intact | comme A si « Qui ? » vide | réglé si « Qui ? » choisi |
| D | même `demande_id`, même créneau | **perdue** (avertissement) | perdue | plus de blocage |

## A (ne rien changer)

- **Sérieuse. Corrige le mauvais cas.** `artisan_id` est celui qui saisit, pas celui qui y va : si Gérard saisit pour Raph, le blocage reste ; si deux personnes saisissent, le garde-fou disparaît. La liste montre alors deux lignes à 9h30 sans dire qui.
- **Sérieuse. Le cœur du brief n'est pas traité.** Créer reste à 8-9 gestes (`nouveau/page.tsx:63-67` : titre vide, `?projetId=` ne remplit que `demandeId`).
- **Sérieuse. « Modifier ou déplacer »** (`AgendaMobile.tsx:293-296`) décale en silence, puis `router.push` (`nouveau/page.tsx:349`). La feuille passe à neuf choix.
- **Mineure, affirmation fausse.** `docs/langage-interface.md` ne dit pas « à tort » que l'agenda suit les règles 3, 4 et 18 : la ligne 177 dit l'inverse.
- **Mineure.** Un huitième modèle « annulation » dépasse la règle de `messagesClient.ts:19` (« pas plus de sept »). B et D aussi.

## B (liste « à venir », « Prévenir ? » partout)

- **Bloquante pour son lot 4 : rouvre le duel A.** `assigne_a` est une assignation (admis). « Pour : Moi · Raph » apparaît dès 2 membres, donc chez l'artisan seul avec sa femme : champ et prénoms nouveaux. Les lots 1 à 3 s'en passent.
- **Sérieuse. Colonne nullable, exclusion muette** : `NULL = NULL` n'est pas vrai. `ConfirmationRdv.tsx:117-125` et `nouveau/page.tsx:301-303` insèrent sans `assigne_a` et ne sont pas listés. C a prévu le `coalesce`, pas B.
- **Sérieuse. « 3 gestes » suppose un raccourci de trois chantiers** que rien ne définit (rendu 3). Au-delà, « Autre chantier… » mène à l'ancien formulaire : 8-9 gestes.
- **Sérieuse. « Modifier » quitte la feuille** (rendu 4a) : durée et notes inaccessibles. Le décalage silencieux survit : `Blocs.tsx:267`, `GrilleAgenda.tsx:279-283`.
- **Sérieuse. La semaine disparaît** : « libre jeudi ? » devient un défilement, dans une liste qui mélange les deux personnes.
- **Mineure.** « Pluie 70 % » n'existe pas : `resume` est un texte libre (`meteo.ts:35,110-111`), et une alerte au vent seul n'a pas de pluie.

## C (la semaine en sept lignes)

- **Sérieuse. L'annulation réutilise « décalage »** : le texte promet « une nouvelle date » (`messagesClient.ts:83-85`) à un client dont le chantier est annulé. Mentir au client, c'est l'inverse de la douleur visée.
- **Sérieuse. « Rien de prévu » n'est pas « libre »** (admis). Au-delà de 3-4 rendez-vous par jour, c'est la liste de B ; reporter le lundi ne déplace pas le mardi.
- **Sérieuse. La grille de l'ordinateur n'est pas touchée** : `GrilleAgenda.tsx:291-299` annule en un clic, sans question ni message : le geste de la conjointe le soir. Jours glissants sur téléphone, lundi-dimanche sur ordinateur.
- **Sérieuse. `assigne_a` + « Qui ? »** rouvrent le duel A. Le `coalesce` est la bonne forme, mais rien ne vérifie en base que `assigne_a` est un membre (B le prévoit).
- **Mineure.** Le rendu 5 coupe « …notre rendez-vo… » : la date est invisible, alors que la feuille livrée affiche deux phrases (`FeuilleMessageClient.tsx:253`). Modifier `FeuilleDeplacer` touche l'accueil (`FermerJournee.tsx:143`, `AConfirmer.tsx:144`), sans test.
- **Mineure, à mesurer.** Sept lignes, trois puces et le bouton dans une feuille à `92svh` (`Feuille.tsx:124`) : « Planifier » peut passer sous la ligne de flottaison.

## D (liste, avertissement seulement)

- **Bloquante tant que « Déplacer » n'avertit pas.** `FeuilleDeplacer.tsx:79-82` ne connaît que l'erreur 23P01 ; avec « même chantier » elle ne tombe plus, et l'avertissement n'existe que dans « Planifier » (rendu 2) et les deux formulaires. « Demain, même heure » peut atterrir sur un autre rendez-vous sans un mot : l'artisan seul perd son seul obstacle dur, et `ConfirmationRdv.tsx:107` devient permissif.
- **Affirmation fausse.** La feuille livrée n'affiche pas que la première phrase : `FeuilleMessageClient.tsx:253` en montre deux pour un décalage avec nouvelle date. Le « défaut constaté » est déjà corrigé.
- **Affirmation fausse.** « Le samedi sur un lundi vide » décrit l'ancienne grille (`AgendaMobile.tsx:22-28`) ; l'agenda actuel s'ouvre sur aujourd'hui (`:52-57`).
- **Sérieuse. « Supprimer passe dans Modifier »** : ce formulaire n'a aucune suppression. Il faut y ajouter un bouton destructeur, ou « Supprimer » quitte le téléphone.
- **Sérieuse. « Avec Raph » (rendu 8, `pour_id`) est une assignation dessinée**, même renvoyée au lot 5. Sans elle, deux lignes 9h00 « d'un trait » ne disent pas qui y va.
- **Mineure.** « Même heure que la dernière visite » n'existe pas : `nouveau/page.tsx:150-157` prend le prochain rendez-vous à venir. « Créer depuis le planning : 3 » n'est pas maquetté.

## Recompte (envoi dans la messagerie compté)

- **Journée / semaine** : A 1 / 2 par jour ; B, D 0 / défilement ; C 0 / 0 si peu chargée.
- **Créer depuis une fiche** : A 8 ; B 2 ; C 3 (2 si demain, journée) ; D 2-3. Depuis le planning, B, C, D valent 3 seulement si le chantier est dans le raccourci.
- **Reporter à demain en prévenant** : 5 partout, sans compter le retour dans Compyo après l'envoi.
- **Annuler en prévenant** : 5 partout ; sans prévenir, 3 (A) à 4.
- **Vue à deux** : aucune ne dit qui y va sans `assigne_a` ou `pour_id`. Seule A y renonce honnêtement.

## Ce qu'aucun candidat ne traite

1. **« Modifier » décale encore en silence** dans les quatre (`nouveau/page.tsx:349`, lien de fiche `Blocs.tsx:267`) : aucun ne propose de prévenir quand la date change.
2. **La météo reste celle de la ville du siège** (`page.tsx:58,70`, `meteo.ts:11-13`), jamais celle du chantier ; la prévision ne porte que sur 10 jours (`meteo.ts:97`).
3. **L'annulation d'une tâche ou d'un client sans numéro** : libellé « rendez-vous » et question mal adaptés.
4. **La grille de l'ordinateur à deux** : toujours sans « qui », pour la conjointe le soir.
5. **Le texte d'annulation** est une décision de ton pour le fondateur, avant tout lot.
6. **Aucun test** sur `AgendaMobile`, `FeuilleDeplacer`, `messagesClient` ; le banc `/apercu-moins` (`Apercu.tsx:193`) casse si `AgendaMobile` est remplacé (B, D).
