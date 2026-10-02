# 05 — Les six écrans cœur : comportement réel

> Inventaire en lecture seule, établi le 01/10/2026 sur le dépôt `compyo-app` (dernier commit `f8d263b`).
> On décrit **ce que le code fait**, pas ce que les commentaires promettent. Quand un point est une déduction (non vérifiée sur appareil), il est marqué *(déduit)*.
> Conventions : « geste » = un appui, une frappe de champ comptée pour 1, une validation système. Largeur de référence : 360 px (sous le point de rupture `sm` = 640 px, donc **toujours la version téléphone**).

---

## 0. Repères transverses

| Sujet | Réalité dans le code |
|---|---|
| Rupture téléphone / ordinateur | `sm` (640 px). Sous 640 px : barre du haut + barre du bas. Au-dessus : barre latérale de 240 px. Une tablette en portrait (768 px) a donc la **barre latérale**. |
| Feuilles | `components/projet/Feuille.tsx` : monte du bas sur téléphone, centrée sur ordinateur ; Échap ferme ; focus piégé ; défilement de la page bloqué ; le geste « retour » Android ferme la feuille (`lib/retourFeuilles`, commit 6f643ef). |
| Brouillons locaux | `lib/brouillonLocal.ts` (enveloppe `{base, le, valeur}`, 14 jours max, jetée si l'enregistrement a changé depuis). **Seuls** `ValiderDevis` et `VueParametres` l'utilisent. Les autres saisies ont leur propre `localStorage` « maison » : `nouvelle/page.tsx` (`compyo_brouillon_nouveau_projet`, description seule), `NotesVocales` (par projet), `FormulaireNote` (titre + description). **Pas de brouillon** : collage d'un message (`importer`), revue du brouillon IA (`BrouillonProjet`), mémo « À retenir », infos client, formulaire planning, feuille « Message au client » IA. |
| Hors ligne | Aucune détection `navigator.onLine` dans l'app. Le service worker (`public/sw.js`) **n'écrit jamais** `/dashboard/*` en cache (audit sécurité 05/09) : hors réseau, toute navigation vers une page du tableau de bord retombe sur `/hors-ligne` (page statique « Réessayer »). Les erreurs réseau des actions sont attrapées au cas par cas (« Pas enregistré. Réessayez. », « Vérifiez votre connexion »). |
| Chargement | `loading.tsx` (squelettes) pour Aujourd'hui, Projets, Devis, Factures, Bilan, Planning, Équipe. La fiche projet et l'espace devis sont des composants client : texte « Chargement… » (fiche) ou squelette (devis). Le squelette de l'accueil est dessiné pour l'ordinateur (`p-8`, colonne latérale) et ne correspond pas à la mise en page téléphone. |
| Fuseau | L'accueil calcule « aujourd'hui » de deux façons : la liste du jour avec `setHours(0)` **côté serveur (UTC sur Vercel)**, la fermeture de journée en heure de Paris. Le planning calcule le lundi de la semaine côté serveur aussi en UTC. *(déduit)* Un rendez-vous entre 00 h et 02 h (heure de Paris) peut tomber dans le mauvais jour ou la mauvaise semaine. |

---

## 1. NAVIGATION

### Fichiers
- `app/dashboard/layout.tsx` (78 l.) — serveur : vérifie la session, bloque `acces = en_attente`, charge `profils(nom, metier)`, l'organisation, et **compte les notes en retard** (`notes`, `statut = active`, `rappel_a < maintenant`, `count head`) pour la pastille. Monte `Sidebar`, `BoutonRetour`, `PremierLancement`, `PopupRappel`.
- `components/dashboard/Sidebar.tsx` (429 l.) — toute la navigation, téléphone **et** ordinateur.
- `components/navigation/FeuilleCapture.tsx` (77 l.) — la feuille « Nouveau projet ».
- `app/globals.css` l. 769-783 — variable `--barre-bas` et effacement pendant la saisie.

### Téléphone (360 px), de haut en bas
1. **Barre du haut** collante (`sticky top-0`, ≥ 48 px + encoche) : logo Compyo + mot « Compyo » à gauche, cloche `CentreNotifications` à droite. Rien d'autre (pas de titre de page, pas de retour).
2. **Contenu** (`main`, `pb` = 5 rem + zone de sécurité pour ne pas passer sous la barre du bas).
3. **Barre du bas** fixe (`data-barre-bas`, grille de 5 colonnes, ~64 px + zone de sécurité, fond translucide flouté) :
   `Aujourd'hui` · `Projets` · **[+]** · `Planning` · `Plus`
   - Onglet actif : texte gras + trait de 3 px en haut (jamais la couleur seule).
   - Pastille orange sur `Aujourd'hui` = nombre de notes dont le rappel est dépassé (pas les rendez-vous, pas les devis).
   - **[+]** : rond orange de 56 px qui dépasse de 24 px au-dessus de la barre. Libellé « Nouveau » ; sur une fiche projet, « Ajouter » (la fiche pose `data-capture-libelle` sur `<html>`). Comportement : envoie `compyo:capture` (annulable) ; si une page l'intercepte (fiche projet), elle ouvre sa propre feuille ; sinon ouvre `FeuilleCapture`.
   - **Plus** : ouvre une feuille « Plus ». Actif (gras + trait) si on est sur une des pages secondaires.
4. **Feuille « Plus »** : liste de 6 lignes de 56 px — Devis, Factures, Notes, Bilan, Paramètres, Guide. Puis, en petit sous « Idées et retours » : « Donner mon avis » (ouvre la fenêtre de retour `BoutonRetour`) et « Ce que disent les artisans » (lien `/carte-mentale`). Puis une rangée : bascule de thème, bouton d'installation discret, « Se déconnecter » (confirmation `window.confirm`).
5. **Feuille « Nouveau projet »** (`FeuilleCapture`) : 3 lignes de 76 px — « Coller un message » (IA) → `/dashboard/demandes/importer` ; « Photo ou capture » (IA) → `/importer-capture` ; « Écrire moi-même » → `/nouvelle`. Plus de micro depuis le 27/09.

### Effacement de la barre pendant la saisie (commit e2a9972)
Règle CSS pure, sous 640 px : `html:has(:is(input:not([type=checkbox|radio|range|file|button|submit]), textarea, [contenteditable=true]):focus) [data-barre-bas] { display: none }`.
- Effet : dès qu'un champ texte a le focus, la barre disparaît ; elle revient au blur.
- Navigateur sans `:has()` : la barre reste (comportement d'avant).
- Conséquence : les boutons collants qui se calent sur `--barre-bas` (« Créer le projet » de `BrouillonProjet`, « Valider ce devis » de `ValiderDevis`) gardent leur décalage de 4,5 rem même quand la barre a disparu — *(déduit)* ils flottent alors ~72 px au-dessus du clavier, avec un vide en dessous. La variable `--barre-bas` n'est pas remise à 0 pendant la saisie.
- Les `select` ne masquent pas la barre (non listés) ; les `input type=date/time` la masquent (ce sont des `input` non exclus).

### Ordinateur / tablette (≥ 640 px)
Barre latérale anthracite de 240 px : logo ; bouton orange pleine largeur **« Nouveau projet »** (ouvre toujours `FeuilleCapture`, même sur une fiche — sur ordinateur, ajouter à un projet passe par les boutons du Carnet) ; 3 destinations (Aujourd'hui avec pastille, Projets, Planning) ; séparateur ; 6 liens secondaires en 13 px (Devis, Factures, Notes, Bilan, Paramètres, Guide) ; « Idées et retours » (→ `/carte-mentale`) ; en bas, bloc compte : avatar + nom, puis 4 boutons de 44 px (notifications, thème, installer, déconnexion ⏻), puis « Site vitrine · Contact ».
Le bouton flottant « Faire un retour » (`BoutonRetour`) n'existe plus que sur ordinateur.

### Où sont les choses
| Page | Téléphone | Ordinateur |
|---|---|---|
| Aujourd'hui, Projets, Planning | barre du bas, 1 geste | barre latérale, 1 clic |
| Devis, Factures, Notes, Bilan, Paramètres, Guide | Plus → ligne : **2 gestes** | lien secondaire, 1 clic |
| Équipe | Paramètres → groupe « Équipe » (`VueParametres`, `EquipeSection`) : 3 gestes + dépli. La page `/dashboard/equipe` existe encore mais **aucun lien n'y mène** (orpheline). | idem |
| Carte mentale | Plus → « Ce que disent les artisans » → `/carte-mentale` (page **hors** du tableau de bord : on quitte la coque de l'app, plus de barre du bas) | « Idées et retours » |
| Retours (`/dashboard/retours`) | aucun lien trouvé (orpheline) | idem |

### Points faibles évidents
- Aucun titre de page dans la barre du haut téléphone : sur Devis, Factures, etc., seul le `h1` du contenu dit où l'on est.
- Devis et Factures, deux outils quotidiens d'un artisan, sont derrière « Plus » (2 gestes) alors que la règle « 4 destinations + capture » est tenue.
- Le [+] change de sens selon la page (créer un projet / ajouter à ce projet) — seul le libellé de 11 px le dit.
- `--barre-bas` n'est pas recalculée quand la barre s'efface : boutons collants mal placés au-dessus du clavier *(déduit)*.
- Code mort lié : `components/dashboard/NouveauProjetMenu.tsx` n'est plus importé nulle part.

---

## 2. AUJOURD'HUI

### Fichiers réellement utilisés
- `app/dashboard/page.tsx` (561 l.) — serveur, `force-dynamic`, calcule tout.
- `components/accueil/VueAccueil.tsx` (152 l.) — affichage pur des 5 blocs.
- `components/accueil/Blocs.tsx` — `BlocAccueil` (titre + nombre, 5 lignes max, puis « Voir les N → ») et `LigneAccueil` (≥ 56 px, repère à gauche en 56 px de large, toute la ligne est un lien, un bouton optionnel à droite).
- `components/accueil/ListeAujourdhui.tsx`, `FermerJournee.tsx`, `BoutonCapture.tsx`.
- `components/dashboard/AConfirmer.tsx` (269 l.) + `ConfirmerClotureProjet.tsx` (dans le bloc « À confirmer »).

### Fichiers cités mais **non utilisés** (code mort)
- `components/dashboard/ResumeJournee.tsx` — remplacé par `FermerJournee` (seulement cité en commentaire).
- `components/dashboard/ConseilsCompagnon.tsx` — sorti de l'accueil le 26/09 (cité seulement dans un commentaire de `useParallaxSouris.ts`).
- `components/notes/NotesRappelsAujourdhui.tsx` — fondu dans `ListeAujourdhui`, plus importé.
- `lib/activite.ts` — **n'a rien à voir avec l'accueil** : c'est le calcul du mois pour `/dashboard/bilan` (et l'admin).
- `components/projet/prochaineAction.ts` — c'est le « Maintenant » de la **fiche projet**, pas de l'accueil (l'accueil a sa propre fonction `determinerProchaineAction` dans `page.tsx`).

### Données chargées (12 requêtes Supabase en parallèle)
1. `profils.nom` ; 2. `demandes *` de l'organisation (**toutes**, sans filtre ni limite) ; 3. `devis` (id, statut, numero, envoye_le, demande_id, nom client) de l'organisation (tous) ; 4. `evenements_planning` du jour (UTC serveur), non annulés ; 5. `evenements_planning` `a_faire` passés ; 6. rendez-vous `termine` (demande_id) ; 7. évènements futurs non annulés (demande_id) ; 8. `evenements_projet` de type `journal_chantier_interprete` (tous) ; 9. `factures` `emise` hors avoirs ; 10. notes actives **avec rappel** (`listerNotesActivesOrganisation`) ; 11. le soir seulement : nombre de factures émises aujourd'hui ; 12. le soir seulement : premier rendez-vous de demain.
Le layout ajoute la requête de la pastille. *(déduit)* Le coût grandit avec l'historique : les requêtes 2, 3, 6, 7 et 8 ne sont pas bornées dans le temps.

### Écran à 360 px, de haut en bas
1. **En-tête** : date en petites capitales mono (« mercredi 1 octobre »), puis « Bonjour {prénom} » (1,6 rem) — ou « Bienvenue sur Compyo. » si aucun projet.
2. **Bloc 1 — « Maintenant »** (journée) : une carte noire pleine largeur de ≥ 72 px, lien entier ; libellé MAINTENANT, une phrase, un détail éventuel, une flèche. **Ou, à partir de 17 h (Paris) et s'il existe au moins un projet : « Fermer la journée »** (voir plus bas). Rien si aucune action.
3. **Bloc 2 — « À confirmer » {n}** : chaque évènement passé non confirmé = une carte « {client} / Fait ? {titre} · {date} » avec **Oui** (noir) et **Non**. Puis `ConfirmerClotureProjet` (« le chantier X est-il terminé ? »).
4. **Bloc 3 — « Aujourd'hui » {n}** : une liste triée par heure ; les notes en retard en tête avec le repère « Retard » en orange ; les notes portent un rond à cocher à droite (56 px).
5. **Bloc 4 — « À faire de votre côté » {n}** : lignes « {client} / Nouveau projet à cadrer | Devis à préparer | Devis à relire | Devis à envoyer ».
6. **Bloc 5 — « En attente du client » {n}** : lignes avec repère « {n} j », « Facture impayée » ou « Devis sans réponse », bouton **Relancer** à droite quand le seuil est atteint.
7. **État vide** (rien du tout) : « Rien d'urgent. » ou « Votre premier projet commence ici. » + bouton orange « + Nouveau projet » (ouvre `FeuilleCapture`).

Chaque bloc n'apparaît que s'il a au moins une ligne ; 5 lignes au plus, puis « Voir les N → » (vers Planning, Projets ou Devis selon le bloc).

### Règles de priorisation (ce qui apparaît quand)

**« Maintenant » (une seule action, l'ordre des `if` est la priorité)** :
1. le prochain rendez-vous du jour dont l'heure est ≥ maintenant − 1 h (« 14h30 — Dupont ») ;
2. le premier devis `brouillon` → « Relire le devis X » ;
3. le premier projet `nouveau` → « Cadrer le projet X » ;
4. le premier devis `a_valider` → « Envoyer le devis X » ;
5. la première tâche du planning du jour → son titre ;
6. le premier projet `analyse` → « Préparer le devis de X » ;
7. la première facture impayée à relancer → « Relancer X » (lien qui ouvre la feuille de relance) ;
8. le premier devis envoyé depuis ≥ 5 j → « Relancer X ».
« Premier » = l'ordre de retour de la base (non trié). L'élément mis en avant n'est pas répété dans les blocs 3 à 5.

**Seuils** : devis visible dans « En attente » à partir de 3 j, « Relancer » à 5 j ; facture visible dès le lendemain de l'échéance (ou 15 j sans échéance), « Relancer » à échéance + 3 j (ou 15 j).

**« À confirmer »** : évènements `a_faire` dont la fin estimée (durée, sinon 60 min pour un RDV / 15 min pour une tâche) **+ 60 min de marge** est passée. Les projets terminés sont exclus partout. La question « chantier terminé ? » apparaît pour un projet non terminé qui a (un RDV confirmé fait **ou** deux comptes rendus vocaux consécutifs « chantier semble terminé ») **et** plus aucun évènement futur.

**Le matin / la journée** : « Maintenant » suit la règle ci-dessus ; à 8 h sans RDV, c'est le premier devis à relire, etc. Rien ne distingue le matin de l'après-midi avant 17 h (pas de récapitulatif du matin, pas de météo, pas de trajet).

**Le soir (≥ 17 h Paris)** — `FermerJournee` remplace « Maintenant » :
- **Aujourd'hui** : des chiffres, calculés sans IA (« 2 projets captés · 1 devis envoyé · 1 facture émise · 1 rendez-vous fait ») ; ligne absente si tout est à zéro.
- **En suspens** : les notes dont le rappel tombe avant minuit (y compris celles déjà en retard), puis les RDV et tâches **d'aujourd'hui** passés sans confirmation. Chaque élément : **Fait** (note terminée ou évènement `termine`) ou **Demain** (note : rappel demain 8 h, marques « notifié » et « vu » effacées ; évènement : **déplacé à demain même heure**, sans prévenir le client). 5 lignes, puis « Et N de plus. ». Disparition immédiate, retour si l'enregistrement échoue.
- **Demain** : « 8h30 · Dupont · 12 rue … » ou « Rien de prévu ».
- Ce qui est en suspens n'est plus répété dans « Aujourd'hui » ni « À confirmer » (les RDV plus anciens restent dans « À confirmer »).
- Quand plus rien n'est en suspens : carte calme « Tout est réglé pour aujourd'hui. » + bilan + demain, **d'elle-même**.

### Pourquoi f8d263b a retiré « C'est bon pour aujourd'hui » (27/09)
Avant : une fois « En suspens » vide, un grand bouton noir « C'est bon pour aujourd'hui » écrivait une clé datée dans `localStorage` (`compyo:journee-fermee`) et remplaçait la carte par « Journée fermée. Tout est noté. ». Le message du commit et le commentaire du fichier donnent trois raisons : **il ne changeait rien d'autre** que l'affichage (ni rappels, ni notifications), **il ne se défaisait pas**, et **personne — Axel compris — ne savait à quoi il servait**. Le correctif supprime le bouton et le stockage local : l'état calme s'affiche tout seul dès que « En suspens » est vide, et il gagne le bilan du jour. Conséquence de bord : la branche « liste » du composant teste encore `restants.length > 0` alors que ce cas est désormais toujours vrai (reste inoffensif).

### Actions et gestes
| Action | Gestes |
|---|---|
| Ouvrir l'action « Maintenant » | 1 |
| Cocher une note du jour | 1 (sur le rond) |
| Confirmer un RDV passé fait | 1 (Oui), puis si lié à un projet : « Le chantier X est-il aussi terminé ? » Oui (1) ou Non (1) → « Planifier le prochain RDV ? » (+1 ou « Plus tard ») |
| RDV passé non fait | Non (1) → date (1+) → heure (1+) → Replanifier (1) = ≥ 4 |
| Relancer un devis / une facture | Relancer (1) → fiche projet avec feuille message ouverte → SMS ou WhatsApp (1) → envoyer dans l'appli (1) = 3 |
| Fermer la journée | Fait ou Demain : 1 par élément |

### États
- Chargement : squelette `app/dashboard/loading.tsx` (forme ordinateur).
- Vide : bloc vide décrit plus haut.
- Erreur : aucune gestion dans la page serveur — une requête en échec renvoie `data: null` et le bloc concerné disparaît **silencieusement** (on croit qu'il n'y a rien) *(déduit)*. Les actions client affichent « Pas enregistré. Réessayez. » / « La mise à jour n'a pas pu être enregistrée. ».
- Hors ligne : `/hors-ligne`.

### Points faibles évidents
- Dans `AConfirmer`, la replanification (`confirmerReplanifie`) **n'attend pas d'erreur** : l'élément disparaît même si l'écriture échoue. Champs date/heure en 14 px avec `py-1.5` (petits au doigt).
- « Demain » sur un rendez-vous déplace le RDV du client sans proposer de le prévenir.
- Le soir, un compte qui a des projets voit toujours la carte « Fermer la journée », même un dimanche.
- « Maintenant » prend le « premier » devis ou projet dans un ordre non garanti : pas forcément le plus ancien ni le plus urgent.
- Erreurs de chargement invisibles (blocs qui disparaissent).

---

## 3. FICHE PROJET

### Fichiers
- `app/dashboard/demandes/[id]/page.tsx` (1305 l., composant client) — **le cerveau** : chargement, toutes les écritures, et le branchement des formulaires dans `VueProjet`.
- `components/projet/VueProjet.tsx` (469 l.) — disposition, feuilles, interception du [+].
- `EnTeteProjet.tsx` (255 l.), `Blocs.tsx` (523 l. : `Maintenant`, `AFaire`, `ARetenir`, `Dossier`), `Carnet.tsx` (317 l.) + `entreesCarnet.ts` (255 l., pur), `prochaineAction.ts` (218 l., pur), `Feuille.tsx`, `FeuilleMessageClient.tsx` (268 l.), `Visionneuse.tsx`.
- Formulaires branchés : `NotesVocales` (343 l.), `PhotosProjet` (310 l.), `FormulaireNote` (446 l.), `FacturesProjet` (386 l.), `PropositionUrgence`.

### Que contient `[id]/page.tsx` (1305 lignes)
- **Chargement** (`chargerDonnees`) : `auth.getUser`, puis en parallèle `demandes *` (le projet), le **dernier** `devis` (un seul, `limit 1`), `notes_vocales` (toutes), `evenements_projet` (tous, croissant), `listerNotesProjet`, l'organisation, `evenements_planning` du projet. Puis `profils(nom, metier)`, `parametres_entreprise *`, le nombre d'autres projets du même `client_id`, et l'URL signée du logo. Les photos : un `createSignedUrls` groupé (1 h). Après **chaque** action, tout est rechargé.
- **Actions** : `analyserDemande` (`/api/ai/analyser-demande`, peut proposer l'urgence et des tâches), `accepterTaches` (crée/remplace la note « Tâches restantes »), `genererDevis` (feuille « Il manque peut-être quelques informations » si l'analyse a listé des manques → « Préparer quand même »), `lancerGenerationDevis` (`/api/ai/generer-devis` puis **redirection vers l'espace devis**), `dupliquerDevis`, `creerDevisExpress` (`/api/devis/creer-vide`), `genererReponse` / `genererRelance` (`/api/ai/generer-reponse`), `changerPriorite`, `marquerEnCours`, `marquerTermine` (passe aussi les RDV du jour en fait), `marquerVisite`, `enregistrerNotes` (le mémo, au blur), `enregistrerInfos` (téléphone, adresse, type), `creerRappelRecurrent` (entretien après chantier), `terminerNote`, `signalerModification`.
- **Rendu** : états « Projet introuvable », erreur (`EtatErreur` + Réessayer), « Chargement… » ; puis `VueProjet` + deux feuilles locales (« Il manque peut-être… » et « Message au client » IA avec zone de texte, « Copier le texte », « Proposer une autre version »).
- `construireHistoriqueHerite` : reconstruit un historique pour les vieux projets sans `evenements_projet`.

### Écran à 360 px, de haut en bas (une seule colonne)
1. **En-tête** (`EnTeteProjet`) : « ← Projets » à gauche (48 px) et bouton rond « … » (48 px) à droite ; avatar 48 px + nom du client (1,6 rem, tronqué) + pastille Urgent/Important ; sous-titre « type · adresse » ; **trois grands boutons égaux de 68 px** : Appeler (`tel:`), Message (ouvre `FeuilleMessageClient`), Itinéraire (Google Maps) — chacun seulement si la donnée existe ; barre de progression 5 segments (Demande, Devis, Signé, Chantier, Terminé) avec l'étape nommée en dessous.
2. **Carte « Répondre « bien reçu » »** (seulement si on arrive avec `?cree=1`, que le projet a un téléphone et qu'aucun message n'a déjà été préparé) : SMS / WhatsApp.
3. **« Maintenant »** : libellé, une phrase d'état, détails (« Prochain passage : … », « 2 choses à faire », « 3 points à vérifier avant de chiffrer »), **bouton principal pleine largeur**, phrase « ce que fait l'IA » sous un bouton IA, boutons secondaires pleine largeur (fantômes), alerte orange éventuelle (« Le projet a changé depuis le devis… »), propositions IA (urgence), rappel de suivi (projet terminé).
4. **« À faire » {n}** : RDV à venir puis tâches (notes actives, retard d'abord), case à cocher avec annulation pendant 6 s ; avant le devis, un dépli « avant de chiffrer » (infos manquantes, questions, checklist métier), **ouvert d'office** s'il y a des infos manquantes. **Masqué sur téléphone s'il est vide**.
5. **« À retenir »** : mémo libre (zone qui grandit, enregistré au blur, « Enregistré » 1,5 s) ; « La demande » (3 lignes, « Lire tout ») ; résumé IA daté.
6. **« Dossier »** : le devis (numéro, statut, montant, date d'envoi → ouvre l'espace devis), les photos (nombre + 3 vignettes → feuille Photos), le client (téléphone, email, adresse, « N autres chantiers », Modifier).
7. **Facturation** (`FacturesProjet`) — seulement si devis non brouillon, non refusé, et projet accepté / en cours / terminé.
8. **Carnet {n}** : titre + bouton « + Ajouter » (téléphone) ; recherche (insensible aux accents) ; 4 filtres à compteur (Tout, Notes, Photos, Suivi) ; fil du plus récent au plus ancien, semaine en cours dépliée, mois anciens repliés en une ligne ; état vide en pointillés.

Sur ordinateur (≥ 1024 px) : deux colonnes, « À retenir / Dossier / Facturation » collants à droite.

### Ce qu'on voit sans défiler à 360 × 740 *(estimé à partir des classes)*
Hauteur utile ≈ 740 − 48 (barre du haut) − ~64 (barre du bas) ≈ **620 px**.
- En-tête complet ≈ 260 px (marge 16, ligne retour 48, identité ~60, boutons 68 + marges, progression ~30).
- « Maintenant » commence vers 285 px : phrase + détails + bouton principal tiennent ; pour un projet neuf (« Préparer le devis avec l'IA » + explication IA + 2 secondaires « Faire le devis moi-même », « Résumer mes notes avec l'IA »), la carte fait ~330-380 px : **les boutons secondaires sont coupés**.
- Après une capture (`?cree=1`), la carte « bien reçu » (~110 px) repousse « Maintenant » : on ne voit plus que la phrase et peut-être le bouton principal.
- Rien de « À faire », « À retenir », « Dossier » ni du Carnet n'est visible sans défiler. Le Carnet est **le dernier bloc** sur téléphone.

### Où sont photo / note / dictée
- **Téléphone** : le [+] de la barre du bas (libellé « Ajouter ») → feuille « Ajouter au projet », grille 2×2 : **Dicter**, **Photos**, **Note**, **Rendez-vous** (lien vers le planning). Aussi « + Ajouter » en tête du Carnet (tout en bas), « Ajouter » dans l'en-tête de « À faire » (ouvre directement Note), et le bouton principal « Ajouter une note ou des photos » quand le chantier est en cours.
- **Ordinateur** : trois pastilles « Dicter », « Photos », « Note » en tête du Carnet ; le bouton « Nouveau projet » de la barre latérale crée toujours un projet.
- Gestes : **photo** = [+] → Photos → « 📷 Prendre une photo » → déclencheur → valider = **5** (envoi immédiat, pas de bouton « Enregistrer »). Galerie : bouton séparé. **Dictée** = [+] → Dicter → « 🎙 Dicter une note » → parler → « ⏹ Arrêter » → « Ajouter cette note au projet » = **5**. Sans reconnaissance vocale, « Dicter une note » ouvre directement la saisie manuelle ; « ✍️ Écrire à la place » est toujours proposé ; toucher le texte arrête l'écoute pour corriger. **Note écrite** = [+] → Note → titre (+ description, rappel, importance) → enregistrer = ≥ 4.

### Menu « … » (dans l'ordre)
Modifier les infos du client · Priorité (Urgent / Important / Normal) · — · Planifier un rendez-vous · Marquer la visite effectuée (si pas faite) · Préparer un message au client (IA) · Résumer mes notes avec l'IA (si pertinent) · Devis express (sans IA) (si aucun devis) · — · Marquer le projet comme terminé (orange, **sans confirmation**).

### Machine « Maintenant » (`prochaineAction.ts`)
| État | Phrase | Principal | Secondaires |
|---|---|---|---|
| Pas de devis | « Nouvelle demande, pas encore chiffrée. » (ou « Visite prévue avant de chiffrer ») | Préparer le devis avec l'IA | Faire le devis moi-même ; Résumer mes notes avec l'IA |
| Devis brouillon | « Un devis est en préparation. » | Terminer le devis | — |
| Devis à valider | « Le devis est prêt : à relire, puis à envoyer. » | Ouvrir et envoyer | — |
| Envoyé < 3 j | « Devis envoyé hier… En attente… » | Voir le devis | — |
| Envoyé ≥ 3 j | « … toujours sans réponse. » | Préparer une relance avec l'IA | Voir le devis |
| Refusé | « Le client a refusé le devis. » | Repartir de ce devis | Nouveau devis avec l'IA |
| Accepté | « Le client a signé le devis. » | Planifier le démarrage / Démarrer le chantier | Démarrer maintenant ; Facturer un acompte |
| En cours | « Chantier en cours depuis N jours. » | Ajouter une note ou des photos | Planifier un passage ; Terminer le chantier |
| Terminé | « Chantier terminé le … » | Voir la facturation (si devis envoyé) | — |

### Brouillons
Dictée (`NotesVocales`, `localStorage` par projet, bandeau « Note non enregistrée retrouvée ») et note (`FormulaireNote`) : oui. **Mémo « À retenir » et infos client : non** (le mémo n'est enregistré qu'au blur ; fermer l'onglet en tapant perd le texte). Feuille « Message au client » IA : non.

### États
- Chargement : texte gris « Chargement… » en haut à gauche (pas de squelette, alors que la route `demandes/loading.tsx` existe pour la liste).
- Erreur de chargement : `EtatErreur` + Réessayer. Introuvable : message + lien retour.
- Erreur d'action : texte orange sous « Maintenant » ; `ErreurInline` + Réessayer pour le mémo et les infos.
- Génération du devis : seul le bouton passe en chargement (jusqu'à 60 s, `maxDuration = 60`), l'appel est annulé si on quitte la page.

### Points faibles évidents
- **Deux feuilles différentes nommées « Message au client »** : le bouton « Message » de l'en-tête ouvre des modèles prêts (SMS / WhatsApp en un appui, `FeuilleMessageClient`) ; le menu « … › Préparer un message au client » et l'action « Préparer une relance avec l'IA » ouvrent une feuille IA où il faut **copier** le texte puis aller soi-même dans la messagerie. La relance depuis l'accueil, elle, passe par les modèles. Deux chemins, deux résultats.
- Le fichier page fait 1305 lignes et recharge **tout** après chaque geste (8 à 11 requêtes).
- Un seul devis chargé (le dernier) : les versions précédentes ne sont visibles que depuis l'espace devis.
- « Marquer le projet comme terminé » sans confirmation ni annulation.
- Sur téléphone, le Carnet (là où l'on cherche « la mesure de la fenêtre ») est tout en bas, après quatre cartes.

---

## 4. CAPTURE

### Fichiers
`components/navigation/FeuilleCapture.tsx`, `components/accueil/BoutonCapture.tsx`, `app/dashboard/demandes/nouvelle/page.tsx` (558 l.), `importer/page.tsx` (310 l.), `importer-capture/page.tsx` (366 l.), `partage/[id]/page.tsx` (341 l.), `app/api/partage/route.ts` (142 l.) + `matcher/route.ts` (92 l.), `app/manifest.ts` (`share_target`), `public/sw.js` (compression des images partagées), `components/dashboard/CorrespondanceProjetExistant.tsx`, `BrouillonProjet.tsx` (227 l.), `ConfirmationRdv.tsx`, `lib/ai/brouillonProjet.ts` (144 l.), `lib/dictee.ts` (82 l.), `lib/messagesClient.ts` (283 l.).

### Les quatre portes
1. **Partage natif (Android, application installée)** : `manifest.share_target` → `POST /api/partage` (multipart `titre`, `texte`, `url`, `fichiers` image/*). Le service worker compresse les images avant l'envoi (limite Vercel 4,5 Mo). La route enregistre les images dans le stockage `photos`, insère une ligne `partages_entrants`, puis redirige (303) vers `/dashboard/demandes/partage/{id}`. Échecs → `/nouvelle?erreur=partage_illisible | partage_echec_serveur | partage_trop_lourd`. **Pas sur iPhone** (Web Share Target non pris en charge).
2. **« Coller un message »** (`importer`) : un bouton « Coller le message copié » (lit le presse-papiers ; si refusé, on colle à la main), une zone de 8 lignes avec un exemple, bouton « Préparer le brouillon ». Avant l'IA, `matcher` cherche un client connu par numéro.
3. **« Photo ou capture »** (`importer-capture`) : choix de **plusieurs** captures, redimensionnées dans le navigateur, `/api/ai/analyser-captures`, puis une carte par capture avec un **select** « Où importer ce message ? » (nouveau projet / projet existant proposé / ne pas importer) et « Confirmer l'import » (`/api/ai/confirmer-import-captures`). Fin : « N captures importées » + « Voir les projets ». **Ne passe pas par `BrouillonProjet`** ni par la fiche avec `?cree=1` ; un RDV détecté est seulement signalé (« à planifier vous-même »).
4. **« Écrire moi-même »** (`nouvelle`) : Nom du client (focus auto), Téléphone (facultatif), « Ce que veut le client » (3 lignes) avec un bouton micro **seulement si** le navigateur sait dicter, « Créer le projet ». Insertion directe dans `demandes` (type de chantier deviné par mots-clés), évènement « Premier contact », puis fiche avec `?cree=1`. Avertit si un projet existe déjà pour ce nom ou ce téléphone (liens vers eux).

### La revue après partage (`partage/[id]`)
1. « Récupération du message partagé… » (spinner), en parallèle : lecture de `partages_entrants` et `POST /api/partage/matcher`.
2. Partage vide → `/nouvelle?erreur=partage_vide`. Images sans texte → brouillon vide « Photo partagée — à compléter. » (pas d'IA).
3. Un ou plusieurs projets ouverts pour ce numéro → `CorrespondanceProjetExistant` : « Ce client a déjà un projet ouvert » + un bouton par projet (« Dupont — Salle de bain ») + lien « Ce n'est pas ça — créer un nouveau projet quand même ». Choisir un projet → `/api/demandes/ajouter-note-depuis-partage` → fiche **sans** `?cree=1`.
4. Sinon : « L'IA prépare le brouillon… » (`/api/ai/preparer-brouillon` → `lib/ai/brouillonProjet.ts` : nom, téléphone, adresse, type parmi 21, résumé, urgence, date et heure de RDV, chacun avec une confiance `explicite | deduit | absent`).
5. `BrouillonProjetForm` : « Relisez, puis créez le projet. » ; Client, Téléphone, Adresse, Type, Urgence, Résumé, chacun avec un badge de confiance ; date et heure de RDV si détectées ; « Voir le message d'origine » ; bouton collant **« Créer le projet »** (`/api/demandes/creer-depuis-brouillon`).
6. Si un RDV était proposé → `ConfirmationRdv` : « ✓ Accepter ce créneau » (→ **planning**), « Choisir une autre date » (→ formulaire planning) ou « Voir le projet sans planifier maintenant » (→ fiche **sans** `?cree=1`). Sinon → fiche `?cree=1`.

### Repli manuel si l'IA ou la dictée échoue
- **IA en échec (partage)** : message d'erreur + bouton « Créer le projet manuellement » → `/nouvelle` **vide** : le texte partagé n'est pas reporté (il reste dans `partages_entrants`, mais l'écran ne le relit pas).
- **IA en échec (coller)** : message d'erreur au-dessus du formulaire ; le texte collé reste dans le champ (pas de brouillon local si on quitte).
- **Dictée** (`lib/dictee.ts`) : `messageErreurDictee` renvoie toujours « …ou écrivez directement » (micro refusé, rien entendu, réseau, interruption) ; le champ texte reste disponible ; la dictée **s'ajoute** à ce qui est écrit ; `assemblerTranscription` corrige le bégaiement d'Android (« je veux je veux… ») ; à la fin, un numéro dicté remplit le téléphone s'il est vide et le focus va au nom. Le micro n'est même pas affiché si le navigateur ne sait pas dicter. La feuille de capture n'a plus de micro (27/09) : on compte sur le micro du clavier.
- Brouillon de `nouvelle` : la **description seule** est gardée en `localStorage` (« Description non enregistrée retrouvée — relisez-la… ») ; nom et téléphone sont perdus.

### L'accusé de réception (« bien reçu »)
- Texte : `accuse()` dans `lib/messagesClient.ts` → « Bonjour, bien reçu votre message. Je suis sur un chantier, je vous rappelle ce soir. » + signature (nom de l'artisan, entreprise).
- Où : carte en tête de la fiche, **seulement** si l'URL porte `?cree=1` (le paramètre est effacé aussitôt de l'adresse), si le projet a un téléphone et si aucun `message_prepare` n'existe.
- Envoi : `ouvrirMessage` construit `sms:{n}?body=…` (même onglet) ou `https://wa.me/{n}?text=…` (nouvel onglet). **Compyo n'envoie rien** : il ouvre la messagerie, l'artisan appuie sur « envoyer ». Le carnet note « Message préparé » (jamais « envoyé »).

### Comptage : WhatsApp → partage → projet créé → accusé envoyé (Android, appli installée, cas favorable)
| # | Geste | Où |
|---|---|---|
| 1 | Appui long sur le message | WhatsApp |
| 2 | Icône Partager | WhatsApp |
| 3 | Choisir « Compyo » (parfois après défilement ou « Plus ») | feuille de partage Android |
| — | attente : envoi, correspondance, IA (plusieurs secondes) | Compyo |
| 4 | Relire, puis « Créer le projet » | revue du brouillon |
| 5 | « WhatsApp » dans la carte « bien reçu » | fiche projet |
| 6 | Envoyer | WhatsApp |
**Minimum : 6 gestes**, si l'IA a trouvé le nom et **le téléphone**. À ajouter : saisie du téléphone s'il manque (+2 à +3), choix d'un client connu (+1, mais alors **plus de carte « bien reçu »**), créneau détecté (+1, et **plus de carte « bien reçu »** car on part vers le planning ou vers une fiche sans `?cree=1`).
*(déduit)* Un message partagé depuis WhatsApp ne contient que le texte, pas le numéro de l'expéditeur : sauf si le client a écrit son numéro, le téléphone est vide et **la carte « bien reçu » ne s'affiche pas** — le chemin le plus rapide perd son accusé dans le cas le plus courant.

**iPhone** (pas de partage natif) : appui long → Copier (2) → ouvrir Compyo (1) → [+] (1) → Coller un message (1) → Coller le message copié (1, + autorisation éventuelle) → Préparer le brouillon (1) → Créer le projet (1) → WhatsApp (1) → Envoyer (1) ≈ **10-11 gestes**.

### Points faibles évidents
- Trois logiques d'atterrissage différentes après création (fiche `?cree=1`, planning, fiche sans `?cree=1`, liste des projets pour les captures) : l'accusé de réception n'est proposé que dans la première.
- Aucun brouillon local pour le texte collé ni pour la revue du brouillon IA.
- Le repli « Créer le projet manuellement » repart d'un formulaire vide.
- `importer-capture` : `select` natif par capture, pas de revue champ par champ, pas d'accusé.
- La feuille de capture promet « l'IA prépare le projet », mais l'écran « Coller » exige encore un geste « Préparer le brouillon » puis « Créer le projet ».

---

## 5. DEVIS SUR TÉLÉPHONE

### Fichiers
`app/dashboard/devis/[id]/page.tsx` → `components/devis/EspaceDevis.tsx` (430 l.) → selon le statut `components/dashboard/ValiderDevis.tsx` (806 l., brouillon) ou `components/devis/SuiviDevis.tsx` (339 l., validé et après) ; `EditeurLignes.tsx` (557 l.), `ScoreDevis.tsx` (145 l.), `CompletionMention.tsx` (154 l.), `ApercuPdf.tsx` (202 l., vrai PDF rendu par pdf.js), `DocumentDevis.tsx`, `lib/devis/qualite.ts` (314 l.), `lib/devis/actions.ts`, `app/api/ai/generer-devis/route.ts` (505 l.).

### Génération (`/api/ai/generer-devis`)
Appelée depuis la fiche (« Préparer le devis avec l'IA »). Lit le projet, les notes vocales, le métier, les paramètres entreprise ; un appel Claude (60 s max) ; contrôle des postes (quantités, prix, unités), postes « oubliés probables » en suggestions, lots seulement si ≥ 2 lots complets ; insertion du devis en `brouillon` (avec réessai sur conflit de numéro) ; projet → `devis_genere` sauf statut protégé. Puis la fiche **redirige vers l'espace devis**.

### Données chargées (espace devis)
`devis *` (par id) + organisation, puis en parallèle : le projet (nom, téléphone, email, adresse, statut, accepte_le), `parametres_entreprise *`, `profils.nom`, les autres versions du même projet ; puis l'URL signée du logo.

### Écran à 360 px, devis en brouillon, de haut en bas
1. « ← Projet · {client} » (petit, 12 px).
2. « Devis n° D-2026-0042 » + pastille de statut ; « {client} · 1 234,00 € TTC » ; « Autres versions : n° … ».
3. Bouton « Télécharger le PDF » (visible même en brouillon ; « Partager le PDF » masqué en brouillon).
4. **Onglets « Modifier » / « Aperçu du PDF »** (segmenté, sous 1024 px seulement).
5. Onglet Modifier :
   - **`ScoreDevis` en premier** : anneau de score, « Avant d'envoyer », « N points à vérifier » ou « Tout est en ordre », « Conformité du document : X %. Vous restez libre d'envoyer… ». **Ouvert d'office** si un point juridique est en « attention », sinon replié. Points triés (attention, conseil, ok), en deux groupes : conformité (décennale, identité, objet, validité, TVA…, pondérés) et « Ce que votre client comprendra » (libellés vagues, « Divers », lots, lignes à 0, unité/prix, durée, forme juridique). Une mention manquante se complète sur place (`CompletionMention` : champ + raison + Enregistrer → paramètres).
   - **`ValiderDevis`** (carte `p-6`) : « MODIFIER LE DEVIS » + phrase « Rien n'est envoyé… » ; bandeau « Vos modifications non validées ont été retrouvées » + « Revenir au devis enregistré » si brouillon local ; **Objet des travaux** ; **Total TTC en direct** ; alerte « Paramètres d'entreprise non configurés » si besoin ; **`EditeurLignes`** (badge « IA » sur les lignes générées, flèches haut/bas, lots renommables et repliables, pas de glisser-déposer, « + Ajouter une ligne ») ; postes fréquents ; Déplacement / Marge / TVA ; conditions (validité, acompte, début, durée, adresse du chantier, mention TVA réduite) ; commentaires ; récapitulatif chiffré ; suggestions IA « oubliés » (ajouter / ignorer) ; **bouton collant « Valider ce devis · 1 234,00 € »** au-dessus de la barre du bas, erreur affichée juste au-dessus.
6. Onglet Aperçu : le vrai PDF page par page.

**Ce que montre l'écran en premier** : le titre, le montant, le bouton PDF, les onglets, puis **le score** — pas les lignes. Les lignes commencent après l'objet, le total et l'éventuelle alerte de paramètres : sur 360 × 740, elles sont **sous la ligne de flottaison**.

### Après « Valider » (statut `a_valider`) — `SuiviDevis` « Prêt à partir »
Le score reste affiché au-dessus. Carte : « Relisez l'aperçu. En l'envoyant, le devis est figé… » ; avertissement si ni téléphone ni email ; **« Envoyer au client »** ; « Modifier (nouvelle version) » ; « Déjà envoyé autrement ? Le noter comme envoyé ». Sur téléphone, l'aperçu PDF est **en dessous** (plus d'onglets hors brouillon). « Partager le PDF » apparaît dans l'en-tête ; après un partage ou un téléchargement du PDF, la question « Ce devis est parti chez le client ? Oui, il est envoyé / Pas encore ».

### Comment l'envoi au client se fait réellement
« Envoyer au client » **n'envoie rien** : `marquerDevisEnvoye` passe le devis en `envoye` (date, mentions légales figées) et le projet en `devis_envoye`. L'écran devient « En attente de la réponse du client » avec **« Partager (SMS, WhatsApp, mail…) »** (`navigator.share` d'un texte contenant le **lien de signature en ligne**), « Copier le lien », le message affiché et « Copier ce message ». C'est l'artisan qui choisit l'application et le destinataire. Ensuite : « Le client a répondu ? » (accepté / refusé avec confirmation / nouvelle version) ; la signature en ligne est automatique.

### Gestes pour vérifier et envoyer (depuis la fiche, devis généré)
| Étape | Gestes |
|---|---|
| Préparer le devis avec l'IA (+ « Préparer quand même » s'il manque des infos) | 1 (+1) |
| Vérifier : onglet Aperçu, défiler, revenir à Modifier | ≥ 2 + défilement |
| Valider ce devis | 1 |
| Envoyer au client | 1 |
| Partager (SMS, WhatsApp…) | 1 |
| Choisir WhatsApp dans la feuille système | 1 |
| Choisir le contact (recherche possible) | ≥ 1 |
| Envoyer dans WhatsApp | 1 |
**Minimum ≈ 7 gestes après génération, sans aucune correction**, plus 2 si l'on regarde le PDF. Le numéro du client, connu de Compyo, n'est pas utilisé : il faut retrouver le contact dans WhatsApp (contrairement aux messages de `FeuilleMessageClient` qui ouvrent `wa.me/{numéro}`).

### Brouillon
`ValiderDevis` écrit l'état complet (lignes, lots, conditions…) dans `compyo:brouillon-devis:{id}` via `lib/brouillonLocal`, 400 ms après chaque changement ; effacé à la validation ; jeté si le devis enregistré a changé depuis.

### États
Chargement : squelette ; introuvable : message + « Voir tous les devis » ; erreur : `EtatErreur` + Réessayer ; erreur de validation : bandeau orange au-dessus du bouton collant (ligne sans description, total ≤ 0, validité hors 1-365, acompte hors 0-100, lot sans nom, adresse de chantier vide, colonne manquante en base). Erreur PDF : texte orange.

### Points faibles évidents
- Le libellé « Envoyer au client » fige le devis sans l'envoyer ; l'envoi réel demande encore 4 gestes ailleurs. Deux statuts (`a_valider`, `envoye`) pour un seul geste pensé par l'artisan.
- Le score (« Conformité 78 % ») passe avant les lignes : ce qu'on vérifie d'abord, c'est la note, pas le contenu.
- Écran de modification très long (≈ 15 groupes de champs) avant le bouton — atténué par le bouton collant.
- « Télécharger le PDF » affiché en brouillon (le PDF d'un brouillon peut partir chez le client).
- `navigator.share` absent (ordinateur, certains navigateurs) : il ne reste que « Copier ».

---

## 6. PLANNING

### Fichiers
`app/dashboard/planning/page.tsx` (159 l., serveur), `components/planning/AgendaMobile.tsx` (338 l., téléphone), `GrilleAgenda.tsx` (445 l., ordinateur), `actionsEvenement.ts` (69 l.), `app/dashboard/planning/nouveau/page.tsx` (573 l., création **et** modification via `?eventId=`), `lib/meteo.ts` (135 l.), `components/projet/FeuilleMessageClient.tsx`.

### Données chargées
`evenements_planning *` + `demandes(nom_client, priorite, type_chantier, telephone_client, adresse_client)` de l'organisation, du lundi au dimanche de la semaine `?semaine=offset`, **non annulés** ; `parametres_entreprise.adresse` ; puis météo Open-Meteo (géocodage de la **ville du siège**, pluie ≥ 60 % ou vent ≥ 50 km/h → risque ; délai 4 s, sans clé). L'alerte ne vaut que pour les chantiers extérieurs (`TYPES_CHANTIER_METEO_SENSIBLES` : maçonnerie, terrassement, façade, toiture, charpente, aménagement extérieur…).

### Vue par défaut sur téléphone (360 px), de haut en bas
1. Bandeau vert « ✓ Un rendez-vous a été ajouté… » si `?rdvCree=1`.
2. « Planning » (h1) + bouton « + Ajouter » (48 px, contour).
3. Ligne semaine : flèche ‹ · « 29 sept. – 5 oct. » · flèche ›.
4. **Bande des 7 jours** (onglets) : initiale du jour, numéro, point si quelque chose est prévu ; le jour choisi en noir ; aujourd'hui en orange. **Jour par défaut : aujourd'hui** (sinon le premier jour qui a un évènement, sinon lundi).
5. « Revenir à aujourd'hui » si on n'est pas sur la semaine courante.
6. Titre du jour (« Aujourd'hui » ou « jeudi 2 octobre »).
7. Liste du jour : par ligne, **l'heure en gros**, le client (ou le titre), « {titre} · {adresse} », « Fait » grisé, « Météo à risque · 70 % de pluie… ». Vide : « Rien de prévu. ».
8. Appui sur une ligne → **feuille d'actions** titrée « 14h30 · Dupont » :
   - si lié à un projet : trois grands boutons Appeler / **Message** (devient **« Prévenir »** quand l'alerte météo concerne ce chantier) / Itinéraire (grisés si la donnée manque) ;
   - « Météo à risque ce jour-là : … » ;
   - « C'est fait » (ou « Remettre à faire »), « Ouvrir le projet », « Modifier ou déplacer » (→ formulaire) ;
   - à l'écart : « Annuler le rendez-vous », « Supprimer » (confirmation navigateur).
   - « Message / Prévenir » ouvre `FeuilleMessageClient` (modèles : météo en premier si alerte, retard, décalage, rappel de RDV…, chacun SMS / WhatsApp vers le numéro du client).

Ordinateur : grille horaire de la semaine (7 h-20 h, élargie si un évènement sort de la plage), couleurs par priorité, légende, évènements superposés côte à côte ; clic → menu : « Prévenir le client » (⚠️ si météo), « → Ouvrir le projet », « ✏️ Modifier », « ✓ Marquer terminé », « Annuler », « Supprimer ». **Pas de glisser-déposer** nulle part.

### Formulaire `planning/nouveau` (création et modification)
Haut en bas : type **Rendez-vous / Tâche** ; « Projet lié (optionnel) » : bouton « Choisir un chantier » qui déplie la liste de **tous** les projets non terminés (avatar + nom ; pas de recherche) ; Titre (obligatoire ; « Chantier {nom} » proposé quand on choisit un projet) ; Date (`input date`) ; Heure (`input time`) ; Durée (rendez-vous) : 30 min, 1 h, 2 h, ½ journée, Journée + « − / + » au quart d'heure ; Notes ; « Enregistrer ». Contrôle de chevauchement côté client puis contrainte en base. Succès → `/dashboard/planning`.
- Arrivée avec `?projetId=` (depuis la fiche) : le projet est présélectionné mais **le titre n'est pas pré-rempli** (le pré-remplissage n'a lieu que si on choisit le projet dans la liste) et **la date et l'heure sont vides**.
- Pas de brouillon local.

### Gestes
| Action | Téléphone |
|---|---|
| Créer un RDV depuis le planning | + Ajouter (1) → Choisir un chantier (1) → projet (1) → date (≥ 2 avec le sélecteur natif) → heure (≥ 2) → durée (1) → Enregistrer (1) ≈ **9** |
| Créer depuis la fiche | Planifier… (1) → titre (1) → date (≥ 2) → heure (≥ 2) → durée (1) → Enregistrer (1) ≈ **8** |
| Déplacer un RDV | ligne (1) → Modifier ou déplacer (1) → date (≥ 2) → heure (≥ 2) → Enregistrer (1) ≈ **7** ; **aucune proposition de prévenir le client** après coup |
| Annuler un RDV | ligne (1) → Annuler le rendez-vous (1) = **2**, **sans confirmation**, sans annulation possible, sans message au client ; le RDV disparaît (les annulés ne sont pas chargés) |
| Prévenir le client (météo) | ligne (1) → Prévenir (1) → SMS/WhatsApp (1) → Envoyer (1) = **4** |
| Marquer fait | ligne (1) → C'est fait (1) = 2 |

### Membres d'une organisation
- Tout est filtré par `organisation_id` : **chaque membre voit tous les évènements de l'équipe**, mélangés.
- `artisan_id` (qui a créé) est enregistré mais **n'est affiché nulle part** ; il n'existe ni « assigné à », ni couleur par personne, ni filtre « mes rendez-vous ».
- Le contrôle de chevauchement (client) **et** la contrainte d'exclusion en base (`evenements_planning_pas_de_chevauchement` : `organisation_id with =, periode with &&`, rendez-vous non annulés) portent sur **toute l'organisation** : deux compagnons ne peuvent pas avoir deux rendez-vous à la même heure sur deux chantiers différents (message : « Ce créneau vient d'être pris par quelqu'un d'autre de votre équipe »).

### États
Chargement : `planning/loading.tsx`. Vide : « Rien de prévu. » (téléphone), « Rien de prévu cette semaine. » (ordinateur). Erreur de chargement de la page serveur : liste vide silencieuse *(déduit)*. Erreur d'action dans la feuille : message ; erreur du formulaire : « Impossible d'enregistrer. Réessayez. », « Créneau déjà pris : … », « Impossible de vérifier les créneaux déjà pris. ». Météo indisponible : simplement absente.

### Points faibles évidents
- Une équipe ne peut pas se répartir les rendez-vous (contrainte d'organisation entière) et ne voit pas qui fait quoi.
- Annuler en 2 gestes sans confirmation ni message au client ; déplacer sans proposer « Prévenir ».
- Création longue (≈ 8-9 gestes), sélecteur de projet sans recherche, date et heure vides par défaut.
- Météo du siège, pas du chantier.
- L'heure affichée sur téléphone suit le fuseau de l'appareil, le reste de l'app celui de Paris ; la semaine est calculée en UTC côté serveur.

---

## Récapitulatif des fichiers morts ou orphelins repérés en passant
- `components/dashboard/ResumeJournee.tsx`, `ConseilsCompagnon.tsx`, `NouveauProjetMenu.tsx`, `components/notes/NotesRappelsAujourdhui.tsx` : plus importés.
- `app/dashboard/equipe/page.tsx` et `app/dashboard/retours` : aucune entrée de navigation n'y mène.
