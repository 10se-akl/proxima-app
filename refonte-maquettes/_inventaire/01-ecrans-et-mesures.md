# 01 — Inventaire des écrans et mesures « avant »

*Compyo, application connectée — état du code au 01/10/2026. Lecture seule, aucune exécution. Toutes les références sont `fichier:ligne`.*

Légende des douleurs artisan : **Journée** (journée qui ne se ferme jamais) · **Soir** (administratif du soir) · **Éparpillé** (information éparpillée) · **Silence** (silence avec le client) · **Appels** (appels / immédiateté) · **Impayés** (impayés / gêne de relancer) · **Conformité** (peur de mal faire) · **Photos** (photos introuvables) · **Terrain↔bureau** · **Aucune**.

Légende des propositions : **Garder** · **Simplifier** · **Fusionner** (avec quoi) · **Sortir de la nav** · **Supprimer**.

---

## 0. Hors périmètre (site vitrine — existe, non inventorié)

`app/page.tsx`, `a-propos`, `beta`, `cgu`, `comment-ca-fonctionne`, `comparatif`, `confiance`, `contact`, `fonctionnalites`, `mentions-legales`, `metiers`, `metiers/[slug]`, `politique-de-confidentialite`, `pourquoi-compyo`, `questions-frequentes`. Le seul lien depuis l'application vers ces pages : « Site vitrine · Contact » en bas de la barre latérale ordinateur (`components/dashboard/Sidebar.tsx:126-136`) — rien sur téléphone.

---

## 1. Inventaire des écrans

### 1.1 Cadre commun (présent sur tous les écrans connectés)

| Élément | Entrée | Rôle | Douleur | Accès téléphone | Blocs / actions | Proposition |
|---|---|---|---|---|---|---|
| Barre du haut (téléphone) | `components/dashboard/Sidebar.tsx:197-203` | Logo + cloche de notifications. | Éparpillé | Toujours visible | 1 bloc, 1 action (cloche) | **Garder** — mais la cloche fait doublon avec la pastille « en retard » d'Aujourd'hui (voir §3, constat 4). |
| Barre du bas | `Sidebar.tsx:206-259` | 5 cases : Aujourd'hui · Projets · [+] Nouveau · Planning · Plus. | Terrain↔bureau | Toujours visible | 1 bloc, 5 actions | **Garder** la forme ; revoir le contenu de « Plus » (voir mesure 1). |
| Feuille « Plus » | `Sidebar.tsx:261-313` | 6 liens (Devis, Factures, Notes, Bilan, Paramètres, Guide) + « Donner mon avis » + « Ce que disent les artisans » + thème + installer + déconnexion. | Aucune | Barre du bas > Plus | 3 blocs, 11 actions | **Simplifier** — 6 destinations de même poids derrière un tiroir : c'est le même « menu à dix entrées » que le commentaire `Sidebar.tsx:30-33` dit avoir supprimé, déplacé d'un cran. |
| Centre de notifications | `components/notifications/CentreNotifications.tsx` | Liste des notes actives avec rappel, à cocher. | Journée | Barre du haut > cloche | 1 panneau, 2 actions par note | **Fusionner** avec la liste « Aujourd'hui » de l'accueil : même donnée (commentaire `CentreNotifications.tsx:12-17`). |
| Pop-up de rappel | `components/notes/PopupRappel.tsx` (monté `app/dashboard/layout.tsx:75`) | Modale bloquante quand un rappel tombe pendant l'usage. | Journée | Automatique, n'importe quel écran | 1 modale, 2 actions | **Simplifier** — une modale bloquante pendant une saisie de devis est risquée ; une bannière suffit. |
| Onboarding `PremierLancement` | `components/onboarding/PremierLancement.tsx` (monté `layout.tsx:70`) | 4 écrans de bienvenue + proposition d'installation, une fois par navigateur. | Aucune (pédagogie) | Automatique au 1er lancement | 4 écrans, 0 champ, 2-3 actions par écran | **Simplifier** — réduire à 1 écran (« installer / continuer ») ; les écrans 1-3 expliquent ce que l'artisan va découvrir en le faisant. |
| ↳ Exemple de devis | `components/onboarding/ExempleDevisModal.tsx` | Devis fictif en modale, lancé depuis l'écran 1 de l'onboarding. | Conformité | Onboarding > « Voir un exemple de devis » | 1 modale, 1 action | **Supprimer** avec la simplification de l'onboarding. |
| Bouton « Faire un retour » | `components/dashboard/BoutonRetour.tsx` (monté `layout.tsx:69`) | Parcours de retour en 4 étapes (catégorie → sous-catégorie → importance → précisions). | Aucune | Caché sur téléphone (`BoutonRetour.tsx:64` `hidden sm:flex`) ; Plus > « Donner mon avis » | 4 étapes, ~9 actions | **Garder** hors navigation (outil bêta) ; réduire à 2 étapes. |
| Invitation à installer / mise à jour | `components/pwa/InstallPWA.tsx`, `MiseAJourPWA.tsx` (montés `app/layout.tsx:309-310`) | Cartes « installer l'app » et « nouvelle version ». | Terrain↔bureau | Automatique | 1 carte chacune | **Garder** ; ne jamais les afficher en même temps que l'onboarding. |

### 1.2 Écrans principaux (application connectée)

