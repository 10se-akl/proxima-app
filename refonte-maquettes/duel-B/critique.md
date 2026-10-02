# Critique adverse — duel B (navigation)

Vérifié dans le code : `Sidebar.tsx`, `VueAccueil.tsx`, `app/dashboard/page.tsx`, `FacturesProjet.tsx`, `VueProjet.tsx`, `FeuilleMessageClient.tsx`, `ListeFacturesRecherchable.tsx`, `DemandeCard.tsx`, `CentreNotifications.tsx`, `PopupRappel.tsx`, `lib/messagesClient.ts`. Aucune couleur en dur dans les quatre HTML (contrôle par regex). Le bug `--barre-bas` est corrigé (b5fb100) : je ne le compte pas.

## Mon décompte des gestes (un appui = un geste, l'envoi dans l'appli SMS compté)

| Tâche | Actuel | A | B | C | D |
|---|---|---|---|---|---|
| Relancer une facture, depuis Aujourd'hui | 3 | 3 | 3 | **4** (la ligne « En attente » disparaît) | 3 |
| Relancer, hors Aujourd'hui | 7 (Plus, Factures, Émises, ligne, Message, SMS, Envoyer) | 7 | 5 | 4 | 4 (D annonce « 6 » avant : il omet Émises) |
| Paramètres, téléphone / ordi | 2 / 1 | 2 / 1 | 2 / 2 | 2 / 1 | 2 / **2** |
| Ouvrir l'équipe (inviter : +1 dépli) | 3 | 3 | 2 | 2 | 2 |
| Créer une note | 3 | 3 | 2 | **non compté** (3 via la cloche) | **non compté** (3) |
| Planning de la semaine | 1 | 1 | 1 | **2** | 1 |
| Conjointe, ordinateur : retrouver ce qui est à facturer | introuvable | introuvable | « 0 clic » (lot optionnel) | 1 | 1 (lot 4) |

Les quatre candidats arrêtent le décompte de la conjointe à la liste. Personne ne compte le geste de créer la facture dans la fiche (`FacturesProjet.tsx`), ni son envoi.

## Candidat A — ne rien changer

