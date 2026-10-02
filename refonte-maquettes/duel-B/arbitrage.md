# Duel B — Arbitrage : navigation et architecture de l'information

> Juge. J'ai lu le protocole, les consignes, le brief, les quatre candidats et leurs rendus, puis la critique. Poids du brief : charge mentale 30 · gestes 20 · lisibilité 15 · risque 10 · migration 10 · **habitude 15**. Deux décisions amont s'imposent : le duel A (un seul espace partagé, aucun rôle visible, pas de vue terrain, Équipe dans Paramètres › Équipe) et le duel H (`docs/langage-interface.md`). Les faits vérifiés sont dans l'annexe.

## La décision en bref

1. **Le vainqueur est D, « Argent prend la place de Plus », avec 67,5/100.** Viennent ensuite A (65,5), B (56) et C (48,5). L'écart avec A est faible. D gagne pour deux raisons : aucun geste n'empire, et c'est le seul candidat qui réponde à la question du brief (« où la conjointe trouve-t-elle tout ce qui est à relancer ? ») sans casser le chemin de Gérard.
2. **Trois greffes.** De B : « Une note ou un rappel » dans le [+]. De C : Paramètres reste à un clic sur ordinateur, sans menu qui s'ouvre. De A : la Carte mentale sort de l'application.
3. **Corrections imposées** (duels A et H, ce ne sont pas des greffes) :
   - pas de `voitArgent` ni de vue réduite ;
   - pas de « Mon équipe » dans le menu ;
   - Argent tient en une colonne `max-w-2xl` ;
   - aucune pastille sur Argent ;
   - les trois liens du pied sont des boutons texte.
4. **Quatre lots.** Si la mesure ou le test l'exigent, on s'arrête après le lot 2, ce qui revient à A plus une page Argent. Aucune route n'est supprimée.

## 1. Les notes

| Critère (poids) | A | B | C | D |
|---|---|---|---|---|
| Charge mentale (30) | 4 | 6 | 5 | 7 |
| Gestes (20) | 4 | 6 | 5 | 7 |
| Lisibilité (15) | 7 | 6 | 6 | 7 |
| Risque (10) | 10 | 5 | 5 | 7 |
| Migration (10) | 10 | 6 | 5 | 6 |
| Habitude (15) | 10 | 4 | 3 | 6 |
| **Total /100** | **65,5** | **56** | **48,5** | **67,5** |

**A, ne rien changer.**
- *Charge mentale 4.* « Plus » reste un tiroir muet de cinq entrées de même poids, et la conjointe doit assembler deux listes.
- *Gestes 4.* Relancer hors de l'accueil coûte 7 gestes, « à facturer » est introuvable et le Guide passe de 2 à 4 gestes.
- *Lisibilité 7.* La barre actuelle est saine : cases de 64 px, lignes de feuille de 56 px.
- *Risque 10.* Un seul fichier, réversible.
- *Migration 10.* Rien à réécrire.
- *Habitude 10.* Rien ne bouge.

**B, le plus soustractif.**
- *Charge mentale 6.* C'est la barre la plus nette (trois destinations et le [+]). Mais l'argent s'éparpille sur chaque ligne de projet, et la conjointe perd ses listes.
- *Gestes 6.* Une note se crée en 2 gestes et une relance hors de l'accueil en 5. En revanche, un devis précis demande 3 ou 4 gestes, et le « 0 clic » de la conjointe dépend d'un lot optionnel.
- *Lisibilité 6.* Le [+] est décentré (3e case sur 4) et l'avatar est hors de portée du pouce.
- *Risque 5.* L'état d'argent par projet est à construire. Le rappel par défaut est une nouvelle notification, ce que le protocole refuse. Le rôle par membre contredit le duel A.
- *Migration 6.* Six fichiers, dont la liste des projets.
- *Habitude 4.* Trois entrées connues disparaissent sans case de remplacement, et la cible du [+] dans le guide se déplace.

**C, trois moments.**
- *Charge mentale 5.* C'est la meilleure page pour la conjointe. Mais Planning quitte la barre, et Gérard doit passer par « Bureau » pour relancer.
- *Gestes 5.* Relancer depuis l'accueil passe de 3 à 4 gestes, la semaine de 1 à 2.
- *Lisibilité 6.* Les cases sont grandes, mais le pied de la barre latérale est en 12 px à 55 % d'opacité, et « Installer l'application » a disparu.
- *Risque 5.* L'alerte météo et « Prévenir le client » s'éloignent, et « Fermer la journée » est modifiée.
- *Migration 5.* Il faut une page neuve et réécrire l'accueil et le soir.
- *Habitude 3.* Planning, « Plus » et « Paramètres » (devenu « Mon entreprise ») changent, et le mot « Bureau » n'a pas été testé.

