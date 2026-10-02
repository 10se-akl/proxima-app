# Statut des deux prompts précédents : ce qui a vraiment été exécuté

*Inventaire en lecture seule du 01/10/2026, sur la branche `refonte-app` (HEAD `f8d263b`, arbre de travail propre). Tout a été vérifié dans le code, pas seulement dans les messages de commit. Rien n'a été lancé : ni build, ni tsc, ni serveur. Les critères visuels (390 px, nombre de gestes à l'écran) ne sont donc vérifiés que par la lecture du code.*

Prompts examinés :
- `prompt-simplification-produit.md`, dit « Moins mais mieux », lots A à H ;
- `prompt-experience-telephone-et-bugs.md`, dit « Téléphone et bugs ».

Correspondance avec l'historique :
- **Lots A à H** : 9 commits les 26 et 27/09, de `c17d51f` à `fd2c40b`. Ils portent le nom du lot dans leur message.
- **Vérification de fin du prompt 1** : `936f5b5`.
- **Retours d'Axel** : `cc4a3f7` à `91bc744`, ainsi que `f8d263b`.
- **Prompt « téléphone et bugs »** : `8f70eab` à `6f643ef`, le 27/09. Aucun commit ne cite ce prompt ; c'est le contenu des commits qui permet de les y rattacher.
- **Hors prompt** : particules de la vitrine (`a0a250b`, `24d2994`, `5f8b51d`), page Guide (`b0c0bdc`).

Légende des statuts :
- **FAIT** : demande exécutée et visible dans le code.
- **PARTIEL** : exécutée en partie ; ce qui manque est indiqué.
- **ABSENT** : rien trouvé dans le code.
- **ANNULÉ-ensuite** : fait, puis défait par un commit ultérieur.

---

## 1. Prompt « Moins mais mieux » (lots A à H)

