# Duel D (fiche projet) : critique adverse

Gravité : **B**loquante, **S**érieuse, **m**ineure. Références `fichier:ligne` vérifiées dans le dépôt au 02/10.

## Faits vérifiés qui commandent plusieurs candidats

- **F1. L'écoute ne démarre pas à l'ouverture.** `NotesVocales.tsx:238` est un bouton « Dicter une note » ; `demarrer()` (l. 96-135) ne part que sur clic. Réel aujourd'hui : [+] · Dicter · « Dicter une note » · Arrêter · Ajouter = 5. Pour arriver à 3, il faut un démarrage au montage, et il est dangereux : `demarrer()` fait `setTranscription("")` (l. 111) et l'effet l. 75-86 supprime alors le brouillon local restauré (l. 60-73). Une note interrompue (appel, coupure) est effacée à la réouverture : « rien ne se perd » est violé. Aucun nettoyage au démontage (pas d'`abort()`) : fermer par le geste retour laisse le micro ouvert. Une erreur réseau (`dictee.ts:77`) devient la première chose qu'on voit.
- **F2. Appareil ET galerie en un geste : non prouvé.** Depuis le 27/09 il y a deux champs (`PhotosProjet.tsx:183-206`) parce que `capture` force l'appareil. Rien dans le dépôt ne dit qu'un champ sans `capture` offre les deux. À ma connaissance, Chrome Android récent (Android 13+) ouvre le sélecteur système : galerie multiple, pas d'obturateur. À tester sur 2-3 appareils avant toute promesse. De plus `Feuille.tsx:89` rend `null` fermée : les champs n'existent que feuille ouverte, donc sortir le champ oblige à remonter l'état d'envoi, d'erreur et de nouvelle tentative.
- **F3. Le Carnet ne contient pas « ce qui avait été convenu ».** `entreesCarnet.ts:122-134` : une note n'y entre qu'une fois cochée. Le mémo (`demandes.notes`), les tâches actives, les rendez-vous à venir et les lignes de devis ne sont jamais cherchés. Une note « écrite » (FormulaireNote) est une tâche de « À faire ».
- **F4. Terminer est irréversible, facturer est immédiat.** Seules écritures de statut : `page.tsx:726` et `:754`, aucun retour. `FacturesProjet.tsx:87-118` crée une facture numérotée en un appui, sans confirmation (défaire = un avoir).
- **F5. Météo et « Prévenir le client » vivent dans le planning** (`GrilleAgenda.tsx:267`, `AgendaMobile.tsx:253`) ; la fiche ne passe pas `meteo` (`VueProjet.tsx:461`). Le risque porte sur `FeuilleMessageClient`, partagé par 4 appelants. Les prénoms des coéquipiers sont lisibles (policy `schema.sql:650`) : pas de blocage.

## A : ne rien changer
1. **S** La douleur du duel n'est pas traitée (A l'admet : 60/100). Carnet à 1 274 px, photo et dictée à 5 gestes. C'est la ligne de base, pas une solution.
2. **S** « Une feuille de message, risque faible » est optimiste : la feuille IA (`page.tsx:1236-1259`) est un `textarea` éditable avec « Proposer une autre version », alors que `FeuilleMessageClient` s'annonce « sans écran d'édition » et sert aussi au planning et à `AConfirmer`.
3. **m** « Terminer » passe à 2 gestes mais reste sans retour (F4) : la question ne remplace pas un « Rouvrir ».
Affirmations vérifiées : `Blocs.tsx:406` (blur) vrai ; `page.tsx:748` vrai ; deux feuilles vrai.