1. **Sérieuse. La conjointe n'est pas servie.** À 1440 px l'accueil reste une colonne de 672 px (`VueAccueil.tsx:56`, `max-w-2xl`). « À facturer » n'existe pas. Relancer hors Aujourd'hui coûte 7 gestes, chiffre que A ne donne pas (il ne compte que 3 et 4).
2. **Sérieuse. Il n'y a presque plus de changement.** Son seul « vrai défaut » est déjà corrigé. Reste à retirer Guide et un lien. Le « Plus » garde 5 entrées de même poids derrière un libellé muet.
3. **Sérieuse. Le nettoyage aggrave une chose.** Le Guide, construit le 27/09 (b0c0bdc), passe de 2 à 4 appuis (Plus, Paramètres, Mon compte, Mode d'emploi), alors que B, C et D le laissent à 2. La Carte mentale n'a plus aucun lien.
4. **Mineure.** « Émises = impayées » est faux : le filtre prend `statut === "emise"` (`ListeFacturesRecherchable.tsx`), donc les factures pas encore échues et les acomptes. Notes « à quatre endroits » reste sans réponse.

## Candidat B — trois destinations et la capture, sans « Plus »

1. **Bloquante. La promesse de la conjointe (« 0 clic ») repose sur un état qui n'existe pas.** « Terminé, à facturer » est le lot 4, optionnel, et il dépend de `statut = termine`. Or ce statut passe par la question oui / non de Gérard (`page.tsx:236-243`, deux signaux). L'écran 7 le montre comme acquis. Il omet aussi « Fermer la journée », que le code affiche à partir de 17 h (`page.tsx:34,78,292`) : l'accueil du soir de la conjointe n'est pas celui de la maquette. « Voir les 7 → » ouvre des lignes de projet sans montant (`DemandeCard.tsx` n'affiche que le type et l'étape).
2. **Sérieuse. Nouvelle notification.** Le lot 3 donne à toute note un rappel par défaut « demain 8 h ». Or le rappel déclenche un pop-up bloquant, du push et la pastille d'Aujourd'hui (`PopupRappel.tsx:11`). Le protocole refuse les nouvelles notifications. Sans rappel, une note n'est visible nulle part : l'accueil ne lit que les notes avec rappel (`page.tsx:153`).
3. **Sérieuse. Écran 5 non chiffré.** Il montre un bouton « Relancer » sur la ligne de facture de la fiche, et un « Maintenant : relancer le paiement ». Aucun des deux n'existe (aucun « relancer » dans `FacturesProjet.tsx` ni dans `VueProjet.tsx`, hors commentaires) et aucun n'est dans la liste des fichiers touchés.
4. **Sérieuse. Le menu caché revient en haut à droite.** Avatar hors du pouce : c'est la citation du brief, et B l'admet. Quatre cases avec le [+] en troisième position décentrent le bouton (visible dans le rendu).
5. **Mineure.** Retrouver un devis : 3 à 4 gestes au lieu de 3. Trois entrées connues disparaissent, pour un gain de nombre nul (B le dit).

## Candidat C — Aujourd'hui · Projets · Bureau

1. **Bloquante. Il ralentit le geste qu'il prétend soigner.** La ligne « En attente du client », avec son bouton Relancer, devient une ligne-pont. La relance la plus fréquente passe de 3 à 4 gestes, sur la douleur n°1 « gêne d'écrire une relance ». Après 17 h, Aujourd'hui renvoie Gérard vers « Bureau », la page de sa conjointe.
2. **Sérieuse. Planning quitte la barre sans plan pour la météo.** L'alerte météo et « Prévenir le client » vivent dans Planning (`planning/page.tsx:7`, `AgendaMobile.tsx:253`, `GrilleAgenda.tsx:267`). Le lien « Semaine › » n'existe pas dans l'accueil (aucune occurrence) et n'est pas chiffré dans les fichiers touchés. Semaine : 1 geste devient 2.
3. **Sérieuse. « Bureau » est un mot non testé, et la règle de garde est déjà violée.** « N'accueille que ce qui a un état d'argent », mais la page porte le bilan et des lignes « devis prêt ». Une partie des données est dupliquée avec Aujourd'hui.
4. **Sérieuse. Notes.** « Un geste de capture » : `FeuilleCapture.tsx` n'est pas dans les fichiers touchés et aucun rendu ne montre la feuille. Le chemin réel est cloche, « Voir toutes les notes → » (`CentreNotifications.tsx:184`, ligne en `text-xs`, moins de 48 px), puis Nouvelle.
5. **Sérieuse. Régression PWA.** La feuille Compte du rendu n'a plus « Installer l'application » (présent dans `Sidebar.tsx:307`). « Paramètres » devient « Mon entreprise » : un mot de plus à réapprendre.
6. **Mineure.** Pied de la barre latérale en 12 px à 55 % d'opacité (« Guide · Donner mon avis · Se déconnecter » sur une ligne).

## Candidat D — « Argent » en 5e case

1. **Sérieuse. Charge déplacée, pas retirée.** Argent double « En attente du client », dont les lignes Relancer restent dans Aujourd'hui (rendu 1). D l'admet. Pour Gérard seul, la 5e case est occupée par la page qu'il ouvre le moins. Le pied « Tous les devis · Toutes les factures · Bilan du mois » fait un mini « Plus » (trois destinations dans un pied de page).
2. **Sérieuse. Le bureau perd un clic.** « Mêmes destinations sur ordinateur » : Paramètres passe de 1 à 2 clics (D le note) alors que la barre latérale a la place. Dans le rendu 1440 px, le menu Compte ouvert recouvre l'entrée Argent : le chemin « 1 clic » n'est pas démontré.
3. **Sérieuse. « À facturer » arrive au lot 4, après essai.** Les lots 2 et 3 ne livrent que « à relancer » et « à envoyer ». La règle (« chantier terminé ») dépend du même statut que chez B, et les acomptes la faussent (D l'admet).
4. **Sérieuse. Notes.** Même trou que C : « geste de capture » sans `FeuilleCapture.tsx` dans les fichiers touchés. Les notes sans rappel restent invisibles dans Aujourd'hui.
5. **Mineure.** « Ce que disent les artisans » reste dans le menu. Le « avant : 6 » omet Émises, donc le gain est de 3, pas de 2. Le rôle `employe` est aussi la conjointe : le drapeau `voitArgent` est du confort, D le dit.

## Ce qu'aucun candidat ne traite

- **De la capture du terrain à la facture.** Pour la conjointe, aucune vue de ce que le terrain a capté (notes, photos, journal vocal) et le geste de créer la facture n'est compté. « À facturer » dépend d'un statut que seul Gérard pose, par un oui / non qu'il remet. La douleur « la journée ne se ferme jamais » vide donc la liste censée la sauver.
- **Les notes sans rappel.** Elles sont invisibles sur l'accueil (`page.tsx:153`). B, C et D les retirent de la barre sans leur donner de porte, hors de la cloche.
- **Le soir de la conjointe sur l'accueil.** Après 17 h, l'accueil est le « Fermer la journée » de Gérard (`page.tsx:292`). Seul le rendu de A le montre. Personne ne décide si la conjointe y arrive ou ailleurs.
- **La vue terrain.** Toutes montrent une vue réduite, qui est cosmétique : aucune policy ne lit `memberships.role` (inventaire 03). `employe` est aussi la conjointe.
- **L'habitude et la mesure.** Aucun candidat ne cite d'usage mesuré de « Plus » ni de test chez un artisan. Le brief pèse l'habitude à 15 points, sans protocole d'annonce aux testeurs actuels (sans infobulle).
