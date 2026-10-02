# Candidat A — Ne rien changer, sauf les nettoyages évidents

**L'approche.** On garde la barre actuelle (Aujourd'hui · Projets · [+] · Planning · Plus) : c'est mot pour mot l'idée n°1 de la recherche, et elle date du 26/09, six jours de recul. Le diagnostic cité (« navigation cachée, trop de choix, bouton hors de portée du pouce ») décrivait l'ancien menu à dix entrées en haut à droite, pas cette barre : deux des trois défauts sont déjà réglés. On ne retire que le superflu (Guide, Carte mentale) et on corrige un vrai défaut (`--barre-bas`). On ne déplace rien d'autre tant qu'on n'a pas mesuré que Plus gêne vraiment.

**La douleur traitée.** « Carte mentale… n'a rien à faire dans sa navigation principale » et « Équipe… sa place est dans les Paramètres » : fait pour Équipe, fait ici pour la Carte mentale. Reste « trop de choix » dans Plus : 6 lignes + 2 liens deviennent 5 lignes + 1 lien.

**Supprimé / fusionné / ajouté.**
- Retiré de la navigation : Guide (feuille Plus et barre latérale), « Ce que disent les artisans » / « Idées et retours ». Les routes `/dashboard/guide` et `/carte-mentale` restent.
- Ajouté : une ligne « Mode d'emploi » dans Paramètres > Compte. Rien n'est fusionné.
- Ce que l'artisan perd : le Guide passe de 2 à 4 appuis, la Carte mentale n'a plus de lien. Aucune habitude des 5 autres entrées ne change.

**Gestes, avant → après.**

| Tâche | Avant | Après |
|---|---|---|
| Relancer une facture en retard (depuis Aujourd'hui) | 3 | 3 |
| Voir la liste des impayés (Plus → Factures → Émises) | 3 | 3 |
| Ouvrir une facture précise par la liste | 4 | 4 |
| Ouvrir Devis, Notes ou Bilan | 2 | 2 |
| Inviter un membre d'équipe | 3 + dépli | 3 + dépli |
| Conjointe, 1440 px : Factures → Émises → ligne | 3 clics | 3 clics |
| Ouvrir le Guide | 2 | 4 (perte) |

**Impact technique.** `components/dashboard/Sidebar.tsx` (retirer `Guide` de `SECONDAIRES` et deux liens), la fiche Compte (une ligne), `app/globals.css` (remettre `--barre-bas` à 0 quand la barre s'efface pendant la saisie : les boutons collants « Valider ce devis » et « Créer le projet » flottent sinon ~72 px trop haut). Optionnel : supprimer `NouveauProjetMenu.tsx` et les composants morts. Aucune migration, aucune route touchée, risque de régression quasi nul. Un seul lot, une PR, réversible en une minute.

**Ce que A refuse, et que le jury doit peser.** Une liste plate de 5 lignes se filtre trivialement par rôle (un « terrain » verrait Notes et Paramètres seulement, écran 8), mais ce n'est que cosmétique : le rôle n'existe pas en base (inventaire 03, F8), le verrou RLS reste à construire dans tous les candidats. De même, « à facturer » (chantier fini sans facture) manque dans Aujourd'hui : c'est un problème de contenu, pas de navigation, et il se règle dans toute option par une ligne de plus dans « À faire de votre côté ». Aucune idée écartée n'est rouverte.

**Auto-évaluation (poids du brief).**
- Charge mentale 16/30
- Gestes 10/20
- Lisibilité 11/15
- Risque 10/10
- Coût de migration 10/10
- Cohérence et habitude 15/15
- **Total 72/100**

**Les deux vraies faiblesses.**
1. **Plus reste un tiroir plat.** Devis, Factures, Notes, Bilan, Paramètres y pèsent autant, à 2 appuis, sous un libellé qui ne dit rien (« Plus »). La recherche dit que Devis et Factures « doublent l'accès aux documents » déjà dans chaque projet : A n'y touche pas. Notes s'affiche toujours à quatre endroits (accueil, cloche, page, pop-up).
2. **Le soir au bureau est sous-servi.** Aucune vue unique « à facturer / à relancer » : la conjointe assemble Aujourd'hui (plafonné à 5 lignes), Devis et Factures (« Émises » = impayées, sans jours de retard). À 1440 px, l'écran est la colonne du téléphone, étroite, avec un grand vide. Équipe reste à 3 appuis et il n'y a toujours pas de rôle réduit.

**Quand A perd.** Si la mesure en bêta montre que Plus s'ouvre souvent pour Devis ou Factures, ou si le test avec une conjointe échoue, il faut passer à un candidat qui regroupe l'argent. Les nettoyages de A restent valables dans tous les cas : ils sont le premier lot de n'importe quelle option.
