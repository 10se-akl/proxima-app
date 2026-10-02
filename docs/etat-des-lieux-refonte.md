# État des lieux avant la refonte

*Branche `refonte-app`, partie de `f8d263b` (1er octobre 2026). Tout ce qui suit vient du code relu, pas des intentions. Le détail, avec les `fichier:ligne`, est dans `refonte-maquettes/_inventaire/` :*
- *01 — les écrans et les mesures ;*
- *02 — ce qui a été fait des deux prompts précédents ;*
- *03 — l'équipe et la sécurité ;*
- *04 — le langage visuel ;*
- *05 — le comportement des écrans cœur.*

**Captures.** Elles sont dans `refonte-maquettes/captures/avant/<écran>-<360|390|1440>-<clair|sombre>.png` : 30 écrans, 180 images, prises avec Edge sans fenêtre (`refonte-maquettes/outils/captures.mjs`). Elles viennent du banc d'aperçu à données simulées (`/apercu-moins`, non versionné), et non de la vraie base : `.env.local` pointe sur la production, donc aucune donnée n'a été lue ni écrite pour les obtenir.

**Ce que ces captures ne montrent pas.** L'écran Équipe (il faut une session réelle) et le partage WhatsApp (il faut un vrai téléphone).

---

## 1. Les mesures « avant »