| # | Écran | Entrée (fichier) | Rôle en une phrase | Douleur | Accès téléphone | Blocs / actions (≈) | Proposition |
|---|---|---|---|---|---|---|---|
| 1 | **Aujourd'hui** | `app/dashboard/page.tsx` → `components/accueil/VueAccueil.tsx` | Dire quoi faire maintenant : une action phare, puis ce qui est à confirmer, à faire, à attendre du client. | Journée, Impayés | Barre du bas, onglet 1 (+ pastille retard `layout.tsx:42-49`) | 6 blocs (en-tête + 5 blocs conditionnels) ; 20-35 cibles un jour chargé | **Simplifier** — plafonner « À confirmer » (non plafonné, voir mesure 2) et fusionner « Aujourd'hui » et « À confirmer » (deux listes de rendez-vous). |
| 1b | ↳ Fermer la journée (le soir) | `components/accueil/FermerJournee.tsx` | À partir de 17 h, remplace « Maintenant » : bilan du jour, ce qui est en suspens (Fait / Demain), le premier rendez-vous de demain. | Journée, Soir | Aujourd'hui après 17 h (`app/dashboard/page.tsx:34`, `:292-307`) | 3 lignes, 2 actions × 5 éléments max | **Garder** — c'est la réponse la plus directe à « la journée ne se ferme jamais ». |
| 1c | ↳ À confirmer / Chantier terminé ? | `components/dashboard/AConfirmer.tsx`, `ConfirmerClotureProjet.tsx` | Questions oui/non sur les rendez-vous passés et les chantiers sans suite (replanifier si « Non »). | Journée, Éparpillé | Bloc d'Aujourd'hui | 1 carte par élément, 2-4 actions par carte, liste **non plafonnée** (`AConfirmer.tsx:139`) | **Simplifier** — 3 cartes max + « Voir les N », comme les autres blocs (`components/accueil/Blocs.tsx:12`). |
| 2 | **Projets** (liste) | `app/dashboard/demandes/page.tsx` → `ListeProjetsRecherchable.tsx` | Rechercher et ouvrir un projet. | Éparpillé | Barre du bas, onglet 2 | 3 blocs (titre, astuce de partage, liste) ; recherche + 1 action par projet | **Garder** ; l'astuce `AstucePartage` disparaît après lecture. |
| 3 | **Fiche projet** | `app/dashboard/demandes/[id]/page.tsx` (1 305 lignes) → `components/projet/VueProjet.tsx` | Tout un chantier sur une page : où on en est, ce qui reste, le mémo, le dossier (devis, factures, photos, client) et le Carnet chronologique. | Éparpillé, Photos, Terrain↔bureau, Silence | Projets > ligne ; Aujourd'hui > ligne ; Planning > événement | En-tête + bandeau « bien reçu » + 4 blocs (Maintenant, À faire, À retenir, Dossier) + Facturation + Carnet = **7-8 blocs** ; menu « ⋯ » 5-8 entrées (`VueProjet.tsx:233-242`) | **Garder** comme écran pivot ; **Simplifier** le menu « ⋯ » (« Résumer mes notes avec l'IA », « Devis express (sans IA) », « Marquer la visite effectuée » sont des doublons des actions de Maintenant). |
| 3a | ↳ Feuille « Ajouter au projet » | `VueProjet.tsx:404-447` | 4 tuiles : Dicter, Photos, Note, Rendez-vous. | Terrain↔bureau, Photos | [+] de la barre du bas sur une fiche (libellé « Ajouter », `Sidebar.tsx:156-167`) | 4 actions | **Garder** — c'est le bon modèle de capture. |
| 3b | ↳ Dictée de note vocale | `components/dashboard/NotesVocales.tsx` (rendu dans la feuille) | Dicter un compte-rendu rangé dans le projet (transcription navigateur). | Terrain↔bureau, Soir | Fiche > [+] > Dicter | 1 zone, 2-3 actions | **Garder**. |
| 3c | ↳ Photos du projet | `components/dashboard/PhotosProjet.tsx` + `components/projet/Visionneuse.tsx` | Prendre / choisir / voir les photos du chantier. | Photos | Fiche > Dossier > Photos, ou [+] > Photos | Grille + visionneuse plein écran | **Garder**. |
| 3d | ↳ Note ou rappel | `components/notes/FormulaireNote.tsx` | Note écrite avec importance et rappel daté. | Journée | Fiche > [+] > Note | ~6 champs, 5 actions | **Simplifier** — 6 champs pour un pense-bête. |
| 3e | ↳ Infos du client | rendu `infos` dans `VueProjet.tsx:453-455` | Modifier téléphone, adresse, type de chantier. | Éparpillé | Fiche > Dossier > client, ou menu « ⋯ » | 1 formulaire | **Garder**. |
| 3f | ↳ **Message au client** | `components/projet/FeuilleMessageClient.tsx` | 2-3 messages déjà écrits (accusé, rappel RDV, retard, décalage, météo, relance devis / paiement), chacun avec SMS ou WhatsApp. | Silence, Impayés | Fiche > icône message de l'en-tête ; lien « Relancer » d'Aujourd'hui (`?message=relance…`, `app/dashboard/page.tsx:387,397`) ; Planning | 2-3 cartes × 2 boutons | **Garder** — meilleure réponse au « silence client » et à la « gêne de relancer ». |
| 3g | ↳ Bandeau « Répondre bien reçu » | `VueProjet.tsx:293-317` | Juste après une capture, un appui pour accuser réception par SMS/WhatsApp. | Silence | Automatique après création (`?cree=1`) | 1 bloc, 2 actions | **Garder**. |
| 3h | ↳ Proposition « passer en urgent » | `components/dashboard/PropositionUrgence.tsx` | L'IA propose de passer le projet en urgent après une note. | Appels | Sous Maintenant de la fiche | 1 carte, 2 actions | **Simplifier** — le fondre dans « Maintenant » comme simple ligne. |
| 3i | ↳ Facturation du projet | `components/dashboard/FacturesProjet.tsx` + `FacturePreview.tsx` | Émettre acompte / facture / avoir, suivre le paiement. | Impayés, Soir | Fiche > Dossier > Facturation (`#facturation`) | ~5 actions | **Garder**. |
| 4 | **Nouveau projet — capture** | `components/navigation/FeuilleCapture.tsx` | 3 portes : Coller un message (IA), Photo ou capture (IA), Écrire moi-même. | Appels, Éparpillé | [+] de la barre du bas (hors fiche) ; boutons des états vides (`components/accueil/BoutonCapture.tsx`) | 3 actions | **Simplifier** — la dictée n'y est plus (`FeuilleCapture.tsx:11-17`) : le geste le plus naturel sur un chantier demande désormais 3 appuis (voir mesure 4). |
| 4a | Coller un message | `app/dashboard/demandes/importer/page.tsx` | Coller un SMS/WhatsApp ; l'IA prépare un brouillon de projet à valider. | Appels, Éparpillé | Capture > Coller un message | 1 champ, 2-4 actions puis écran Brouillon | **Fusionner** avec 4b et 4d dans un seul écran « Nouveau projet » (texte, photo ou voix). |
| 4b | Photo ou capture | `app/dashboard/demandes/importer-capture/page.tsx` | Envoyer des captures d'écran ; l'IA les lit et prépare le brouillon. | Appels, Photos | Capture > Photo ou capture | 1 sélecteur, 3-5 actions | **Fusionner** (voir 4a). |
| 4c | Brouillon de projet | `components/dashboard/BrouillonProjet.tsx` (+ `CorrespondanceProjetExistant.tsx`, `ConfirmationRdv.tsx`) | Revoir ce que l'IA a compris (≈10 champs marqués présent / absent), rattacher à un projet existant, confirmer le RDV détecté. | Éparpillé, Conformité | Après 4a, 4b ou un partage | ≈10 champs, 2 actions + bloc RDV 3 actions | **Simplifier** — n'afficher que les champs absents ou douteux. |
| 4d | Écrire moi-même | `app/dashboard/demandes/nouvelle/page.tsx` | Formulaire nom / téléphone / description, avec bouton Dicter. | Appels | Capture > Écrire moi-même | 3 champs (2 obligatoires, `:340-343`), 3 actions | **Fusionner** (voir 4a) et mettre la dictée en premier. |
| 4e | Arrivée d'un partage | `app/dashboard/demandes/partage/[id]/page.tsx` | Écran atteint après « Partager → Compyo » depuis WhatsApp/SMS (Android). | Appels | Hors app (feuille de partage du téléphone) | Brouillon (4c) | **Garder** — le chemin le plus court qui existe. |
| 5 | **Planning** | `app/dashboard/planning/page.tsx` → `components/planning/AgendaMobile.tsx` (tél.) / `GrilleAgenda.tsx` (ordi.) | Agenda des rendez-vous et tâches, alertes météo. | Journée, Terrain↔bureau | Barre du bas, onglet 4 | Tél. : 2 blocs (titre + agenda), « + Ajouter » ; ordi. : 4 blocs (titre, navigation semaine, légende, grille) | **Garder**. |
| 5a | Nouveau rendez-vous / tâche | `app/dashboard/planning/nouveau/page.tsx` | Créer ou modifier un événement (projet, date, heure, durée…). | Journée | Planning > + Ajouter ; Fiche > [+] > Rendez-vous | ~6 champs, ~10 actions | **Simplifier** — en feuille plutôt qu'en page. |
| 6 | **Devis** (liste) | `app/dashboard/devis/page.tsx` → `ListeDevisRecherchable.tsx` | Tous les devis, filtrés (Tous / À traiter / En attente / Acceptés / Refusés). | Impayés, Éparpillé | Plus > Devis | 3 blocs, 5 filtres + recherche | **Fusionner** avec Factures dans un seul écran « Argent » (devis à envoyer, en attente, à encaisser). |
| 7 | **Espace devis** | `app/dashboard/devis/[id]/page.tsx` → `components/devis/EspaceDevis.tsx` | Un devis : le modifier, le valider, l'envoyer, suivre la réponse ; aperçu PDF exact à côté. | Soir, Conformité, Silence | Fiche > Dossier > devis, ou Maintenant « Terminer le devis » (`components/projet/prochaineAction.ts:170`) ; Devis > ligne | En-tête + 2 boutons PDF + onglets Modifier/Aperçu + Score + Éditeur ou Suivi + Aperçu = **6 blocs** | **Garder** l'écran, **simplifier** l'éditeur (voir 7a). |
| 7a | ↳ Modifier / valider (brouillon) | `components/dashboard/ValiderDevis.tsx` + `components/devis/EditeurLignes.tsx` | Relire et ajuster les lignes, les conditions, puis « Valider ce devis ». | Soir, Conformité | Espace devis (statut brouillon) | **11 sections** (`ValiderDevis.tsx:491-803`) ; 10 champs fixes + 2 conditionnels + ~15 champs/commandes par ligne d'éditeur | **Simplifier** — replier Déplacement / Marge / TVA / Conditions / Commentaires sous « Conditions » (déjà remplies par les paramètres). |
| 7b | ↳ Score du devis | `components/devis/ScoreDevis.tsx` + `CompletionMention.tsx` | Conformité et lisibilité, avec complétion des mentions sur place ; ne bloque jamais (`lib/devis/qualite.ts:21-24`). | Conformité | Espace devis (brouillon ou prêt) | 1 bloc dépliable, n actions | **Garder**, réduit à « X points à vérifier ». |
| 7c | ↳ Suivi (prêt / envoyé / signé / refusé) | `components/devis/SuiviDevis.tsx` | « Envoyer au client », puis partager le lien de signature, noter accepté / refusé, nouvelle version. | Silence, Impayés | Espace devis (statut ≠ brouillon) | 2 cartes, 4-6 actions | **Simplifier** — « Envoyer au client » n'envoie rien (voir mesure 5). |
| 7d | ↳ Aperçu PDF | `components/devis/ApercuPdf.tsx` → `DocumentDevis.tsx` | Le PDF tel que le client le recevra. | Conformité | Espace devis > onglet « Aperçu du PDF » (tél.) | 1 bloc | **Garder**. |
| 8 | **Factures** (liste) | `app/dashboard/factures/page.tsx` → `ListeFacturesRecherchable.tsx` | Toutes les factures, filtrées (Toutes / Émises / Payées / Annulées). | Impayés | Plus > Factures ; Bilan > lien | 3 blocs, 4 filtres + recherche | **Fusionner** avec Devis (voir 6). |
| 9 | **Notes** | `app/dashboard/notes/page.tsx` | Toutes les notes groupées : En retard / Aujourd'hui / À venir / Sans rappel. | Journée, Éparpillé | Plus > Notes | 5 blocs (titre + 4 groupes), cocher / ouvrir | **Fusionner** — « En retard » et « Aujourd'hui » sont déjà sur l'accueil et dans la cloche : 3ᵉ affichage de la même donnée. |
| 9a | Nouvelle note | `app/dashboard/notes/nouvelle/page.tsx` → `FormulaireNote.tsx` | Note avec projet à choisir. | Journée | Notes > Nouvelle note | ~6 champs | **Fusionner** avec la feuille 3d. |
| 10 | **Bilan** | `app/dashboard/bilan/page.tsx` → `components/dashboard/VueBilan.tsx` | Chiffres du mois (Signé, Encaissé, Devis envoyés, Devis acceptés) et graphique sur 6 mois. | Soir | Plus > Bilan | 3 blocs (4 tuiles, graphique, liste) | **Sortir de la nav** — consultation mensuelle, peut vivre en haut de l'écran « Argent ». |
| 11 | **Paramètres** | `app/dashboard/parametres/page.tsx` → `components/parametres/VueParametres.tsx` | 8 groupes repliés : Entreprise, Mentions, Assurances, Paiement, Tarifs, Conditions, Équipe, Compte (`VueParametres.tsx:239-623`). | Conformité | Plus > Paramètres ; liens « Compléter mes paramètres » du Score | 8 groupes, ~31 champs + logo | **Garder**, mais en faire un vrai « premier réglage guidé » (12 champs utiles, voir mesure 7). |
| 11a | ↳ Mon compte | `components/dashboard/MonCompte.tsx` | Profil, notifications, automatisations IA, mot de passe, parrainage. | Aucune | Paramètres > Compte | 5 sous-blocs | **Garder**. |
| 11b | ↳ Équipe (dans Paramètres) | `components/dashboard/EquipeSection.tsx` (`VueParametres.tsx:615`) | Voir les membres, inviter, retirer. | Aucune | Paramètres > Équipe | 2 blocs, 3 actions | **Garder** — seule entrée équipe atteignable (voir mesure 8). |
| 12 | Équipe (page) | `app/dashboard/equipe/page.tsx` → `components/dashboard/GestionEquipe.tsx` | Même chose que 11b, avec un autre composant. | Aucune | **Aucun lien** — route orpheline | 2 blocs, 3 actions | **Supprimer** (doublon de 11b). |
| 13 | Guide | `app/dashboard/guide/page.tsx` → `components/guide/VueGuide.tsx` | Mode d'emploi illustré en 8 moments (`lib/guide/contenu.ts`). | Conformité (peur de mal faire) | Plus > Guide | 8 sections | **Sortir de la nav** — lien depuis Compte ou états vides. |
| 14 | Retours | `app/dashboard/retours/page.tsx` | Redirection vers `/carte-mentale`. | — | Aucun | 0 | **Supprimer** (redirection morte). |
| 15 | Carte mentale « Ce que disent les artisans » | `app/carte-mentale/page.tsx` → `components/carte-mentale/CarteMentale.tsx` | Carte des retours de la bêta, avec Header/Footer du site vitrine. | Aucune | Plus > « Ce que disent les artisans » ; ordi. « Idées et retours » (`Sidebar.tsx:377-382`) | 3 blocs, ~7 actions | **Sortir de la nav** — page de communauté, pas de travail. |

