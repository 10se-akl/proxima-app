# Candidat C — Trois moments : Aujourd'hui · Projets · Bureau (+ la capture)

**L'approche.** La barre ne liste plus des types de pages mais les trois moments de la vie de Gérard : *maintenant* (Aujourd'hui), *le chantier* (Projets), *le papier et l'argent* (Bureau). Devis, Factures, Relances et Bilan fusionnent en **une page classée par action** (à encaisser, à facturer, devis) et non par type de document. « Plus » disparaît ; Paramètres et Équipe passent derrière l'avatar (2 gestes), Notes devient un geste de capture plus des lignes dans Aujourd'hui.

**La douleur.** Les douleurs n°1 sont l'administratif du soir, le silence client et la gêne de relancer. La recherche : « Ce n'est pas un problème de permissions, c'est un problème de transmission » (terrain / bureau). Aujourd'hui, la conjointe ne peut pas répondre à « qui nous doit quoi ? » sans ouvrir chaque projet ou fouiller « Plus ». Objection honnête : la recherche juge aussi que Devis et Factures séparés doublent l'accès aux documents du projet. C répond que le Bureau n'est pas un index de documents mais la seule vue transversale par état, que la fiche projet ne peut pas donner.

**Supprimé / fusionné / ajouté.** Supprimé : le tiroir « Plus », 4 entrées de barre (Devis, Factures, Notes, Bilan), Planning comme onglet. Fusionné : Devis + Factures + Bilan → Bureau ; « En attente du client » et les lignes « devis » de « À faire de votre côté » → une ligne-pont sur Aujourd'hui. Ajouté : **une** page (Bureau) et un avatar en haut. Gérard perd : l'onglet Planning (l'agenda du jour reste dans Aujourd'hui, la semaine est derrière « Semaine › »), le mot « Plus » qu'il connaît, et les relances en 3 gestes depuis Aujourd'hui (voir ci-dessous). Aucune route supprimée.

**Gestes (téléphone, avant → après).**

| Tâche | Avant | Après |
|---|---|---|
| Voir mes devis en cours | 2 (Plus → Devis) | 1 |
| Ouvrir une facture impayée | 4 (Plus → Factures → Émises → ligne) | 2 (Bureau → ligne), 0 pour lire le total |
| Relancer une facture | 3 depuis Aujourd'hui (si dans les 5 lignes) | **4** (Bureau → Relancer → SMS → Envoyer) ; 3 si « Maintenant » la propose |
| Devis prêt → écran devis | ≥ 3 (Aujourd'hui → fiche → Terminer) | 2 (Bureau → ligne, lien direct) |
| Bilan du mois | 2 | 2, chiffres lisibles dès l'étape 1 |
| Agenda de la semaine | 1 | **2** |
| Paramètres / Équipe | 2 / 3 | 2 / 2 |

**Conjointe, 1440 px.** Un clic sur « Bureau » : à encaisser, à facturer, devis, bilan, sans ouvrir un projet. « Mon entreprise » et « Mon équipe » restent visibles dans la barre latérale. **Équipe**, deux issues du duel A : *espace partagé* = tous voient trois onglets ; *terrain / bureau* = le terrain perd l'onglet Bureau (maquette 5), le bureau le garde. Le masquage n'est que du confort : l'isolation se joue en base (RLS sur devis et factures).

**Impact technique.** `components/dashboard/Sidebar.tsx` (destinations, grille 5 → 4 colonnes, « Plus » remplacé par une feuille Compte, 2 liens latéraux) ; **nouveau** `app/dashboard/bureau/page.tsx` + `loading.tsx` (réutilise `BlocAccueil`/`LigneAccueil`) ; `app/dashboard/page.tsx` et `VueAccueil.tsx` (deux blocs → une ligne). Aucune migration : « à facturer » se dérive de `demandes.statut`, `devis`, `factures.type`, mais c'est une **requête nouvelle**. Risques : tests ou captures qui ouvrent « Plus » ; extraire la logique « en attente » (seuils 3/5 j, échéance + 3 j) dans `lib/` pour qu'Aujourd'hui et Bureau ne divergent pas.

**Lots.** 1) Bureau remplace « Plus » dans la barre actuelle, Planning garde son onglet (5 colonnes) : changement réversible, mesurable. 2) Feuille Compte (Paramètres, Équipe, Guide, avis). 3) Ligne-pont dans Aujourd'hui, « Fermer la journée » se termine sur le Bureau. 4) *Seulement si le test d'habitude passe* : Planning quitte la barre. 5) Vue réduite après le duel A.

**Auto-évaluation (poids du duel).** Charge mentale 25/30 · Gestes 14/20 · Lisibilité 13/15 (cibles de 90 px) · Risque 7/10 · Migration 6/10 · Cohérence et habitude 8/15 → **73/100**.

**Deux faiblesses réelles.**
1. **L'habitude et le vocabulaire.** Planning perd sa place (la recherche le gardait dans ses quatre entrées) et « Bureau » est un mot neuf : Gérard peut ne pas deviner que ses devis y sont. À tester avec cinq artisans avant de coder (repli : « Argent », ou garder Planning, lots 1–3 seuls).
2. **Bureau est du code neuf et risque de devenir « Plus » renommé.** Il ajoute 1 geste à la relance depuis le téléphone, duplique une donnée vue aussi dans Aujourd'hui, et sur ordinateur « Relancer » n'envoie rien d'un SMS (WhatsApp Web seulement) : la conjointe prépare, Gérard ou son WhatsApp envoie. Règle de garde : Bureau n'accueille que ce qui a un état d'argent.