| # | Demande (résumée) | Statut | Preuve | Ce qui manque / remarque |
|---|---|---|---|---|
| §2 | Mesures « avant / après » et compte des gestes des 5 scénarios | ABSENT du dépôt | Seule trace : le message de `efa7dac` (« jusqu'à douze blocs… ») | Ni tableau ni rapport dans le dépôt ou dans `docs/`. Le rapport a peut-être été donné dans le chat, mais il est introuvable. |
| A | Barre fixe en bas : Aujourd'hui · Projets · [+] · Planning · Plus, libellés visibles, état actif avec trait | FAIT | `c17d51f` · `components/dashboard/Sidebar.tsx:206-259`, onglet actif tracé `:413-414` | — |
| A | Feuille « Plus » : Devis, Factures, Notes, Bilan, Paramètres, puis « Idées et retours » à part | FAIT (+1) | `Sidebar.tsx:80-88`, `:261-313` | Une 6e entrée **Guide** a été ajoutée ensuite (`b0c0bdc`, `Sidebar.tsx:86-87`) : voir les contradictions. |
| A | Équipe et Carte mentale sortent de la navigation | FAIT | `Sidebar.tsx:74-88` ; Équipe est un groupe de Paramètres (`VueParametres.tsx:615`) ; la carte mentale reste joignable par « Ce que disent les artisans » (`:294-300`) | Les routes existent toujours. |
| A | Pastille seulement sur Aujourd'hui, s'il y a du retard | FAIT | `app/dashboard/layout.tsx` (comptage des notes en retard), `Sidebar.tsx:219` et `:351-355` | — |
| A | Zone sûre en bas ; le contenu ne passe pas sous la barre | FAIT | `layout.tsx` : `<main … pb-[calc(5rem+env(safe-area-inset-bottom))]>` ; `Sidebar.tsx:209` | — |
| A | Bouton « Avis & idées » sans chevauchement ; hamburger retiré sur mobile | FAIT | `BoutonRetour.tsx` : `hidden sm:flex` ; en-tête mobile `Sidebar.tsx:197-203` (logo et notifications seulement) | — |
| A | Barre latérale d'ordinateur de même structure | FAIT | `Sidebar.tsx:321-387` | — |
| B | MiniApercu, ConseilsCompagnon, Devis refusés et paragraphes d'explication sortis de l'accueil | FAIT | `efa7dac` · aucun import dans `app/` ; les fichiers sont conservés (`components/dashboard/MiniApercu.tsx`, `ConseilsCompagnon.tsx`, `ResumeJournee.tsx`) | Ces fichiers ne servent plus nulle part et pourront être supprimés. |
| B | 5 blocs au plus, dans l'ordre : Maintenant, À confirmer, Aujourd'hui, À faire de votre côté, En attente du client | FAIT | `components/accueil/VueAccueil.tsx:64-122` ; calculs dans `app/dashboard/page.tsx:311-402` | — |
| B | « À confirmer » fusionne AConfirmer et ConfirmerClotureProjet, Oui / Non sur la ligne | FAIT | `VueAccueil.tsx:69-80` (`integre`) | — |
| B | « Aujourd'hui » : une seule liste triée par heure, retard en tête avec pastille | FAIT | `page.tsx:328-369` ; `ListeAujourdhui.tsx:139-164` | — |
| B | Titre + nombre ; 5 lignes puis « Voir les N » ; état vide « Rien d'urgent. » + capture | FAIT | `components/accueil/Blocs.tsx:12-38` ; `VueAccueil.tsx:124-131` | — |
| B | La prochaine action n'est pas répétée ailleurs | FAIT | `page.tsx:324-325` (`pasMisEnAvant`) | — |
| B | « Maintenant » et le début d'« Aujourd'hui » visibles sans défiler à 390 px | Non vérifiable ici | — | Demande des captures (vérification visuelle). |
| C | Un seul [+] ; plus d'autre bouton « Nouveau projet » ; les états vides ouvrent la même feuille | FAIT | `b63f7f2` · `app/dashboard/demandes/page.tsx:25` ; `BoutonCapture.tsx` (événement `compyo:ouvrir-capture`) ; `Sidebar.tsx:168-172` | Sur ordinateur, le bouton « Nouveau projet » de la barre latérale (`Sidebar.tsx:328-334`) ouvre la même feuille. |
| C | Très grand micro « Parler » (≥ 96 px) + 3 choix secondaires | **ANNULÉ-ensuite** | Fait dans `b63f7f2`, retiré dans `91bc744` sur retour d'Axel (« sert à rien et marche pas bien ») · `components/navigation/FeuilleCapture.tsx:11-45` | La feuille propose maintenant 3 lignes égales : Coller un message (IA), Photo ou capture (IA), Écrire moi-même. « Dicter » n'apparaît dans « Écrire » que si le navigateur le permet (`demandes/nouvelle/page.tsx:521-527`). Le critère « 2 gestes pour parler » n'est plus tenu. Il reste du code mort : `?dictee=1` et un commentaire sur « Parler » (`nouvelle/page.tsx:324-333`, `:469`). |
| D.1 | `lib/messagesClient.ts` : 7 modèles purs, `ouvrirMessage(canal, numero, texte)`, liens `sms:` et `wa.me`, normaliseur existant réutilisé, format français | FAIT | `06ba6ee` · `lib/messagesClient.ts:26` (les 7 clés), `:63-123` (les modèles), `:140-177` (ouverture), `normaliserTelephone` importé `:1` | Pas de tests : le projet n'a aucun outil de test (`package.json`), ce qui est conforme à la consigne. Le modèle météo n'a pas de signature (texte d'origine « inchangé »). |
| D.2 | Feuille « Message au client » : 2 ou 3 messages selon le contexte, SMS et WhatsApp, première phrase visible | FAIT | `components/projet/FeuilleMessageClient.tsx:177-268` ; règles dans `messagesClient.ts:212-275` | — |
| D.2 | Numéro absent : saisie sur place puis enregistrement | FAIT | `FeuilleMessageClient.tsx:150-155`, `:195-233` | — |
| D.2 | Trace « Message préparé : … » (jamais « envoyé ») ; `notifie_relance_le` mis à jour | FAIT | `FeuilleMessageClient.tsx:93-123` ; type `message_prepare` dans `types/index.ts:305` | Aucune migration nécessaire : `evenements_projet.type` est un texte libre (`supabase/schema.sql:294`). |
| D.3.1 | « Message » à côté d'Appeler et d'Itinéraire dans l'en-tête de la fiche | FAIT | `components/projet/EnTeteProjet.tsx:204-231` | — |
| D.3.2 | Planning : « Prévenir le client » ouvre la feuille, météo en premier | FAIT | `components/planning/GrilleAgenda.tsx:267`, `:317-321` ; version mobile `AgendaMobile.tsx:253`, `:326-333` | — |
| D.3.3 | Après une capture : « Répondre : bien reçu » | **PARTIEL** | `VueProjet.tsx:293-318` (affiché seulement avec `?cree=1`) ; posé par `importer/page.tsx:200`, `nouvelle/page.tsx:417`, `partage/[id]/page.tsx:256` | Le parcours **Photo ou capture** (`importer-capture/page.tsx:289`) renvoie vers la liste des projets, sans `?cree=1` : pas de « bien reçu » par ce chemin. Écart assumé : SMS et WhatsApp au lieu du SMS seul (`fd2c40b`). |
| D.3.4 | « Relancer » sur l'accueil ouvre la feuille avec la bonne relance | FAIT | `page.tsx:387`, `:395-398` ; `VueAccueil.tsx:110-117` ; lecture des paramètres d'URL dans `VueProjet.tsx:134-143` | — |
| D.3.5 | Notifications de relance avec `?message=…` | PARTIEL (effet de H.1) | `app/api/cron/relance-devis/route.ts:196`, `relance-factures/route.ts:160` | Si un passage du cron prépare 2 relances ou plus, la notification groupée pointe vers `/dashboard` (`lib/notifications/budget.ts:61`). Le parcours passe alors à 3 gestes au lieu de 2. |
| E | À partir de 17 h (constante), « Maintenant » devient « Fermer la journée » : Aujourd'hui (chiffres), En suspens (Fait / Demain), Demain | FAIT | `45e9fb0` · `page.tsx:34`, `:292-307`, `:442-502` ; `FermerJournee.tsx:161-225` | — |
| E | Bouton « C'est bon pour aujourd'hui », clé datée dans `localStorage`, « Journée fermée. Tout est noté. » | **ANNULÉ-ensuite** | Fait dans `45e9fb0`, retiré dans `f8d263b` | Voir la section 3. |
| E | Aucune notification ni confetti ; tout est calculé | FAIT | `FermerJournee.tsx` (aucun appel réseau autre que Supabase) | — |
| F | Complétion sur place dans ScoreDevis (champ prérempli, raison d'une ligne, « Enregistrer », même validation que Paramètres) | FAIT | `f6871ee` · `components/devis/CompletionMention.tsx:28-123`, `ScoreDevis.tsx:72` ; validation partagée dans `lib/parametres/index.ts` | Le lien vers Paramètres ne reste que pour la TVA contradictoire. |
| F | Paramètres repliés par groupe, pastille « Complet » ou « N à compléter » | FAIT | `components/parametres/VueParametres.tsx:183`, `:239-624`, `:664-669` | 8 groupes (7 demandés + « Mon compte »). Les onglets ont été retirés. |
| G | Composant Engagements, texte en constante unique, contact vide = 3e ligne masquée, drapeau désactivé, affiché à 2 endroits | FAIT | `d88d922` · `lib/confiance.ts:18` (`ENGAGEMENTS_ACTIFS = false`), `:23` (`CONTACT_HUMAIN = ""`) ; `components/confiance/Engagements.tsx:13` ; `VueParametres.tsx:622` ; `components/marketing/vitrine/Sections.tsx:134` | Rien ne s'affiche aujourd'hui (drapeau à `false`). |
| H.1 | Budget de notifications : 1 notification non urgente par jour, sans migration ni changement sur cron-job.org | FAIT | `034ae3f` · `lib/notifications/budget.ts:42-96` ; utilisé par les deux crons de relance | Les rappels programmés par l'artisan restent hors budget, comme demandé. |
| H.2 | « Rien ne se perd » : brouillon local restauré puis effacé après enregistrement | PARTIEL | `lib/brouillonLocal.ts` ; branché sur `ValiderDevis.tsx` (édition du devis) et `VueParametres.tsx` | Couvert ailleurs par des mécanismes antérieurs : `demandes/nouvelle`, `FormulaireNote`, `NotesVocales`. **Non couverts** : création de facture (`FacturesProjet.tsx`), import d'un message collé (`importer/page.tsx`), saisie du numéro dans la feuille Message, formulaire `/demander-acces`. La liste classée par risque demandée n'est pas dans le dépôt. |
| §5 | Vérification : captures 390 / 1440 px, relecture « Gérard », accessibilité | PARTIEL | `936f5b5` (zones tactiles de 48 px, contrastes, `motion-safe`) | Aucune capture ni relecture « Gérard » versionnée. |

## 2. Prompt « Téléphone et bugs »

Ce prompt demandait une chasse large, sans liste fermée. Le tableau suit ses points prioritaires (§3) et ses vérifications (§4).

| Demande (résumée) | Statut | Preuve | Ce qui manque / remarque |
|---|---|---|---|
| Inventaire complet des écrans et liste des bugs classée 🔴🟠🟡 | ABSENT du dépôt | — | Aucune liste ni capture avant / après versionnée. |
| Zones tactiles de 44 px et plus, vitrine et application | FAIT | `d0e0d9b` (18 fichiers), `936f5b5`, `cc4a3f7` | Reste à corriger : le bouton « 📷 Choisir des captures d'écran » (`importer-capture/page.tsx` : `py-2.5 text-sm`, environ 40 px, effets au survol seulement). |
| Pas de zoom iOS ; champs à 48 px | FAIT | `cc4a3f7` · `app/globals.css` (16 px `!important`) | — |
| Clavier virtuel : barre du bas masquée pendant la saisie | FAIT | `e2a9972` · `app/globals.css:780-782` (`:has()`) | Sans `:has()` (anciens Samsung Internet), la barre reste affichée. |
| Réseau dégradé : notifications sans « Chargement… » infini | FAIT | `1b5f955` · `CentreNotifications.tsx` | — |
| Paramètres : session expirée = message et « Réessayer », jamais de valeurs par défaut écrites par-dessus | FAIT | `ea41bf1` · `app/dashboard/parametres/page.tsx`, `lib/parametres/index.ts` | — |
| Connexion : retour à l'écran demandé (lien de notification), vrai message hors réseau | FAIT | `3de129a` · `middleware.ts:83-91` ; `app/(auth)/login/page.tsx:44-45` (chemin interne `/dashboard` uniquement, pas de redirection ouverte) | — |
| PWA : plus de rechargement surprise qui efface une saisie | FAIT | `8f70eab` · `components/pwa/EnregistrerServiceWorker.tsx`, `MiseAJourPWA.tsx` | Installation réelle sur Android et iPhone non vérifiée (vrai téléphone nécessaire). |
| Photos de chantier : appareil photo **et** galerie, boutons inactifs pendant l'envoi | FAIT | `32a92e1` · `components/dashboard/PhotosProjet.tsx:184-201` | Comportement en cas d'échec d'un envoi multiple sur réseau faible : non vérifié. |
| Planning au doigt sur écran étroit | FAIT | `f5c1afd` (agenda mobile `components/planning/AgendaMobile.tsx`, actions partagées dans `actionsEvenement.ts`) ; `249be41` (durée au quart d'heure) | La grille reste sur ordinateur. |
| Devis sur téléphone : aperçu PDF léger, bouton sous le pouce | FAIT | `476139d` · `components/devis/ApercuPdf.tsx:109-120` (IntersectionObserver) ; `fba2e43` (« Valider ce devis » collant) | Le **passage en paysage** pendant l'édition n'a pas été traité (aucun commit). |
| Débordements de page (768 px, Bilan) | FAIT | `c34aa3f` · `app/dashboard/layout.tsx` (`min-w-0`), `VueBilan.tsx`, `GraphiqueActivite.tsx` | — |
| Formulaires accessibles (libellé relié au champ, autocomplete) | FAIT | `acea6ed` · `components/ui/Input.tsx` ; `app/demander-acces/page.tsx:177-243` | — |
| Dictée Android (texte répété) ; repli manuel | FAIT | `8272cdd` · `lib/dictee.ts` | — |
| Geste « retour » d'Android : ferme la feuille au lieu de quitter la page | FAIT | `6f643ef` · `lib/retourFeuilles.ts`, `components/projet/Feuille.tsx` | Risque de régression, voir la section 4. |
| Vitrine : poids des pages en 4G, vidéo de démonstration | PARTIEL (déjà en place) | `components/marketing/VideoDemo.tsx:81-86` (`preload="none"` + affiche), antérieur au prompt | Aucune mesure de poids faite. **Nouvelle dépendance three.js** ajoutée sur la vitrine (`a0a250b`), chargée à la demande. |
| Vitrine : formulaires `/contact` et `/demander-acces` (claviers adaptés, saisie conservée en cas d'échec) | PARTIEL | `/demander-acces` : `type="tel"`, `type="email"`, autocomplete (`acea6ed`). `/contact` n'a pas de formulaire (lien `mailto:`, `SectionContact.tsx:28`). | Pas de brouillon local sur `/demander-acces` : un rechargement après un échec perd la saisie. |
| Vitrine : liens externes (`rel`, nouvel onglet) | FAIT (déjà en place) | Tous les `target="_blank"` ont `rel="noopener noreferrer"` (vérifié par grep) | `AvisGoogle.tsx:144` contient des hex en dur (`#C96B4A`), ce qui enfreint la règle des tokens. C'est antérieur aux prompts. |
| Vitrine : menu mobile (Échap, défilement bloqué) | FAIT (déjà en place) | `components/marketing/Cadre.tsx:168-182` (`bc78568`, 25/09) | — |
| Mode sombre des écrans récents (retours, carte mentale, factures) | ABSENT (aucun commit dédié) | Seulement le texte d'erreur en sombre (`acea6ed`) | À vérifier visuellement. |
| Navigateurs intégrés (WhatsApp, Instagram), Samsung Internet, Safari iOS | Non vérifiable | — | Le protocole de test demandé n'est pas dans le dépôt. |
| Web Share Target (partage WhatsApp) | Inchangé, non retesté | `app/dashboard/demandes/partage/[id]/page.tsx` (seulement `?cree=1` ajouté) | — |
| §4.1 `tsc`, `build` et `lint` | Non vérifié ici | — | Non lancés : l'inventaire est en lecture seule, et `tsc` écrit `tsbuildinfo`. |

## 3. Le bouton « C'est bon pour aujourd'hui » : pourquoi `f8d263b` l'a retiré, et ce qu'il en reste

**Ce que demandait le lot E.**
- Quand « En suspens » est vide, un bouton « C'est bon pour aujourd'hui » s'affiche.
- L'appui mémorise localement que la journée est fermée.
- Il affiche ensuite « Journée fermée. Tout est noté. »
- Le geste final devait marquer le moment de soulagement.

**Pourquoi il a été retiré** (message du commit, et commentaire `FermerJournee.tsx:22-26`). Sur retour d'Axel du 27/09, trois raisons :
- le bouton ne faisait que remplacer la carte par un message calme, sans rien changer d'autre (ni rappels, ni notifications) ;
- on ne pouvait pas revenir en arrière ;
- même Axel ne savait pas à quoi il servait.

**Ce qu'il en reste dans `components/accueil/FermerJournee.tsx`.**
- **Le bloc reste en place.** Les trois lignes Aujourd'hui / En suspens / Demain sont toujours là (`:161-225`), avec « Fait » et « Demain » sur chaque élément (`:190-211`).
- **L'état calme s'affiche tout seul.** Dès que `restants.length === 0` (`:138-156`), sans aucun geste, la carte affiche :
  - « Tout est réglé pour aujourd'hui. » ;
  - la ligne de bilan « Aujourd'hui · … », qui est nouvelle dans cet état ;
  - « Demain · … ».
- **Ce qui a été supprimé :**
  - `CLE_STOCKAGE` (`"compyo:journee-fermee"`) ;
  - `lireFermee` et `ecrireFermee` ;
  - l'état `fermee` et le `useEffect` qui le lisait ;
  - le bouton lui-même.
- **Restes morts :**
  - le champ `cleJour` du type `Fermeture` (`:41-43`, commentaire périmé « la clé de la journée fermée ») est toujours calculé dans `app/dashboard/page.tsx:295` et renvoyé `:501`, mais plus personne ne le lit ;
  - la condition `restants.length > 0` (`:181`) est désormais toujours vraie dans cette branche ;
  - une ancienne clé `compyo:journee-fermee` peut rester dans le `localStorage` des téléphones déjà utilisés. Elle est sans effet.
- **Conséquences sur le lot E :**
  - le critère « au plus 4 gestes » devient 3 gestes ;
  - la mémoire locale de la journée fermée disparaît ;
  - le libellé passe de « Tout est noté » à « Tout est réglé ». La phrase reste exacte vis-à-vis d'« En suspens », mais elle peut sembler fausse quand les blocs « À faire » et « En attente » ne sont pas vides juste en dessous (point de goût à arbitrer) ;
  - un compte avec des projets mais rien en suspens voit « Tout est réglé » dès 17 h, sans avoir rien fait.

## 4. Ce qui contredit une demande, et les régressions possibles

**Changements qui contredisent une consigne**

1. **Le micro « Parler » est retiré** (`91bc744`). Cela contredit les lots C et D-critères (« deux gestes pour parler »). C'est une décision d'Axel ; le commentaire le documente.
2. **Le bouton « C'est bon pour aujourd'hui » est retiré** (`f8d263b`). Cela contredit le lot E. Décision d'Axel.
3. **Nouvelle dépendance `three`** (`a0a250b`, `package.json:23`). Les deux prompts disent « aucune dépendance nouvelle ». C'est une demande explicite d'Axel ; le module est chargé à la demande et une image fixe s'affiche si `prefers-reduced-motion` est activé.
4. **Page « Guide » dans la feuille Plus** (`b0c0bdc`). Le §4 du prompt 1 interdit les « visites guidées à la place d'une interface qui s'explique d'elle-même ». Le Guide est une page séparée, pas une infobulle, mais il ajoute une 6e entrée à « Plus ».
5. **Plus de texte explicatif.** `91bc744` ajoute :
   - une phrase de détail sous chaque choix de la capture (`FeuilleCapture.tsx:27-41`) ;
   - une ligne « ce que l'IA va faire » sous le bouton principal de la fiche.

   Cela va à l'encontre des règles « moins de texte » et « pas plus d'une ligne ». La limite d'une ligne est respectée, mais le volume de texte augmente.
6. **« Demain » dans « Fermer la journée » s'applique aussi aux rendez-vous.** Le prompt ne le demandait que pour les notes. `FermerJournee.tsx:98-103` déplace le rendez-vous client au lendemain, même heure, sans prévenir le client ni proposer la feuille Message. C'est un risque métier (rendez-vous client déplacé en silence dans le planning).
7. **Notification groupée vers `/dashboard`** (`budget.ts:61`). Elle casse le parcours en 2 gestes du lot D.3.5 dès qu'il y a 2 relances ou plus.

**Régressions possibles à tester sur téléphone**

- **`lib/retourFeuilles.ts`** (`6f643ef`). Une entrée d'historique est ajoutée à chaque ouverture de feuille. Risques :
  - interaction avec le routeur Next ;
  - double « retour » nécessaire ;
  - feuille rouverte par « suivant ».

  À tester : la feuille Message ouverte par `?message=` (l'URL est déjà réécrite par `replaceState`, `VueProjet.tsx:142`), et la feuille Plus suivie d'un lien.
- **Barre du bas masquée au focus** (`globals.css:780`). Le sélecteur `:has(...:focus)` couvre toute saisie. À vérifier : qu'elle ne reste pas cachée après la fermeture du clavier sans perte du focus (Android).
- **Capture sans micro.** `?dictee=1` n'est plus jamais posé, mais le code de démarrage automatique de la dictée reste (`nouvelle/page.tsx:329-334`). Code mort, pas un bug.
- **Fuseau horaire de l'accueil.**
  - Problème : les bornes « aujourd'hui » des rendez-vous, notes et rappels (`page.tsx:64-67`, `setHours` sur le serveur en UTC) diffèrent des bornes de Paris utilisées pour « Fermer la journée ».
  - Conséquence : entre minuit et 2 h, ou pour un rendez-vous tôt le matin, un élément peut tomber du mauvais côté.
  - Origine : antérieur aux lots, mais toujours présent.
- **Après 17 h, la prochaine action disparaît** (`page.tsx:323`). Par exemple, « Envoyer le devis » n'est plus mis en avant. L'élément reste dans « À faire de votre côté », mais n'est plus en tête.
- **Aperçus non versionnés.** `app/apercu-moins/` et `app/apercu-guide/` (données simulées) sont exclus par `.git/info/exclude`. Ils ne partent pas avec un déploiement Git, mais partiraient avec un `vercel deploy` lancé depuis le dossier local, en route publique.

## 5. Fichiers qui ne servent plus

| Fichier | Statut | Note |
|---|---|---|
| `components/dashboard/MiniApercu.tsx` | Plus importé | Peut être supprimé. |
| `components/dashboard/ConseilsCompagnon.tsx` | Plus importé (seulement cité dans un commentaire de `useParallaxSouris.ts`) | Peut être supprimé. |
| `components/dashboard/ResumeJournee.tsx` | Plus importé (remplacé par FermerJournee) | Peut être supprimé. |
| `components/dashboard/NouveauProjetMenu.tsx` | Plus importé (seulement cité dans un commentaire de `nouvelle/page.tsx:163`) | Peut être supprimé. |

## 6. Ce qui reste à faire pour solder ces deux prompts

- **Lot D.3.3** : poser `?cree=1` (ou un équivalent) après « Photo ou capture ».
- **Lot E** : supprimer `cleJour` (champ mort) et décider du libellé « Tout est réglé ».
- **Lot E** : limiter « Demain » aux notes, ou faire précéder le déplacement d'un rendez-vous par la feuille Message.
- **H.2** : ajouter un brouillon local sur la création de facture, l'import de message et `/demander-acces`.
- **Vérifications de terrain jamais documentées dans le dépôt :**
  - mesures avant / après ;
  - 5 scénarios ;
  - captures 360 / 390 / 412 / 768 / 1440 px en clair et en sombre ;
  - test réel sur Samsung (SMS et WhatsApp, accents et symbole €, installation PWA, partage WhatsApp, navigateurs intégrés) ;
  - mode paysage pendant l'édition d'un devis.
- **Action d'Axel** : remplir `CONTACT_HUMAIN`, puis passer `ENGAGEMENTS_ACTIFS` à `true` une fois les engagements tenus côté facturation.
