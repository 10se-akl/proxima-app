# Duel C — L'écran « Aujourd'hui »

**Le problème en une phrase.** L'écran doit répondre à une seule question, « qu'est-ce que je dois faire ? », à trois moments très différents : le matin dans la voiture, sur le chantier et le soir.

**La douleur.** La recherche parle de « la journée qui ne se ferme jamais » (★★★★★) : « Le réveil à 3 heures du matin, c'est très souvent une liste non fermée. » Elle pose deux principes : « Une information n'apparaît que si elle risque d'être oubliée », et « La réussite se mesure le soir. »

**L'état actuel.** Lis `_inventaire/05-ecrans-coeur.md` §2 et `_inventaire/01-ecrans-et-mesures.md`, puis vérifie `app/dashboard/page.tsx`, `components/accueil/*` (VueAccueil, Blocs, ListeAujourdhui, FermerJournee), `components/dashboard/AConfirmer.tsx` et `components/projet/prochaineAction.ts`. Les captures sont `captures/avant/accueil-*`.
- Il y a cinq blocs au plus : Maintenant, À confirmer, Aujourd'hui, À faire de votre côté, En attente du client. « Fermer la journée » remplace « Maintenant » dès 17 h.
- « À confirmer » n'a pas de plafond.
- « Relire le devis » ouvre la fiche au lieu du devis.
- Le commit **f8d263b a retiré le bouton « C'est bon pour aujourd'hui »**. Il ne faisait que remplacer la carte par un message, ne se défaisait pas et ne servait à rien de compréhensible. **Comprends-le avant de proposer un geste de clôture** : un geste qui ne change rien de réel est refusé.
- Le calcul des bornes « aujourd'hui » se fait en UTC côté serveur (risque de décalage).

**Ce qu'il faut trancher :**
- la structure idéale et le nombre de blocs, dans quel ordre ;
- la règle qui fait qu'une chose n'apparaît que si elle risque d'être oubliée ;
- ce qui change entre le matin, la journée et le soir ;
- ce que voit un coéquipier de terrain (duel A en parallèle : prévois une variante « terrain » simple) ;
- l'expression du soulagement le soir, sans gamification.

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** L'écran actuel, avec seulement les bugs corrigés : plafond d'« À confirmer », lien du devis, UTC.
- **B — Le plus soustractif.** Une seule liste ordonnée et rien d'autre. Par exemple « Maintenant » puis une liste unique triée par urgence, avec au plus 7 lignes.
- **C — Une logique différente.** Par exemple, l'écran change complètement selon le moment (matin = la route et les rendez-vous ; journée = le chantier en cours ; soir = la fermeture). Ou bien une seule question, une seule réponse à la fois (« la prochaine chose », puis la suivante).
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

**Chaque maquette montre :**
- un jour chargé à 8 h 10, à 10 h 30 et à 18 h 45 ;
- un jour vide ;
- la vue du coéquipier de terrain.

**Les poids** sont les poids standard.