**D, Argent.**
- *Charge mentale 7.* Un mot qui dit ce qu'il contient remplace « Plus », et 10 destinations deviennent 4. Mais Argent reprend « En attente du client ».
- *Gestes 7.* Relancer hors de l'accueil passe de 7 à 4 gestes (D annonçait 6 avant : c'est 7). Rien n'empire sur téléphone. Paramètres passe de 1 à 2 clics sur ordinateur, ce que la greffe corrige.
- *Lisibilité 7.* La barre garde sa géométrie, les lignes ont leur colonne « Relancer », et l'avatar en haut ne sert qu'aux pages rares.
- *Risque 7.* La page neuve repose sur des blocs existants, mais les seuils sont à extraire.
- *Migration 6.* Une page, une bibliothèque, un menu.
- *Habitude 6.* Une seule case change, à la même place, et le [+] ne bouge pas.

## 2. Ce qui est décidé

**Destinations, téléphone (360 px).**
- En bas : **Aujourd'hui · Projets · [+] · Planning · Argent**. Il y a toujours cinq cases ; le [+] reste au centre, avec la même hauteur et la même pastille sur Aujourd'hui.
- En haut : le logo, la cloche, puis un **avatar** (initiales, cible de 48 px). L'avatar ouvre la feuille « Compte » : Paramètres, Guide, Donner mon avis, puis thème, installer et se déconnecter.

**Destinations, ordinateur (1440 px).**
- Dans la barre latérale : « + Nouveau projet », puis **Aujourd'hui · Projets · Planning · Argent**.
- En bas, dans le bloc compte actuel : le nom, la cloche, le thème, installer, la déconnexion, et une ligne de liens **Paramètres · Guide · Donner mon avis**, à un clic. Aucun menu ne s'ouvre, rien ne recouvre Argent.

**La page Argent** (`/dashboard/argent`). Elle a cinq blocs au plus et suit la règle 1 du langage visuel :
- le total « 3 240 € à encaisser », avec le même calcul que le Bilan ;
- « En attente du client » : le même titre et les mêmes lignes que l'accueil, mais complètes, avec la colonne « Relancer » ;
- « Devis à envoyer » ;
- « À facturer », au lot 4 ;
- en pied : « Tous les devis · Toutes les factures · Bilan du mois ».

**Où vit chaque écran** (toutes les routes restent).

| Écran | Téléphone | Ordinateur | Gestes avant → après |
|---|---|---|---|
| Devis (liste) | Argent → « Tous les devis » ; chaque devis dans sa fiche projet | idem | 2 → 2 |
| Factures (liste) | Argent → « Toutes les factures » ; fiche projet | idem | 2 → 2 |
| Bilan | Argent → « Bilan du mois » ; lien de l'e-mail mensuel | idem | 2 → 2 |
| Notes : créer | [+] → « Une note ou un rappel » ; sur une fiche, [+] « Ajouter » | idem | 3 → 2 |
| Notes : tout lire | cloche → « Voir toutes les notes » (48 px) ; les notes avec rappel restent dans Aujourd'hui | idem | 2 → 2 |
| Paramètres | avatar → Paramètres | lien en bas de la barre latérale | 2 → 2 ; ordinateur 1 → 1 |
| Équipe | avatar → Paramètres → Équipe (duel A § 6). `/dashboard/equipe` redirige, via le lot Équipe du duel A | Paramètres → Équipe | 3 → 3 |
| Guide | avatar → Guide | lien en bas | 2 → 2 |
| Carte mentale | hors de l'application : `/carte-mentale` reste publique et liée depuis le site vitrine | idem | 2 → hors de l'application |

**Les tâches fréquentes.**
- Relancer une facture depuis Aujourd'hui : 3 → 3.
- Relancer hors de l'accueil : 7 → 4 (Argent, Relancer, SMS ou WhatsApp, Envoyer).
- Voir tout ce qu'on me doit : la liste n'existe pas aujourd'hui, et le total se lit dans Plus → Bilan (2) ; après, 1 geste.
- Planning de la semaine : 1 → 1.

Aucune tâche ne coûte plus cher qu'aujourd'hui.

**Le soir de la conjointe, sur ordinateur.** Sylvie ouvre Compyo à 21 h. Elle arrive sur Aujourd'hui, comme tout le monde : il n'y a pas de page d'accueil réglable. La carte « Fermer la journée » est celle de Gérard ; les blocs d'argent restent visibles dessous.
1. Elle clique sur **Argent** (1 clic). Elle lit le total, ce qui attend le client avec ses jours de retard, et les devis à envoyer.
2. Elle relance M. Petit :
   - « Relancer » (2) ouvre la fiche avec le message prêt (`?message=relancePaiement`) ;
   - « WhatsApp » (3) ;
   - « Envoyer » dans WhatsApp Web (4).

   Elle envoie depuis **son** WhatsApp, comme tout membre de l'équipe (duel A § 3.4).