| Mesure | Avant | Comment c'est compté |
|---|---|---|
| Destinations de navigation sur téléphone | **10** | 3 dans la barre (Aujourd'hui, Projets, Planning) et 7 derrière « Plus » : Devis, Factures, Notes, Bilan, Paramètres, Guide, Carte mentale (`Sidebar.tsx:74-88, 261-313`). Il faut ajouter le [+], la cloche et « Donner mon avis ». |
| Blocs sur Aujourd'hui, jour chargé | **6** | L'en-tête et 5 blocs. « À confirmer » n'a pas de plafond (`AConfirmer.tsx:139`). Cela fait environ 20 lignes et 30 à 35 cibles d'appui. |
| Mots sur Aujourd'hui, jour chargé | **≈ 170** le jour, **≈ 230** après 17 h | Libellés statiques et gabarits dynamiques, blocs remplis à leur plafond (méthode : inventaire 01 §2). |
| Gestes pour démarrer la dictée d'un nouveau projet | **5 appuis + le nom tapé au clavier** | [+], Écrire moi-même, Dicter, Terminé, puis le nom au clavier, puis Créer. Le grand micro a été retiré le 27/09 (`91bc744`). |
| Gestes pour valider un devis | **6** (8 depuis Aujourd'hui) | Valider, puis « Envoyer au client » (qui **n'envoie rien** : il fige le devis), puis Partager, l'application, le contact et Envoyer. « Relire le devis » sur Aujourd'hui ouvre la fiche et non le devis. |
| Écrans distincts | **18** routes `/dashboard` et **≈ 27** routes côté artisan | Il faut y ajouter environ 30 feuilles et modales. |
| Champs obligatoires à l'inscription et à la première utilisation | **8** à la candidature, **0** à l'accueil, **12** « à compléter » pour un premier devis conforme | Soit 22 champs avant un premier devis conforme. Rien ne les guide (`lib/parametres/index.ts:168-181`). |
| Endroits où l'on gère l'équipe | **2** | Paramètres › Équipe (`EquipeSection`), et `/dashboard/equipe` (`GestionEquipe`), qui n'est reliée nulle part. |

---

## 2. Écran par écran

Chaque ligne donne le rôle de l'écran en une phrase, la douleur de la recherche à laquelle il répond, ce que les deux prompts précédents y ont laissé, et un verdict : **garder**, **simplifier**, **fusionner** ou **supprimer** (de la navigation ou de l'affichage seulement : aucune route ni donnée n'est supprimée).

| Écran (capture) | Rôle | Douleur | Prompts précédents | Verdict |
|---|---|---|---|---|
| **Aujourd'hui** (`accueil-charge`, `-vide`, `-premier`) | Dire quoi faire maintenant. | Journée qui ne se ferme jamais | Lot B fait : 5 blocs au plus. Le plafond d'« À confirmer » manque. Les bornes du jour sont calculées en UTC. | **Simplifier** (duel C) |
| ↳ **Fermer la journée** (`accueil-soir`) | À partir de 17 h, ce qui reste en suspens (Fait / Demain) et demain. | Journée qui ne se ferme jamais | Lot E fait. Le bouton « C'est bon pour aujourd'hui » a été retiré (`f8d263b`) : il ne changeait rien. « Demain » déplace un rendez-vous client sans le prévenir. | **Garder**, corriger « Demain » (duel C) |
| ↳ À confirmer | Les rendez-vous passés et les chantiers sans suite (oui / non). | Journée qui ne se ferme jamais | Fusion faite (lot B). Pas de plafond. | **Simplifier** |
| **Projets** (`projets-50`, `projets-0`) | Chercher et ouvrir un projet. | Information éparpillée | — | **Garder** |
| **Fiche projet** (`fiche-nouveau`, `-chantier`, `-long`) | Tout un chantier sur une page. | Information éparpillée, photos introuvables, silence avec le client | Lot D fait (Message dans l'en-tête). « Bien reçu » n'apparaît qu'en partie (rien après « Photo ou capture », ni sans numéro). À 360 px sans défiler : l'en-tête et « Maintenant » seulement. | **Simplifier** (duel D) |
| ↳ Ajouter au projet ([+] sur une fiche) | Dicter, Photos, Note, Rendez-vous. | Terrain et bureau | — | **Garder** (le bon modèle) |
| ↳ Message au client (`message`) | Messages déjà écrits, envoyés par SMS ou WhatsApp. | Silence avec le client, impayés | Fait (lot D). Une seconde feuille, « Message au client » avec un texte IA à copier, porte le même titre. | **Fusionner** les deux feuilles |
| ↳ Facturation du projet (`factures-projet`) | Acompte, facture, avoir, paiement. | Impayés, administratif du soir | Pas de brouillon local (H.2 partiel). | **Garder** |
| **Capture** (`capture`) | Coller, Photo ou capture, Écrire moi-même. | Appels, information éparpillée | Lot C annulé : micro retiré. Une phrase d'explication sous chaque choix. | **Simplifier** (duel E) |
| ↳ Coller (`importer`), Captures (`importer-capture`), Écrire (`nouvelle`) | Trois écrans qui finissent tous par un brouillon de projet. | Information éparpillée | Le repli manuel après un échec de l'IA perd le texte partagé. | **Fusionner** (duel E) |
| ↳ Arrivée d'un partage WhatsApp | Le chemin le plus court qui existe aujourd'hui. | Appels | Inchangé, non retesté. | **Garder** |
| **Planning** (`planning-mobile`, `planning-grille`) | Les rendez-vous, les tâches et les alertes météo. | Silence avec le client, journée qui ne se ferme jamais | L'agenda mobile est fait. Annuler ou déplacer ne propose pas de prévenir le client. L'anti-chevauchement porte sur toute l'organisation. | **Simplifier** (duel G) |
| ↳ Nouveau rendez-vous (`rdv`) | Créer ou modifier un rendez-vous. | — | Il faut 8 à 9 gestes ; depuis une fiche, le titre et la date sont vides. | **Simplifier** (duel G) |
| **Devis** (liste) (`devis-liste`) | Tous les devis, avec des filtres. | Impayés | — | **Fusionner** (duel B) |
| **Espace devis** (`devis`, `devis-pret`, `devis-envoye`) | Modifier, valider, envoyer et suivre un devis. | Peur de mal faire, administratif du soir | Lot F fait (complétion sur place). « Envoyer au client » n'envoie rien. 11 sections dans l'éditeur. À 390 px, aucune ligne du devis n'est visible sans défiler. | **Simplifier** (duel F) |
| **Factures** (liste) (`factures-liste`) | Toutes les factures, avec des filtres. | Impayés | — | **Fusionner** (duel B) |
| **Notes** (`note`) | Toutes les notes groupées. | Journée qui ne se ferme jamais | La même donnée apparaît aussi sur Aujourd'hui, dans la cloche et dans la pop-up de rappel. | **Fusionner** (duel B) |
| **Bilan** (`bilan`) | Les chiffres du mois. | Administratif du soir | — | **Sortir de la navigation principale** (duel B) |
| **Paramètres** (`parametres`) | 8 groupes repliés, environ 31 champs. | Peur de mal faire | Lot F fait (groupes repliés). | **Garder** |
| ↳ Équipe (Paramètres) | Membres, invitation, retrait (`window.confirm`). | Terrain et bureau | — | Duel A |
| **Équipe** (page `/dashboard/equipe`) | Doublon de la section Paramètres, relié nulle part. | — | — | **Supprimer de l'usage** (la route reste) |
| **Guide** | Mode d'emploi en 8 moments. | Peur de mal faire | Ajouté après les prompts (`b0c0bdc`), en 6e entrée de « Plus ». | **Sortir de la navigation** |
| **Carte mentale** | Les retours de la bêta (outil du fondateur). | Aucune | Sortie de la barre, mais encore dans « Plus ». | **Sortir de la navigation** |
| **Pop-up de rappel** (`rappel`) | Une modale qui bloque l'écran quand un rappel tombe. | Journée qui ne se ferme jamais | — | **Simplifier** |
| **Accueil du premier lancement** (`onboarding`) | 4 écrans de bienvenue et l'installation. | Aucune | — | **Simplifier** |
| **Demander l'accès** (`demander-acces`) | La candidature à la bêta. | — | Pas de brouillon local (H.2 partiel). | **Garder** (hors refonte) |
| **Connexion** (`login`) | Adresse e-mail et mot de passe. | — | Retour à l'écran demandé : fait. | **Garder** |

**Composants morts, plus importés nulle part.** `NouveauProjetMenu`, `ConseilsCompagnon`, `MiniApercu`, `ResumeJournee`, `ModeNuitToggle`, `NotesRappelsAujourdhui`, `CaseEvenement`. La route `/dashboard/retours` ne fait que rediriger.

---

## 3. Ce que les deux prompts précédents ont laissé

**« Moins mais mieux » (lots A à H).**
- **Faits :** A (barre du bas), B (5 blocs), D.1, D.2, F, G (derrière un drapeau désactivé) et H.1 (budget de notifications).
- **Annulés ensuite par le fondateur :**
  - le grand micro (lot C) ;
  - le bouton « C'est bon pour aujourd'hui » (lot E).
- **Partiels :**
  - D.3.3, « bien reçu » : absent après « Photo ou capture » ;
  - D.3.5 : une notification groupée renvoie sur Aujourd'hui ;
  - H.2, brouillons : facture, import et candidature non couverts.
- **Absents du dépôt :** les mesures avant / après et les captures.

**« Téléphone et bugs ».**
- **Faits :**
  - les zones tactiles ;
  - l'anti-zoom iOS ;
  - la barre du bas qui s'efface pendant la saisie ;
  - le chargement sans fin ;
  - le retour à l'écran demandé après connexion ;
  - le rechargement PWA ;
  - les photos depuis la galerie ;
  - l'agenda mobile ;
  - l'aperçu PDF différé ;
  - la dictée Android ;
  - le geste retour.
- **Absents :**
  - le devis en mode paysage ;
  - le mode sombre des écrans récents ;
  - la liste des bugs classée ;
  - le protocole de test sur un vrai téléphone.

**Ce qui contredit une demande.**
- Une dépendance `three` a été ajoutée sur la vitrine, à la demande du fondateur.
- Le Guide est devenu une 6e entrée de « Plus ».
- « Demain » dans « Fermer la journée » déplace un rendez-vous client sans le prévenir.

---

## 4. Le langage visuel actuel (résumé de l'inventaire 04)

- **Deux générations cohabitent.** L'ancienne utilise `<Card>`, un `<Button>` terracotta et du texte petit. La nouvelle utilise des lignes avec un anneau, `min-h-12` et une action principale en **anthracite**.
- **Tailles et formes.** On compte 26 tailles de texte, dont 40 % à 12,5 px ou moins (des libellés de 10 px dans l'éditeur de devis), et 8 recettes de carte.
- **Couleurs.** 28 hex et 135 `white`/`black` sont codés en dur. Il n'y a pas de token « danger » : erreur, accent et danger sont tous terracotta. Le blanc sur terracotta donne 3,7:1, sous le niveau AA.
- **Accent.** Sur le premier écran de la fiche projet, on compte 10 à 15 apparitions de l'accent `signal`.
- **États manquants.** Il n'y a pas de `loading.tsx` pour la fiche, pas d'`error.tsx`, aucun indicateur hors-ligne, aucun retour tactile. La fin d'une tâche se traduit le plus souvent par une disparition muette.
- **Bug corrigé dans cette branche** (`7e51a30`). Les règles tactiles (cibles de 44/48 px, anti-zoom iOS) dépendaient du réglage « Réduire les animations ».

---

## 5. Équipe et sécurité (résumé de l'inventaire 03)

**Le modèle.**
- Une organisation, deux rôles (`proprietaire`, `employe`) sans contrainte CHECK, `unique(user_id)`.
- Toutes les politiques reposent sur `mes_organisations()` et ne regardent jamais le rôle.
- Les photos et le logo sont rangés par utilisateur (`{uid}/…`).
- Environ 45 fichiers supposent une seule organisation (`.maybeSingle()` dans `lib/organisation.ts`).

**Failles relevées par l'audit.**
- **Corrigées dans cette branche (`1995ce2`) :**
  - F1 : le plafond IA ne s'appliquait jamais ;
  - F2 : une invitation pouvait être détournée par l'e-mail du profil.
- **À traiter avec le duel A :**
  - F3 : la suppression d'une demande efface ses factures en cascade ;
  - F4 : le verrou du devis validé est contournable ;
  - F5 : la numérotation des factures peut être appelée sans contrôle d'organisation ;
  - F6 : les photos sont rangées par utilisateur ;
  - F7 : un membre retiré continue de recevoir les notifications ;
  - F8 et F9 : aucun rôle n'est vérifié en base ;
  - F10 : les abonnements push sont ouverts à toute l'organisation ;
  - F11 : la signature publique d'un devis accepte une adresse IP falsifiée ;
  - F13 : la création de compte révèle si une adresse existe.

**Le retrait d'un membre.** L'accès est coupé dès la requête suivante (la RLS est évaluée à chaque appel). Les URL signées déjà émises restent valables une heure.