### 1.3 Accès, compte et états système

| # | Écran | Entrée | Rôle | Douleur | Accès téléphone | Blocs / champs | Proposition |
|---|---|---|---|---|---|---|---|
| A1 | Demander l'accès | `app/demander-acces/page.tsx` | Candidature à la bêta privée, avec création du mot de passe. | Aucune | Site vitrine, `/signup` | 12 champs (8 obligatoires) + CGU implicites | **Simplifier** — voir mesure 7. |
| A2 | Candidature en cours | `app/candidature-en-cours/page.tsx` | Attente de validation (« réponse sous 48 h »). | Aucune | Redirection après connexion d'un compte en attente (`app/dashboard/layout.tsx:30-32`) | 1 carte, 2 actions | **Garder**. |
| A3 | Connexion | `app/(auth)/login/page.tsx` | E-mail + mot de passe. | Aucune | Direct | 2 champs | **Garder**. |
| A4 | Mot de passe oublié | `app/(auth)/mot-de-passe-oublie/page.tsx` | Demande du lien de réinitialisation. | Aucune | Connexion > lien | 1 champ | **Garder**. |
| A5 | Définir le mot de passe | `app/(auth)/definir-mot-de-passe/page.tsx` | Invitation d'un employé ou réinitialisation. | Aucune | Lien e-mail | 1 champ (`:83-89`) | **Garder**. |
| A6 | Inscription libre | `app/(auth)/signup/page.tsx` | Redirection vers `/demander-acces`. | — | — | 0 | **Supprimer** à terme (route de compatibilité). |
| A7 | Devis public client | `app/devis/[id]/page.tsx` → `components/devis-public/DevisPublicClient.tsx` | Le client lit le devis, le signe en ligne ou télécharge le PDF. | Silence, Impayés | Lien envoyé au client | Document + signature, ~6 actions | **Garder** — hors app artisan. |
| A8 | Installer | `app/installer/page.tsx` → `components/pwa/AssistantInstallation.tsx` | Guide d'installation selon le téléphone (gabarit du site vitrine). | Terrain↔bureau | Carte d'installation, FAQ, guide | 3 blocs | **Garder**. |
| A9 | Hors ligne | `app/hors-ligne/page.tsx` | Page de repli du service worker sans réseau. | Terrain↔bureau | Automatique | 1 bloc | **Garder** (et l'enrichir : la capture devrait marcher hors ligne). |
| A10 | Maintenance | `app/maintenance/page.tsx` | Page affichée pendant une maintenance. | Aucune | Automatique | 1 bloc | **Garder**. |

### 1.4 Outils internes et aperçus (pas pour l'artisan)

| Écran | Entrée | Rôle | Proposition |
|---|---|---|---|
| Admin — Statistiques, Candidatures, Retours, Journaux, Maintenance | `app/admin/*` (nav. `components/admin/NavigationAdmin.tsx`) | Outil interne : valider les candidatures, lire les retours, journaux, interrupteur de maintenance. 5 écrans. | **Garder hors périmètre** de la refonte. |
| `apercu-guide`, `apercu-moins` | `app/apercu-*/Apercu.tsx` | Aperçus de travail avec données simulées (« jamais commité », ligne 1). Ils montent VueProjet, EspaceDevis, Planning, Paramètres, Bilan avec de fausses données. | Utiles comme **banc de maquettes** pour la refonte ; jamais en production. |
| `apercu-immersif`, `apercu-univers`, `apercu-visuel` | `app/apercu-*/page.tsx` | Pages de revue des pistes visuelles du site vitrine. | Hors périmètre. |

### 1.5 Composants morts repérés (aucun import)

`components/dashboard/NouveauProjetMenu.tsx` (contenait la seule entrée `?dictee=1`, `:74`), `ConseilsCompagnon.tsx`, `MiniApercu.tsx`, `ResumeJournee.tsx`, `ModeNuitToggle.tsx`, `components/notes/NotesRappelsAujourdhui.tsx`. `components/dashboard/Timeline.tsx` n'est plus importé que pour son type (`app/dashboard/demandes/[id]/page.tsx:16`). → À supprimer pendant la refonte.

---

## 2. Mesures « avant »

| # | Mesure | Valeur avant | Source principale |
|---|---|---|---|
| 1 | Destinations de navigation sur téléphone | **10 destinations** (3 dans la barre + 7 derrière « Plus ») + 1 action [+] + cloche + « Donner mon avis » | `Sidebar.tsx:74-88, 206-313` |
| 2 | Blocs sur Aujourd'hui, jour chargé | **6 blocs** (en-tête + 5) ; jusqu'à ~21 lignes + N cartes « À confirmer » non plafonnées ; ~30 cibles d'appui | `VueAccueil.tsx:57-131` |
| 3 | Mots affichés sur Aujourd'hui, jour chargé | **≈ 170 mots** le jour, **≈ 230** après 17 h | méthode ci-dessous |
| 4 | Appuis pour dicter un nouveau projet | **5 appuis + saisie du nom au clavier** | `FeuilleCapture.tsx`, `demandes/nouvelle/page.tsx` |
| 5 | Appuis pour valider puis envoyer un devis généré | **3 appuis dans Compyo + 3 hors Compyo = 6** (8 depuis Aujourd'hui) | `ValiderDevis.tsx:794-802`, `SuiviDevis.tsx:154-164, 266` |
| 6 | Écrans distincts de l'application connectée | **18 routes `/dashboard`** réelles (19 fichiers, dont 1 redirection ; 1 orpheline comprise) ; ≈ 27 routes au total côté artisan ; **≈ 30** feuilles et modales en plus | `find app/dashboard -name page.tsx` |
| 7 | Champs obligatoires inscription / 1ʳᵉ utilisation | **8 obligatoires** (12 affichés) à la candidature ; 0 à l'onboarding (4 écrans) ; 0 bloquant avant un devis, mais **12 champs signalés « à compléter »** sur ~31 | `demander-acces/page.tsx:179-300`, `lib/parametres/index.ts:168-181` |
| 8 | Endroits où l'on gère l'équipe | **2 écrans** (1 dans Paramètres, 1 page orpheline), 2 composants différents pour la même API | `VueParametres.tsx:615`, `app/dashboard/equipe/page.tsx` |

### Mesure 1 — Destinations de navigation sur téléphone

- Barre du bas, `ul.grid-cols-5` (`Sidebar.tsx:211`) : **Aujourd'hui**, **Projets** (`:212-222`, depuis `DESTINATIONS` `:74-78`), **[+] Nouveau** (action, `:223-235`), **Planning** (`:236-243`), **Plus** (ouvre une feuille, `:244-257`).
- Feuille « Plus » (`:261-313`) : 6 destinations `SECONDAIRES` (`:80-88`) — Devis, Factures, Notes, Bilan, Paramètres, Guide — puis « Donner mon avis » (feuille de retour, `:284-293`), « Ce que disent les artisans » (`/carte-mentale`, `:294-300`), thème, installer, « Se déconnecter » (`:304-312`).
- Barre du haut : cloche de notifications (`:202`).
- Le layout ne monte aucune autre navigation (`app/dashboard/layout.tsx:53`).

**Total : 3 destinations dans la barre + 7 dans « Plus » = 10 routes atteignables.** En comptant les entrées interactives (hors thème, installation et déconnexion), on arrive à 14 : 10 routes + [+] + Plus + cloche + avis. Le commentaire fixe un « plafond : quatre destinations plus la capture » (`Sidebar.tsx:48`) : il est respecté dans la barre, mais 70 % des destinations sont cachées dans un tiroir à plat.

### Mesure 2 — Blocs sur Aujourd'hui, jour chargé

`VueAccueil.tsx` affiche, quand tout est actif :

1. En-tête : date + « Bonjour Prénom » (`:57-62`) ;
2. **Maintenant**, ou **Fermer la journée** après 17 h (`:66`) — 1 carte ;
3. **À confirmer** (`:69-80`) — rendez-vous passés non confirmés + « Chantier terminé ? », **sans plafond** (`AConfirmer.tsx:139`, `ConfirmerClotureProjet.tsx:116` : `restants.map` sans `slice`) ;
4. **Aujourd'hui** (`:83` → `ListeAujourdhui.tsx:59-61`) — 5 lignes max + « Voir les N » ;
5. **À faire de votre côté** (`:86-97`) — 5 lignes max + « Voir les N » ;
6. **En attente du client** (`:100-122`) — 5 lignes max, bouton « Relancer », « Voir les N ».

Le plafond de 5 lignes vient de `components/accueil/Blocs.tsx:12` (`LIGNES_MAX = 5`). « Rien d'urgent » + bouton (`:124-131`) ne s'affiche que si tout est vide.

**Résultat : 6 blocs (5 blocs de contenu + l'en-tête).** Autour : barre du haut, barre du bas, et éventuellement la pop-up de rappel, la carte d'installation et la carte de mise à jour. Un jour chargé, avec 4 éléments à confirmer, on compte environ 1 + 4 + 15 = **20 lignes ou cartes**, et 30 à 35 cibles d'appui (Maintenant 1, Oui/Non × 4 = 8, 15 lignes, 5 coches de note, 5 « Relancer », 3 « Voir les N »).

Pour comparaison, le commentaire `app/dashboard/page.tsx:13-15` indique « jusqu'à douze blocs » avant le lot B. La réduction est réelle ; le point faible restant est « À confirmer », non plafonné.

### Mesure 3 — Mots affichés sur Aujourd'hui, jour chargé

**Méthode.** Les libellés statiques sont comptés dans le code. Le contenu dynamique est estimé ligne par ligne, à partir des gabarits de texte du code (`app/dashboard/page.tsx:372-402, 526-559`), avec des noms de client de 2 mots et des titres de 2-3 mots. Scénario : chaque bloc rempli à son plafond (5 lignes), 3 rendez-vous et 1 chantier à confirmer. Une heure ou une durée (« 09h00 », « 12 j ») compte pour 1 mot ; les icônes ne comptent pas.

| Zone | Statique | Dynamique | Total |
|---|---|---|---|
| Barre du haut + barre du bas | « Compyo » + 5 libellés | — | 6 |
| En-tête | — | date (3) + « Bonjour Axel » (2) | 5 |
| Maintenant | « Maintenant » | « 14h30 — Mme Dupont » + détail (≈ 6) | 7 |
| À confirmer (3 RDV + 1 chantier) | titre (2) + Oui/Non (8) + « Fait ? » (3) + « Chantier terminé ? » (2) | noms + titre + date (≈ 22) | ≈ 37 |
| Aujourd'hui (5 lignes) | titre (1) + « Voir les N → » (3) | heure + qui + quoi (≈ 7 × 5) | ≈ 39 |
| À faire de votre côté (5 lignes) | titre (4) + verbes « Devis à relire »… (≈ 3 × 5) + « Voir les N » (3) | noms (2 × 5) | ≈ 32 |
| En attente du client (5 lignes) | titre (4) + « Facture impayée » / « Devis sans réponse » (≈ 2,5 × 5) + « Relancer » (5) + « Voir les N » (3) | « 12 j » + nom (≈ 3 × 5) | ≈ 40 |
| **Total de jour** | | | **≈ 166, arrondi à 170** |

**Après 17 h**, « Fermer la journée » (`FermerJournee.tsx:162-224`) remplace « Maintenant » : titre (3), bilan chiffré (≈ 10), « En suspens » + 5 éléments × (nom + « 14h00 · Visite » + Fait + Demain ≈ 8) = 42, « Et N de plus » (4), « Demain » + heure, nom et adresse (≈ 9). Cela fait ≈ 68 mots au lieu de 7, soit **≈ 230 mots** au total. Une pop-up de rappel ouverte ajoute 15 à 30 mots.

### Mesure 4 — Appuis pour dicter un nouveau projet depuis Aujourd'hui

Le gros micro « Parler » a été retiré de la feuille de capture le 27/09 (`FeuilleCapture.tsx:11-17`). La seule entrée qui ouvrait directement l'écoute (`?dictee=1`, `demandes/nouvelle/page.tsx:329-334`) n'est plus liée que depuis `NouveauProjetMenu.tsx:74`, un composant mort.

Parcours réel :

1. **[+] Nouveau** dans la barre du bas (`Sidebar.tsx:223-235`) ;
2. **« Écrire moi-même »** (`FeuilleCapture.tsx:39-44`) ;
3. **« Dicter »** — affiché seulement si le navigateur sait dicter (`nouvelle/page.tsx:519-527`), sinon il faut passer par le micro du clavier ;
4. *(parler)* → **« Terminé »** (`:452-458`). Le numéro dicté remplit le téléphone, et le curseur va sur « Nom du client » (`:305-317`) ;
5. **Saisir le nom du client au clavier** : le champ est obligatoire et la dictée ne le remplit pas (`:340-343`) ;
6. **« Créer le projet »** (`:547-553`).

**Total : 5 appuis + 1 saisie au clavier**, et le chemin n'est disponible que si le navigateur gère la dictée. À titre de comparaison, dicter une note sur un projet *existant* demande 2 appuis : [+] > Dicter (`VueProjet.tsx:413`).

### Mesure 5 — Appuis pour valider un devis généré, de l'ouverture à l'envoi

Depuis l'Espace devis ouvert, statut brouillon (`EspaceDevis.tsx:388-400`) :

1. **« Valider ce devis »**, bouton collant sous le pouce (`ValiderDevis.tsx:788-803`). Le statut passe à `a_valider` (`:450`) et l'écran affiche « Prêt à partir » (`SuiviDevis.tsx:138-185`) ;
2. **« Envoyer au client »** (`SuiviDevis.tsx:154-164`). **Ce bouton n'envoie rien** : `marquerDevisEnvoye` change seulement le statut en `envoye` et fige les mentions (`lib/devis/actions.ts:45-90`) ;
3. **« Partager (SMS, WhatsApp, mail…) »** (`SuiviDevis.tsx:266`), qui ouvre la feuille de partage du téléphone (`:123-132`) ;
4. choisir l'application (hors Compyo) ;
5. choisir le contact (hors Compyo) ;
6. appuyer sur Envoyer dans la messagerie (hors Compyo).

**Total : 3 appuis dans Compyo + 3 hors Compyo = 6.** Depuis Aujourd'hui, il faut en ajouter 2 : « Maintenant · Relire le devis X » mène à la **fiche projet** et non au devis (`app/dashboard/page.tsx:533`), puis « Terminer le devis » (`prochaineAction.ts:170`). **Total : 8.** Relire l'aperçu PDF sur téléphone ajoute encore 2 appuis (onglets `EspaceDevis.tsx:352-374`).

L'autre chemin (Valider → « Partager le PDF » → app → contact → envoyer → « Oui, il est envoyé », `EspaceDevis.tsx:323-350`) compte aussi 6 appuis.

Charge de relecture : l'éditeur compte **11 sections** (objet, total, bandeau paramètres, lignes, postes fréquents, déplacement / marge / TVA, conditions, mention TVA, commentaires, totaux, postes oubliés : `ValiderDevis.tsx:512-782`), avec 10 champs fixes + 2 conditionnels, plus le Score (`EspaceDevis.tsx:380-387`) au-dessus.

### Mesure 6 — Écrans distincts (routes) de l'application connectée

`app/dashboard/**/page.tsx` compte **19 fichiers** : `/dashboard`, `bilan`, `demandes`, `demandes/[id]`, `demandes/importer`, `demandes/importer-capture`, `demandes/nouvelle`, `demandes/partage/[id]`, `devis`, `devis/[id]`, `equipe` (orpheline), `factures`, `guide`, `notes`, `notes/nouvelle`, `parametres`, `planning`, `planning/nouveau`, `retours` (redirection). Cela fait **18 écrans réels**.

Il faut y ajouter les routes que l'artisan connecté rencontre hors de `/dashboard` : `/carte-mentale`, `/candidature-en-cours`, `/installer`, `/hors-ligne`, `/maintenance`, plus `/login`, `/mot-de-passe-oublie`, `/definir-mot-de-passe` et `/demander-acces`. **Total côté artisan : ≈ 27 routes.** Le client a 1 route (`/devis/[id]`), l'admin 5.

Feuilles et modales majeures en plus des routes : ≈ 30. Ce sont Plus, Capture, Ajouter au projet, Dicter, Photos, Visionneuse, Note, Infos client, Message client, Bien reçu, Urgence, Facturation, Brouillon de projet, Correspondance, Confirmation RDV, À confirmer, Chantier terminé, Fermer la journée, Score, Complétion de mention, Aperçu PDF, Suivi, Notifications, Pop-up de rappel, Retour (4 étapes), Onboarding (4 écrans), Exemple de devis, Installer et Mise à jour.

### Mesure 7 — Champs obligatoires à l'inscription et à la première utilisation

| Étape | Obligatoires | Facultatifs | Source |
|---|---|---|---|
| `/demander-acces` | **8** : Prénom, Nom, Métier (liste), Téléphone, E-mail, Mot de passe, Confirmation, « Plus gros problème administratif » (texte libre) | 4 : Entreprise, Nombre d'employés, Devis par semaine, Découverte (+ CGU acceptées par l'envoi, sans case) | `app/demander-acces/page.tsx:179-300, 334-344` |
| `/signup` | 0 (redirection) | — | `app/(auth)/signup/page.tsx` |
| `/definir-mot-de-passe` (invité / réinitialisation) | 1 | — | `definir-mot-de-passe/page.tsx:83-89` |
| `/login` (après acceptation) | 2 | — | `login/page.tsx:63-76` |
| Onboarding `PremierLancement` | **0 champ**, 4 écrans, au minimum 4 appuis (3 « Suivant » + « Installer » ou « Continuer ») ou 1 appui (« Passer ») | — | `PremierLancement.tsx:27, 246-272` |
| Avant un premier devis | **0 champ bloquant** : le devis est généré avec des valeurs par défaut (`app/api/ai/generer-devis/route.ts:239-242`) et un bandeau prévient (`ValiderDevis.tsx:539-557`) ; le score ne bloque jamais (`lib/devis/qualite.ts:21-24`) | Pour un devis **conforme**, **12 champs** sont signalés « à compléter » : Entreprise 3 (nom, adresse, téléphone ou e-mail), Mentions 3 (forme juridique, SIRET, médiateur), Assurances 4 (décennale assureur, police, zone, RC Pro), Paiement 2 (moyens, IBAN), sur ≈ 31 champs + logo | `lib/parametres/index.ts:168-181`, `VueParametres.tsx` (30 `label=`) |

**Avant le premier devis conforme : 8 (candidature) + 2 (connexion) + 12 (paramètres) = 22 champs**, sans parcours guidé pour les 12 champs de paramètres. Ils sont découverts par le Score du devis ou en ouvrant Paramètres.

### Mesure 8 — Endroits où l'on gère l'équipe

1. **Paramètres > groupe « Équipe »** : `EquipeSection` (`components/parametres/VueParametres.tsx:615` → `components/dashboard/EquipeSection.tsx:118-160`). Atteignable : Plus > Paramètres > Équipe (3 appuis).
2. **`/dashboard/equipe`** : `GestionEquipe` (`app/dashboard/equipe/page.tsx` → `components/dashboard/GestionEquipe.tsx:46, 75`). **Aucun lien** dans l'application : `grep "dashboard/equipe"` ne trouve rien. La page est orpheline, mais reste accessible par URL.

**Total : 2 écrans et 2 composants** qui appellent les mêmes API (`app/api/equipe/inviter`, `app/api/equipe/retirer`), avec des libellés et des confirmations différents. Le commentaire de navigation l'assume : « Équipe vit dans Paramètres » (`Sidebar.tsx:45`). L'équipe n'apparaît nulle part ailleurs : pas d'attribution de rendez-vous ou de projet à un membre (`planning/nouveau` ne mentionne l'équipe que pour un conflit de créneau, `:309-313`).

---

## 3. Constats principaux

1. **La dictée, le geste le plus naturel sur un chantier, a perdu son entrée directe.** Dicter un nouveau projet demande 5 appuis + le nom au clavier (mesure 4), et seulement si le navigateur sait dicter. Pour un projet existant, il en faut 2. Le reste de `?dictee=1` vit dans un composant mort.
2. **« Envoyer au client » n'envoie rien.** Le bouton change seulement le statut (`lib/devis/actions.ts:45-90`) ; l'envoi réel se fait après, par « Partager ». Valider puis envoyer coûte 6 appuis, 8 depuis Aujourd'hui, et « Maintenant · Relire le devis » ouvre la fiche projet au lieu du devis. Le libellé ment, et c'est sur l'étape où se joue l'argent.
3. **« Plus » cache 7 destinations à plat.** La barre du bas est propre, mais Devis, Factures, Notes, Bilan, Paramètres, Guide et Carte mentale ont le même poids derrière un tiroir. Devis + Factures (+ Bilan) relèvent d'une même question, « l'argent », et Notes fait doublon avec l'accueil et la cloche. Cible possible : 4 destinations, sans tiroir de destinations.
4. **La même donnée s'affiche à 3-4 endroits.** Notes en retard ou du jour : Aujourd'hui, cloche, page Notes, pop-up de rappel. Rendez-vous : Aujourd'hui, « À confirmer », Planning, Fermer la journée. Équipe : 2 écrans, 2 composants pour la même API, dont 1 page orpheline.
5. **Aujourd'hui est devenu sobre, mais garde une fuite.** Le code annonce 5 blocs maximum (6 avec l'en-tête), ≈ 170 mots le jour et ≈ 230 le soir. « À confirmer » n'a pas de plafond, alors que les autres blocs s'arrêtent à 5 : après une semaine sans confirmer, il pousse tout le reste hors de l'écran.

*Autres constats.* La première utilisation ne guide pas les 12 champs de paramètres nécessaires à un devis conforme (22 champs au total avant le premier devis conforme). L'éditeur de devis compte 11 sections sur téléphone. Six composants sont morts et une route redirige dans le vide (`/dashboard/retours`).
