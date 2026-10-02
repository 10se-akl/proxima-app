# Duel G — Le planning sur téléphone

**Le problème en une phrase.** Le planning sur téléphone doit dire « où je vais, quand », et permettre de créer, déplacer ou annuler un rendez-vous au doigt. Prévenir le client doit faire partie du geste, sans que l'écran devienne un diagramme de Gantt quand l'équipe grandit.

**La douleur.** C'est le silence avec le client (★★★★☆) : « Un seul message au bon moment aurait sauvé la relation. » La recherche dit aussi : « Si prévenir un client devient un geste d'une seconde avec un texte déjà prêt, l'artisan le fait. »

**L'état actuel.** Lis `_inventaire/05-ecrans-coeur.md` §6, puis vérifie `app/dashboard/planning/page.tsx`, `planning/nouveau/page.tsx`, `components/planning/GrilleAgenda.tsx`, `AgendaMobile.tsx`, `actionsEvenement.ts`, `lib/meteo.ts` et `lib/messagesClient.ts`. Les captures sont `captures/avant/planning-*` et `rdv-*`.
- Sur téléphone, il y a une bande de 7 jours et la journée en liste. Un appui ouvre une feuille avec Appeler / Message (« Prévenir » si alerte météo) / Itinéraire, Fait, Modifier, Annuler, Supprimer.
- Créer un rendez-vous prend 8 à 9 gestes ; depuis la fiche, le titre et la date sont vides.
- Annuler se fait sans confirmation et sans proposer de prévenir le client. Déplacer ne propose pas de prévenir non plus.
- Les membres d'une équipe sont mélangés sans indication.
- La règle anti-chevauchement s'applique à toute l'organisation : deux compagnons ne peuvent pas avoir de rendez-vous en même temps (bug pour une équipe).

**Ce qu'il faut trancher :**
- la vue par défaut d'un artisan sur chantier : jour, semaine ou liste ;
- comment créer, déplacer et annuler au doigt (glisser-déposer ou non ?) ;
- comment « prévenir le client » s'intègre au déplacement et à l'annulation (le message part du téléphone de l'artisan, après son geste) ;
- comment le planning s'adapte à plusieurs personnes (duel A) sans Gantt ;
- la place de l'alerte météo.

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** L'existant, avec seulement les bugs corrigés : le chevauchement par personne, la confirmation d'annulation.
- **B — Le plus soustractif.** Une seule liste chronologique « à venir » (aujourd'hui, demain, cette semaine), sans grille sur téléphone. Créer en 3 gestes avec des valeurs par défaut intelligentes. Déplacer ou annuler mène toujours à « Prévenir le client ? ».
- **C — Une logique différente.** Par exemple, le planning vu par chantier plutôt que par heure, ou une semaine en 7 lignes (une par jour) avec le chantier du jour.
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

**Chaque maquette montre :**
- la vue par défaut à 360 px ;
- la création d'un rendez-vous depuis une fiche projet ;
- le report d'un rendez-vous à demain avec prévenir le client ;
- la vue avec deux personnes (Gérard et son apprenti Raph).

**Les poids** sont les poids standard.