## B : un en-tête, une action, un fil
1. **B** « Dicter écoute déjà » : la ligne citée (`NotesVocales.tsx:238`) prouve l'inverse, et le démarrage automatique efface le brouillon (F1).
2. **B** Perte de la vue d'argent. Dossier et Facturation partent de l'affichage, mais `FacturesProjet.tsx:214-300` porte « Marquer payée », l'avoir, Voir/Imprimer, l'export CSV, l'acompte avec garde de dépassement et le reste à facturer. B ne dit pas où vit chacun. Le solde n'apparaît qu'à l'étape « À facturer ». Le soir sur ordinateur : une colonne de 672 px, plus de colonne droite fixe.
3. **S** Renverse le 27/09 (`Carnet.tsx:200-205`, « Demande d'Axel : pour que la fiche reste propre »). Le motif d'Axel était la propreté, pas la hauteur ; B répond par un autre argument. Troisième changement en six jours (`periodesOuvertesParDefaut`, `entreesCarnet.ts:225`, existe encore, inutilisé). « 5 lignes puis Voir les N » ne dit pas si les périodes repliées survivent : chantier d'un an = liste plate.
4. **S** Import galerie enterré : ⋯ › Photos du projet › Galerie · 3 vignettes · Ajouter = 7 (B écrit « 4 pour une photo » : c'est 5), en haut à droite, hors pouce, alors que la douleur du 27/09 est la photo reçue sur WhatsApp. La barre globale (`Sidebar.tsx:209`) disparaît : plus d'Accueil ni de Planning sur la fiche.
5. **S** « Écrire » crée une tâche (F3) : la « Note » montrée dans le Carnet du rendu n'existe pas aujourd'hui, ou elle double « À faire » (`entreesCarnet.ts:122`). Passer FormulaireNote à un champ touche un composant partagé et son brouillon.
6. **m** « Terminer » = 3 gestes (⋯, Terminer, Oui) et « facturer le solde » = 1, absents du tableau ; risque 9/15 pour 11 fichiers.

## C : la fiche suit l'étape
1. **B** La douleur n'est pas traitée : le Carnet reste le dernier bloc, la recherche ne bouge pas, et « retrouver » manque au tableau.
2. **S** Gestes faux. « Dicter 3 » suppose le démarrage automatique, mais `NotesVocales.tsx` n'est pas dans les fichiers touchés (réel : 4). Avec un champ unique sans `capture`, la prise de vue coûte Photo · case appareil · déclencheur · ✓ = 4 par photo, soit 12 pour 3 (aujourd'hui 11) ; « galerie 5 » et « prise de vue 4 » ne tiennent pas avec « deux champs en repli ».
3. **S** « `prochaineAction.ts` tel quel » et « `page.tsx` touché seulement pour la confirmation » sont faux. La principale `en_cours` est « ajouter » (l. 120) ; `termine` ne propose « Voir la facturation » que si le devis est `envoye` (l. 108). Le « reste à facturer en 30 px » et le bouton solde exigent la liste des factures, aujourd'hui chargée dans l'état interne de `FacturesProjet` : il faut la remonter. Facture numérotée en 1 appui, mais Terminer en demande 3 : incohérent.
4. **S** La forme dépend du `statut`, c'est-à-dire de l'administratif que Gérard oublie (« Démarrer le chantier »). Les 3 étapes n'ont pas de place pour « Signé » ni pour un devis refusé. À « À facturer », la rangée Photo disparaît (rendu) et il n'y a pas de retour (F4) : pas de porte pour les reprises.
5. **S** [+] « Ajouter » devient « Nouveau » sur la fiche (renverse le 26/09) : le doigt habitué crée un projet par erreur.

## D : ordre fixe, blocs conditionnels
1. **B** Même démarrage automatique que B : brouillon de dictée effacé (F1).
2. **S** Gains gonflés : la base « 3 photos appareil = 15 » est 11 (A et B le disent, la feuille reste ouverte), donc le gain réel est −2, pas −6. « 3 appareil » et « 5 galerie » sont incompatibles avec un seul « champ direct » (F2). « Si l'un échoue, rien ne casse » est faux : sans caméra dans le sélecteur, la prise de vue en un geste disparaît.
3. **S** La carte « bien reçu » (`VueProjet.tsx:296-320`) est supprimée : c'était le rappel proactif après capture ou partage WhatsApp (`?cree=1`) ; on passe de 1 appui à Message + choix, sans rappel. La suggestion `accuse` est la 5e règle (`messagesClient.ts:292`), coupée par `slice(0,3)` si un rendez-vous ou une facture existe : « première suggestion » n'est pas garanti.
4. **S** Le Dossier disparaît. La grille des photos avec ✕ (`PhotosProjet.tsx:161-170,270-305`) n'existe que dans la feuille, et la Visionneuse ne supprime rien. « Déjà N autres chantiers ensemble » (`Blocs.tsx`, Dossier) part avec le client dans « … ». « Boutons secondaires déjà dans ⋯ » est faux : Facturer un acompte, Démarrer maintenant, Dupliquer ou Repartir du devis et les alertes ne sont pas dans `VueProjet.tsx:232-244`. « Marquer payée », l'avoir et le CSV n'ont plus de lieu.
5. **S** « Terminer le chantier » est le seul bouton de Maintenant en chantier, collé à Photo · Dicter · Note (rendus 1b, 2a) : confirmé, mais l'irréversible prend la place d'honneur. Deux portes d'ajout (bande et [+], aveu de D). « Préparer la facture » = 1 appui sans question (F4).
6. **m** Texte sur deux lignes assumé (règle 2) ; « les photos n'ont pas d'auteur » est faux : le chemin commence par `user.id` (`PhotosProjet.tsx:97`).

## Recompte (appui, choix, validation ; parler non compté)
| Tâche | Réel | A | B | C | D |
|---|---|---|---|---|---|
| 3 photos, galerie | 7 | 7 | 7 | 5 si F2 | 5 si F2 |
| 3 photos, appareil | 11 | 11 | 9 | 12 | 9 si champ `capture` (sinon 12) |
| Dicter | 5 | 5 | 3 si démarrage auto (brouillon à protéger) | 4 | 3 idem |
| Retrouver « la fenêtre » | ≈4 | 4 | 2, dictées seulement | ≈4 | 2, dictées seulement |
| Facturer le solde | 2 | 2 | 1 | 1 | 1 |
| Terminer | 1 | 2 | 3 | 3 | 2 |

## Ce qu'aucun candidat ne traite
- **Retrouver ce qui a été convenu.** La recherche ignore le mémo, les tâches et les devis ; une note écrite n'y entre qu'une fois cochée (F3). La loupe plus haut ne règle que le cas des dictées.
- **Terminer sans retour.** Une question avant, jamais de « Rouvrir » : les reprises de fin de chantier restent sans porte.
- **L'alerte « Le projet a changé depuis le devis »** (`prochaineAction.ts:125,144`). Chaque photo et chaque dictée appellent `signalerModification()` (`page.tsx:1069,1086`) ; photographier plus vite la déclenche plus souvent. Où vit-elle quand Maintenant n'a qu'un bouton ?
- **Photos en vol.** Aucune file d'attente (`sw.js`) : le « Réessayer » de D et B suppose de garder les fichiers en mémoire, ce que `ajouterPhotos` ne fait pas.
- **Un test sur appareil** (Android d'entrée de gamme, gants, 4G) avant les lots photo et dictée : deux candidats sur trois promettent des gains qui en dépendent.
