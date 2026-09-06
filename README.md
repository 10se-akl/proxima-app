# Compyo — MVP

Assistant IA pour artisans du bâtiment : transformez une demande client en devis structuré.

## Ce qu'il y a dans ce dossier

Un projet Next.js complet (code de l'application). Il ne fonctionne pas "tout seul" en
double-cliquant dessus — contrairement à une page HTML simple, une application comme
celle-ci doit être **lancée** sur ton ordinateur avec quelques outils gratuits.
Suis les étapes ci-dessous dans l'ordre, ça prend 15-20 minutes la première fois.

---

## Étape 1 — Installer Node.js (si ce n'est pas déjà fait)

Va sur **https://nodejs.org**, télécharge la version "LTS" (recommandée), installe-la
comme n'importe quel logiciel (Suivant, Suivant, Terminer).

Pour vérifier que ça a fonctionné, ouvre une invite de commande (touche Windows, tape
"cmd", Entrée) et tape :
```
node -v
```
Si un numéro de version s'affiche (ex: v20.11.0), c'est bon.

## Étape 2 — Créer un projet Supabase (base de données + connexion)

1. Va sur **https://supabase.com**, crée un compte gratuit
2. Clique sur **"New Project"**
3. Donne-lui un nom (ex: "compyo"), choisis un mot de passe pour la base de données
   (note-le quelque part), choisis une région proche de toi (ex: Paris/Frankfurt)
4. Attends 1-2 minutes que le projet soit prêt
5. Une fois dans le projet, va dans l'onglet **"SQL Editor"** (menu de gauche)
6. Ouvre le fichier `supabase/schema.sql` de ce dossier, copie tout son contenu,
   colle-le dans l'éditeur SQL de Supabase, et clique sur **"Run"**
   → ça crée les tables et la sécurité (chaque artisan ne voit que ses données)
7. Va dans **Project Settings > API** (menu de gauche, en bas)
8. Note quelque part deux valeurs : **Project URL** et **anon public key**

## Étape 3 — Récupérer une clé API Anthropic (pour l'IA)

1. Va sur **https://console.anthropic.com**, crée un compte
2. Va dans **"API Keys"**, clique sur **"Create Key"**
3. Copie la clé générée (elle ne sera affichée qu'une seule fois, note-la bien)

## Étape 4 — Configurer le projet

1. Dans ce dossier, trouve le fichier `.env.local.example`
2. Fais-en une copie, et renomme la copie en `.env.local` (sans ".example")
3. Ouvre `.env.local` et remplace les valeurs par celles que tu as notées aux étapes 2 et 3

## Étape 5 — Installer et lancer

Ouvre une invite de commande **dans ce dossier** (sur Windows : ouvre le dossier dans
l'explorateur, puis tape `cmd` dans la barre d'adresse et appuie sur Entrée).

Tape ensuite, une ligne à la fois :

```
npm install
```
(ça installe tout ce dont le projet a besoin, ça prend 1-2 minutes)

```
npm run dev
```

Une fois que c'est lancé, ouvre ton navigateur et va sur :
```
http://localhost:3000/signup
```

Tu peux maintenant créer un compte artisan et tester le produit.

---

## Étape 6 — Activer la bêta privée (candidatures + panneau admin)

Depuis cette mise à jour, un visiteur ne crée plus de compte directement : il dépose une
candidature (`/demander-acces`), et c'est vous qui l'acceptez ou la refusez depuis un
panneau admin. Voici comment le configurer.

0. **Mettez à jour votre base de données** : ouvrez `supabase/schema.sql`, copiez
   uniquement la nouvelle section "Bêta privée : candidatures" (tout en bas du fichier),
   collez-la dans le **SQL Editor** de Supabase et cliquez sur "Run" — ça ajoute la
   nouvelle table sans toucher à ce qui existe déjà
1. **Récupérez votre clé "service_role"** (différente de la clé "anon" utilisée jusqu'ici) :
   Supabase → **Project Settings > API** → section "Project API keys" → copiez la clé
   `service_role` (⚠️ jamais dans le navigateur, uniquement dans `.env.local`)
2. **Créez-vous un compte administrateur** : allez sur `http://localhost:3000/login`,
   puis "Créer un compte" (ou directement `/signup`) avec votre propre email
3. Dans `.env.local`, remplissez :
   - `SUPABASE_SERVICE_ROLE_KEY` (récupérée à l'étape 1)
   - `ADMIN_EMAIL` = l'email exact utilisé à l'étape 2
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (à changer une fois en ligne)
4. **Autorisez le lien d'invitation** : dans Supabase → **Authentication → URL
   Configuration**, ajoutez `http://localhost:3000/**` dans "Redirect URLs" (sinon le lien
   envoyé aux artisans acceptés ne fonctionnera pas)
5. Relancez `npm run dev`

### Utilisation
- Un artisan candidate sur `/demander-acces`
- Vous consultez les candidatures sur `/admin/candidatures` (connecté avec votre compte
  admin)
- Vous cliquez sur "Accepter" → Compyo crée le compte et envoie un email à l'artisan avec
  un lien pour définir son mot de passe → il arrive ensuite directement sur son tableau de
  bord

Pour recevoir un email à chaque nouvelle candidature (optionnel), créez un compte gratuit
sur **resend.com**, récupérez une clé API, et ajoutez-la dans `RESEND_API_KEY`. Sans cette
clé, tout fonctionne quand même — il faut juste penser à consulter `/admin/candidatures`
de temps en temps.

## Étape 7 — Sprint 1 : Projet, paramètres entreprise et moteur métier

Cette mise à jour change en profondeur comment les devis sont calculés : l'IA ne décide
plus jamais d'un prix, c'est un moteur de calcul séparé (100% code, sans IA) qui s'en
charge, à partir de vos propres paramètres d'entreprise.

1. **Mettez à jour votre base de données** : ouvrez `supabase/schema.sql`, copiez tout ce
   qui se trouve après le commentaire `-- Module 1 —`, collez-le dans le **SQL Editor**
   de Supabase, cliquez sur "Run"
2. Relancez `npm run dev`
3. Allez sur `/dashboard/parametres` et remplissez au moins votre coût horaire et votre
   TVA — sans ça, Compyo utilise des valeurs par défaut (45€/h, 20% de TVA) pour ne
   jamais bloquer un devis, mais vos vrais chiffres seront plus justes
4. Testez à nouveau la génération d'un devis sur un projet : vous verrez maintenant le
   détail complet (sous-total, déplacement, marge, TVA) au lieu d'un simple total

## Étape 8 — Logs et réponse client suggérée

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez la section
   `-- Module 10 — Logs`, collez-la dans le SQL Editor de Supabase, "Run"
2. Relancez `npm run dev`
3. Sur un projet déjà analysé par l'IA, une nouvelle section **"3. Préparer une réponse
   au client"** apparaît : l'IA rédige un brouillon, vous le relisez, l'ajustez si besoin,
   et cliquez sur "Copier le texte" pour l'envoyer vous-même (SMS, email...). Rien n'est
   jamais envoyé automatiquement.
4. Sur `/admin/logs` (avec votre compte admin), vous voyez maintenant chaque analyse,
   génération de devis, réponse générée et erreur — utile pour comprendre ce qui se passe
   pendant vos tests.

## Étape 9 — Créer un projet automatiquement à partir d'un message

Pas de mise à jour SQL nécessaire cette fois. Relancez simplement `npm run dev`.

Sur `/dashboard/demandes`, un nouveau bouton **"Importer un message"** permet de coller
tel quel un message reçu d'un client (SMS, email, WhatsApp...). L'IA en extrait
automatiquement le nom, les coordonnées si elles sont mentionnées, et un résumé du
besoin — le projet est créé directement, sans ressaisie manuelle.

## Étape 10 — Planning (Module 6)

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez la section
   `-- Module 6 — Planning`, collez-la dans le SQL Editor de Supabase, "Run"
2. Relancez `npm run dev`
3. Un nouvel onglet **"Planning"** apparaît dans la barre latérale : vue simple par jour,
   rendez-vous et tâches mélangés (comme "8h Chantier Dupont", "15h Envoyer devis")
4. Depuis un projet, le bouton **"+ Planifier"** pré-remplit le lien avec ce projet

Aucun appel IA n'intervient dans le planning — c'est entièrement de la base de données,
donc gratuit et instantané.

## Étape 11 — Tableau de bord, priorités et cycle de vie du projet

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, repérez les
   lignes `alter table demandes add column if not exists priorite...` et
   `alter table devis add column if not exists envoye_le...`, collez-les (avec les
   commentaires autour) dans le SQL Editor de Supabase, "Run"
2. Relancez `npm run dev`
3. Le tableau de bord (`/dashboard`) est maintenant l'écran d'accueil réel : résumé du
   jour, alertes de relance (devis envoyés depuis plus de 7 jours sans réponse), et la
   liste de vos projets avec une pastille de couleur selon leur priorité
4. Sur un projet, vous pouvez régler sa **priorité** (Urgent / Important / Normal), et une
   fois le devis généré, le marquer **"envoyé"** puis **"accepté"** au fil de la relation
   avec le client — ça met à jour son statut et déclenche le calcul de relance

## Étape 12 — Notes libres et accueil premier lancement

Aucune mise à jour SQL nécessaire (la colonne existait déjà). Relancez `npm run dev`.

- Sur un projet, une zone **"Notes libres"** apparaît sous la description : tout ce que
  vous tapez s'enregistre automatiquement dès que vous cliquez ailleurs (pas besoin de
  bouton "Enregistrer" — un petit "✓ Enregistré" confirme la sauvegarde)
- Si vous n'avez encore aucun projet, le tableau de bord affiche un accueil simple plutôt
  que des statistiques vides

## Étape 13 — Notes vocales (dictée, sans coût IA)

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez la section
   `-- Notes vocales`, collez-la dans le SQL Editor de Supabase, "Run"
2. Relancez `npm run dev`
3. Sur un projet, sous "Notes libres", un bouton **"🎙 Dicter une note"** apparaît.
   Cliquez, autorisez l'accès au micro si le navigateur le demande, parlez, puis
   "⏹ Arrêter l'enregistrement" — le texte transcrit s'affiche, vous pouvez le corriger
   avant de l'ajouter au projet
4. **Fonctionne uniquement sur Chrome et Edge** (technologie du navigateur, pas de service
   externe) — sur d'autres navigateurs, un message l'indique clairement

## Étape 14 — Agenda visuel et rendez-vous détectés automatiquement

Aucune mise à jour SQL nécessaire cette fois. Relancez `npm run dev`.

- Le planning (`/dashboard/planning`) est maintenant un vrai agenda visuel par semaine,
  avec les rendez-vous et tâches positionnés par horaire, colorés selon la priorité du
  projet lié : 🔴 urgent, 🟠 important, 🟢 normal, gris pour une tâche sans projet
- Naviguez entre les semaines avec les flèches, cliquez sur un événement pour ouvrir le
  projet lié (ou le cocher comme terminé s'il n'est lié à aucun projet)
- **Nouveau** : quand vous utilisez "Importer un message" et que le client propose une
  date/heure explicite ("vous seriez dispo mardi 14h ?"), un rendez-vous est ajouté
  automatiquement au planning — vous pouvez toujours le modifier ou le supprimer ensuite

## Étape 15 — Cycle de vie complet et historique du projet

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez les 3
   lignes `alter table demandes add column if not exists accepte_le/demarre_le/termine_le`,
   collez-les dans le SQL Editor de Supabase, "Run"
2. Relancez `npm run dev`
3. Sur un projet accepté, deux nouveaux boutons font avancer le chantier : **"Marquer le
   chantier comme démarré"** puis **"Marquer comme terminé"**
4. En bas de chaque projet, une section **"Historique"** retrace maintenant tout le fil du
   projet dans l'ordre : création, notes vocales, devis généré/envoyé/accepté, démarrage
   et fin de chantier

## Étape 16 — Photos, résumé IA enrichi, anti-conflit planning

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez la section
   `-- Photos de projet`, collez-la dans le SQL Editor de Supabase, "Run" — ça crée
   l'espace de stockage sécurisé pour les photos (chaque artisan ne voit que les siennes)
2. Relancez `npm run dev`
3. Sur un projet, section **"Photos"** : cliquez "📷 Ajouter des photos", sélectionnez-en
   une ou plusieurs (sur mobile, ça peut ouvrir directement l'appareil photo). Survolez
   une photo pour la supprimer.
4. **"Analyser avec l'IA"** prend maintenant en compte vos notes libres ET vos notes
   vocales, pas seulement la description initiale — l'IA fait le tri entre ce qui compte
   pour le chantier et le reste. Après avoir ajouté de nouvelles notes, un bouton
   **"Mettre à jour le résumé"** permet de relancer l'analyse.
5. **Planning** : impossible d'ajouter un rendez-vous qui chevauche un autre — un message
   clair indique le conflit et l'horaire déjà pris
6. **Planning** : cliquer sur un événement ouvre maintenant un petit menu ("Ouvrir le
   projet" / "Marquer terminé" / "Supprimer") plutôt que d'agir directement

**Bonus, aucune action nécessaire** : la couleur d'un événement sur l'agenda est déjà liée
en direct à la priorité du projet — si vous passez un projet d'urgent à normal, sa couleur
change de rouge à vert automatiquement la prochaine fois que vous ouvrez le planning.

## Étape 17 — Mobile, sécurité des suppressions, détection concrète

Aucune mise à jour SQL nécessaire. Relancez `npm run dev`.

- **Le logiciel est maintenant utilisable sur téléphone** : sur petit écran, la navigation
  devient un menu avec un bouton ☰ en haut, au lieu de la barre latérale fixe
- **Confirmation avant suppression** : supprimer un rendez-vous ou une photo demande
  maintenant une confirmation, pour éviter les fausses manipulations
- **Recherche** sur la liste des projets (nom du client, adresse)
- **Le tableau de bord détecte et affiche concrètement** (plus seulement un chiffre) :
  - les **rappels** à faire aujourd'hui ET ceux en retard (surlignés)
  - les **devis générés mais pas encore envoyés** au client
  - les **devis envoyés sans réponse depuis plus de 7 jours** (relance)

  Chaque ligne est cliquable et ouvre directement le projet concerné.

## Étape 18 — Simplification avant la bêta

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez les lignes
   `alter table demandes add column if not exists derniere_modification_le/visite_le/
   photos_ajoutees_le`, collez-les dans le SQL Editor de Supabase, "Run"
2. Relancez `npm run dev`

**Ce qui change :**
- **Créer un projet prend maintenant moins de 30 secondes** : juste le nom du client, un
  téléphone facultatif, et une description rapide — dictable directement au micro. Tout le
  reste (adresse, email, type de chantier) se complète plus tard, depuis le projet, via
  "+ Compléter les informations"
- **Checklist visuelle** : après l'analyse IA, les informations manquantes s'affichent en
  cases à cocher plutôt qu'une simple liste — un aide-mémoire, jamais une obligation
- **Le devis suit le projet** : si vous ajoutez une photo, une note ou une note vocale
  après avoir généré un devis, un bandeau propose "Le projet a changé depuis le dernier
  devis. Voulez-vous le mettre à jour ?" — toujours à valider, jamais automatique
- **Nouveau bouton "Marquer visite effectuée"**, visible dans l'historique
- **Le tableau de bord ne montre plus que ce qu'il y a à faire aujourd'hui** : rendez-vous,
  rappels, devis à terminer, devis en attente de réponse. Plus de chiffres à interpréter,
  plus de liste de projets dupliquée (elle est sur la page "Projets", avec la recherche)

## Étape 19 — Détection automatique du type de chantier

Aucune mise à jour SQL. Relancez `npm run dev`.

Quand vous créez un projet en version rapide, Compyo devine maintenant le type de
chantier (salle de bain, cuisine, plomberie...) à partir de votre description — par
reconnaissance de mots-clés, sans IA, donc gratuit et instantané. Il s'affiche en petit
tag sur la carte du projet, et reste modifiable via "+ Compléter les informations" si la
détection se trompe.

## Étape 20 — Mon compte, et un accueil moins vide

Aucune mise à jour SQL. Relancez `npm run dev`.

- **Paramètres** a maintenant deux onglets : "Mon entreprise" (comme avant) et **"Mon
  compte"** — modifiez votre nom, votre métier, ou votre mot de passe
- **Tableau de bord** : quand il n'y a rien de prévu aujourd'hui, il affiche vos projets
  actifs les plus prioritaires plutôt qu'un écran quasiment vide

## Étape 21 — Confirmation au lieu de "en retard", modification, parrainage

Aucune mise à jour SQL. Relancez `npm run dev`.

- **Fini le "en retard" culpabilisant** : les rendez-vous et tâches passés non confirmés
  apparaissent maintenant dans une section **"À confirmer"** sur le tableau de bord —
  "Avez-vous fait ce chantier ?", avec "Oui, c'est fait" ou "Non, replanifier" (qui
  propose directement une nouvelle date)
- **Modifier un événement du planning** : dans le menu (clic sur un événement), un bouton
  **"✏️ Modifier"** permet de changer l'heure sans tout supprimer/recréer
- **Parrainage** : dans Paramètres → Mon compte, un bouton copie un lien d'invitation.
  Si un collègue candidate via ce lien, sa candidature indique automatiquement qui l'a
  recommandé

## Étape 22 — Facturation

1. **Mettez à jour votre base de données** : dans `supabase/schema.sql`, copiez toute la
   section `-- Module 28 (06/09) — Facturation.` (jusqu'à la fin du fichier), collez-la
   dans le **SQL Editor** de Supabase, "Run"
2. Relancez `npm run dev`
3. **Avant votre toute première facture** : allez dans Paramètres → "Informations
   légales" et complétez au minimum votre **SIRET** (obligatoire, la création de facture
   est bloquée sans lui) — le reste (TVA intracommunautaire, assurance décennale, IBAN)
   est fortement recommandé mais pas bloquant.

**Ce qui change :**
- Un nouvel onglet **"Factures"** dans la navigation, et une section "Facturation" sur la
  fiche de chaque projet dont le devis a été accepté
- **Facture d'acompte** : montant libre en €, calculé en HT/TTC au même taux de TVA que le
  devis
- **Facture (solde)** : reprend les lignes du devis, déduit automatiquement les acomptes
  déjà facturés — une seule facture de solde par devis (protection contre le double clic)
- **Avoir** : annule une facture émise ou payée, en créant un document séparé plutôt qu'en
  supprimant quoi que ce soit — une facture reste immuable une fois émise, y compris au
  niveau de la base de données (voir le trigger `verrouiller_facture_emise` dans
  `schema.sql`)
- **Numérotation légale continue** (sans trou, par organisation et par année) via
  `prochain_numero_facture()` — plus robuste que le compteur "comptage + nouvelle
  tentative" utilisé pour les devis, volontairement, parce qu'un trou dans la
  numérotation d'un devis n'a aucune conséquence légale, contrairement à une facture
- **Export comptable (CSV)** : bouton disponible sur la liste des factures et sur chaque
  fiche projet facturée
- **Relance suggérée** : sur un devis envoyé depuis au moins 1 jour sans réponse, un
  bouton "Suggérer une relance" prépare un brouillon de message (même mécanisme que
  "Préparer une réponse au client", jamais envoyé automatiquement)
- **Mémoire client visible** : la fiche projet affiche désormais "Vous avez déjà travaillé
  avec ce client sur X autre(s) chantier(s)" quand c'est le cas (rapprochement déjà fait en
  interne par numéro de téléphone, simplement jamais montré jusqu'ici)

**⚠️ Ce que cette étape ne fait PAS** : transmettre une facture à l'administration fiscale
via une Plateforme Agréée (PDP), obligatoire pour la facturation électronique B2B à partir
de septembre 2026. Ça suppose un compte chez un partenaire externe (démarche commerciale,
pas du code) — voir le rapport de cycle livré séparément pour la marche à suivre et les
questions à poser à un comptable avant de considérer ce module comme suffisant pour une
mise en conformité complète.

## Si quelque chose ne marche pas

- **Erreur liée à Supabase** → vérifie que `.env.local` contient bien les vraies valeurs
  (pas celles de l'exemple), et que tu as bien exécuté `schema.sql`
- **Erreur liée à l'IA ("L'assistant IA n'a pas pu…")** → vérifie ta clé Anthropic dans
  `.env.local`, et qu'il te reste du crédit sur ton compte Anthropic
- **"npm n'est pas reconnu"** → Node.js n'est pas installé correctement, reprends l'étape 1

## Structure du projet

Voir le fichier `ARCHITECTURE.md` pour le détail des choix techniques.
