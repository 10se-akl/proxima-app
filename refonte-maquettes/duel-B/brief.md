# Duel B — Navigation et architecture de l'information

**Le problème en une phrase.** La barre du bas a trois destinations, une capture et un « Plus » qui cache sept entrées de même poids. Devis, Factures, Notes et Bilan y sont des destinations, alors que ce sont surtout des objets d'un projet ou des vues ponctuelles.

**La douleur.** La recherche dit : « Pour un utilisateur de 55 ans, d'une main, avec des gants, c'est la pire combinaison possible : navigation cachée, trop de choix, et bouton hors de portée du pouce. » Elle ajoute : « Devis et Factures en entrées séparées doublent l'accès aux documents, qui sont déjà dans chaque projet. » Et : « Bilan se consulte une fois par mois. »

**L'état actuel.** Lis `_inventaire/05-ecrans-coeur.md` §1 et `_inventaire/01-ecrans-et-mesures.md`, et vérifie dans `components/dashboard/Sidebar.tsx` et `app/dashboard/layout.tsx`.
- Il y a 10 destinations sur téléphone : Aujourd'hui, Projets et Planning dans la barre, puis Devis, Factures, Notes, Bilan, Paramètres, Guide et Carte mentale derrière « Plus ».
- Le [+] ouvre la capture. Sur une fiche projet, il devient « Ajouter ».
- La barre disparaît pendant la saisie (commit e2a9972).
- Équipe vit dans Paramètres, mais aussi dans une page `/dashboard/equipe` liée nulle part.
- La carte mentale est un outil interne du fondateur pour lire les retours.

**Ce qu'il faut trancher :**
- les bonnes destinations et leur nombre (plafond : **quatre plus la capture**) ;
- où vivent les devis, les factures et les notes. Un devis et une facture sont-ils des objets du projet plutôt que des destinations ?
- les Notes : une destination, ou un geste de capture plus une vue dans Aujourd'hui ?
- où se range Équipe (le duel A se tranche en parallèle : propose une place qui marche pour les deux grandes issues, « espace partagé » et « terrain / bureau ») ;
- **le parcours de la conjointe au bureau le soir, sur ordinateur** (1440 px), qui n'est pas celui de Gérard sur le chantier : où trouve-t-elle « tout ce qui est à facturer / à relancer » ?
- ce que voit un coéquipier de terrain s'il a une vue réduite.

**Rappel.** On ne supprime aucune route : une destination retirée de la navigation reste accessible par un lien.

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** La barre et le « Plus » actuels, avec seulement les nettoyages évidents (Carte mentale et Guide hors de la navigation, par exemple).
- **B — Le plus soustractif.** Trois destinations et la capture, sans « Plus ». Tout le reste vit dans le projet, ou dans un menu de compte en haut.
- **C — Une logique différente.** Par exemple, des destinations par moment (« Aujourd'hui », « Chantiers », « Bureau » pour l'argent : devis, factures, relances, bilan), ou une navigation par projet d'abord.
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

**Chaque maquette montre :**
- la barre du bas à 360 px ;
- ce qui remplace « Plus » ;
- le chemin vers une facture impayée, en nombre de gestes ;
- la vue ordinateur à 1440 px de la conjointe le soir (barre latérale) ;
- la place d'Équipe et de Paramètres.

**Les poids sont ajustés pour ce duel.** Charge mentale 30 · Gestes 20 · Lisibilité 15 · Risque 10 · Coût de migration 10 · **Cohérence et habitude des utilisateurs existants 15**. On change une habitude.