3. Elle revient sur Argent (5) et clique sur un devis à envoyer (6). La suite est le flux d'envoi existant.
4. Au lot 4, elle clique sur « Facturer » (1 clic). La fiche s'ouvre sur le bloc Facturation, et la création de la facture se fait dans le flux existant (`FacturesProjet.tsx`). Ce geste n'est pas compté ici : il est hors du duel.
5. Pour pointer un paiement, elle passe par « Toutes les factures », en pied de page (2 clics).

Aujourd'hui, il lui faut Plus, Factures, Émises, puis Devis : 3 clics et plus, sans total à côté des lignes, et « à facturer » n'existe pas.

**Le coéquipier et l'artisan seul.** Le coéquipier a la même application et la même barre (duel A : aucune vue réduite). L'artisan seul voit seulement deux changements : Argent à la place de Plus, et un avatar en haut.

## 3. La dissidence : ce qui reste valable contre D

- **B.** L'avatar en haut à droite, c'est le « menu caché hors du pouce » de la recherche : il est déplacé, pas supprimé. C'est tolérable seulement parce qu'il ne porte plus que des gestes rares.
- **B et la recherche.** Les listes Devis et Factures « doublent l'accès » : elles survivent, au second niveau, dans le pied d'Argent.
- **A.** Rien de mesuré ne montre que « Plus » gêne qui que ce soit. Pour Gérard seul, le gain est faible, puisque sa relance la plus fréquente reste à 3 gestes depuis l'accueil. Les testeurs perdent un repère appris.
- **C et la critique.** Argent reprend des lignes d'Aujourd'hui : la même donnée apparaît à deux endroits, même si c'est le « Voir tout » du même bloc. « À facturer » dépend du oui / non de Gérard sur la fin du chantier : s'il ne répond pas, la liste reste vide.
- **La critique.** Une note sans rappel ni projet ne reste visible que par la cloche (2 gestes, comme aujourd'hui), jamais dans Aujourd'hui. Sur ordinateur, « SMS » ne sert à rien.

## 4. Ce qui me ferait changer d'avis

- **La mesure, qui existe déjà.** `MesureAudience` enregistre les chemins `/dashboard/*` dans `visites` : seuls `/admin` et `/api` sont exclus. Je compte les visites de `/dashboard/devis`, `/factures`, `/notes` et `/bilan` avant le lot 3, puis celles de `/argent` après le lot 2.
  - Si Notes est la page la plus ouverte depuis Plus, elle mérite une porte plus visible que la cloche.
  - Si Argent ne s'ouvre presque que sur ordinateur, on applique le repli de D : Argent seulement dans la barre latérale.
- **Une vraie conjointe, un soir.** Si elle ne trouve pas ses factures sous « Argent » en dix secondes, le mot change (décision 1).
- **Deux ou trois artisans seuls.** S'ils ne veulent pas de la case Argent et regrettent « Plus », on s'arrête au lot 2.

## 5. Les lots, dans l'ordre (chacun laisse l'application cohérente)

1. **Le compte passe en haut et la Carte mentale sort.**
   - Ce que fait le lot :
     - sur téléphone, l'avatar et sa feuille « Compte » (composant `Feuille`) ;
     - « Plus » ne garde que Devis, Factures, Notes et Bilan ;
     - sur ordinateur, les liens Paramètres, Guide et avis passent dans le bloc du bas ;
     - les liens vers la Carte mentale sont retirés (`Sidebar.tsx:294-300`, `:377-382`).
   - Fichier : `components/dashboard/Sidebar.tsx`.
   - Risques :
     - la barre du haut collante et la zone de l'encoche ;
     - la cloche et la feuille ouvertes en même temps ;
     - ajouter `aria-expanded` (`:248`) ;
     - garder la confirmation de déconnexion et l'événement `compyo:ouvrir-retour`.
2. **La page Argent, en ajout.**
   - Ce que fait le lot :
     - une nouvelle route `/dashboard/argent` (`page.tsx` et `loading.tsx`) ;
     - une nouvelle bibliothèque `lib/argent.ts`, qui reprend les seuils et les calculs de `app/dashboard/page.tsx:36-44`, `:263-289` et `:372-405` ;
     - le total repris de `lib/activite.ts:301-305` ;
     - l'accueil appelle la même fonction ;
     - « Voir les N » d'« En attente du client » mène à Argent : `VueAccueil.tsx:101` envoie aujourd'hui vers les devis, même pour une facture ;
     - une ligne « Argent » provisoire en tête de Plus ;
     - un filtre initial `?statut=` pour « Voir les N » dans les listes (`ListeFacturesRecherchable.tsx:49`, `ListeDevisRecherchable.tsx:56`).
   - Risques :
     - l'accueil et Argent divergent : une seule fonction pour les deux ;
     - le total diffère de celui du Bilan ;
     - les règles 1, 3 et 7 du langage.
3. **La bascule.** C'est le seul lot qui change une habitude. Il est réversible par une constante.
   - Ce que fait le lot :
     - la 5e case devient Argent, active sur `/argent`, `/devis`, `/factures` et `/bilan` ;
     - la feuille Plus et `SECONDAIRES` sont retirés ;
     - le pied d'Argent est créé ;
     - `FeuilleCapture.tsx` gagne une 4e ligne vers `/dashboard/notes/nouvelle`, sans rappel par défaut ;
     - `CentreNotifications.tsx:179-185` passe à 48 px.
   - Risques :
     - `--barre-bas` (hauteur inchangée) ;
     - la barre qui s'efface pendant la saisie (e2a9972) ;
     - l'événement `compyo:capture` ;
     - le retour Android (6f643ef) ;
     - les bancs `app/apercu-moins` et `app/apercu-guide`, qui montent la `Sidebar` ;
     - les captures du guide à régénérer (la cible du [+], `captures.json` « nouveau-plus », ne bouge pas).
   - Le fondateur prévient les testeurs le jour même.
4. **« À facturer »**, après la décision 2.
   - Ce que fait le lot : la règle dans `lib/argent.ts` et un bloc dans Argent.
   - Risques :
     - de faux positifs dus aux acomptes et aux avoirs ;
     - la dépendance au statut `termine`.
   - Il n'y a aucun lanceur de tests (`package.json:5-12`) : on vérifie la règle sur le banc `/apercu-moins` (acompte, avoir, solde nul).

## 6. Ce que le fondateur doit trancher (hors code)

1. **Le mot de la 5e case.** Je recommande « Argent » : il est court, tient sous l'icône et dit ce qu'il contient. L'autre choix est « Factures ». Ni « Bureau », ni « Devis et factures », trop long.
2. **La règle « À facturer »** : chantier terminé, devis accepté, et solde après acomptes et avoirs. Et la promesse du total : il doit égaler celui du Bilan.
3. **Les titres des blocs d'Argent.** Je propose « En attente du client », comme sur l'accueil, et « Devis à envoyer ».
4. **La signature d'une relance envoyée par Sylvie depuis son WhatsApp.** Aujourd'hui, `signer()` met un nom et l'entreprise (`lib/messagesClient.ts:54-59`). Est-ce « Gérard Martin, Martin Plâtrerie » ou « Sylvie, pour Martin Plâtrerie » ?
5. **La date de la bascule et le message aux testeurs**, sans infobulle.
6. **La Carte mentale** n'a plus aucun lien dans l'application : à confirmer.

## Annexe : vérifié dans le dépôt

- **La barre.** `Sidebar.tsx:74-88` : 3 destinations et 6 secondaires, dont Guide. `:211` : 5 colonnes. La feuille Plus est en `:261-313`. Sur ordinateur, `SECONDAIRES` et « Idées et retours » sont en `:360-382`.
- **L'accueil.** Il porte déjà l'argent : « À faire de votre côté » et « En attente du client » avec « Relancer » (`VueAccueil.tsx:86-122`, calculés en `page.tsx:372-405`). Il tient en une colonne `max-w-2xl` (`:56`).
- **Le soir.** Après 17 h, seule la carte du haut change (`VueAccueil.tsx:66`) : les blocs d'argent restent.
- **Les factures et les notes de l'accueil.** Les factures sont limitées à `emise`, hors avoirs (`page.tsx:145-151`). Les notes, aux notes avec rappel (`:152-153`).
- **« À facturer »** n'existe nulle part. Le total à encaisser existe déjà dans le Bilan (`lib/activite.ts:301-305`, `VueBilan.tsx:214`).
- **Le [+].** Il n'a pas de ligne « note » (`FeuilleCapture.tsx:23-45`). « Voir toutes les notes » est en `text-xs` (`CentreNotifications.tsx:179-185`).
- **La mesure.** Le tableau de bord est mesuré : `MesureAudience.tsx:34`, et `lib/statistiques/audience.ts:109-110` n'exclut que `/admin` et `/api`.
- **La Carte mentale** est liée depuis le site vitrine (`components/marketing/Cadre.tsx:130,408`). Le Bilan est lié par l'e-mail mensuel (`app/api/cron/bilan-mensuel/route.ts:94`).
