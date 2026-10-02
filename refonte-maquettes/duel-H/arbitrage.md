# Duel H : arbitrage du juge

> J'ai lu le protocole, les consignes du juge, le brief, les candidats A à D (argumentaires et rendus PNG, clair et sombre) et la critique adverse. J'ai vérifié le code au commit 9e7dcd5, qui inclut 7e51a30. Le livrable qui en découle est `docs/langage-interface.md`.

## Ce que j'ai vérifié moi-même

| Affirmation | Verdict | Preuve |
|---|---|---|
| Le filet tactile dépend encore de `prefers-reduced-motion` (A, lot 0, et la règle 6 de `candidat-A.html`) | **Faux** depuis 7e51a30 | `app/globals.css:259` (`@media all`). Ce qui reste : le plancher est de 44 px, pas 48, et ne couvre que `button, a[role="button"]` (`:296-299`) |
| Une saisie faite hors ligne « n'est pas perdue » ou est « en attente du réseau » (maquettes B, C et D) | **Faux en général** | `public/sw.js:47-54` : aucune écriture n'est mise en file. C'est vrai seulement pour les brouillons locaux (`NotesVocales.tsx:52-90`, `lib/brouillonLocal.ts`, utilisé par `ValiderDevis` et `VueParametres`). « Note vocale gardée sur ce téléphone » (D) est donc vrai pour le texte dicté. « Vos saisies sont gardées » ne l'est pas, une coche ou un « Oui » est perdu |
| « Chantier terminé · Annuler » (D) | **Infaisable tel quel** | Clore un chantier fait trois écritures (`ConfirmerClotureProjet.tsx:65-99`), et aucune fonction « Rouvrir » n'existe dans le dépôt (grep vide) |
| « Supprimer le projet… puis Annuler » (C) | **Action inexistante** | `variant="danger"` n'a qu'un usage, `SuiviDevis.tsx:297`, et il vient après une question (`:294`) |
| Cocher une tâche sur l'accueil la fait disparaître sans trace | Vrai | `ListeAujourdhui.tsx:40,55-56`. La liste rend `null` quand elle est vide, donc la trace doit vivre hors de la liste |
| « Fait · Annuler » existe déjà sur la fiche | Vrai, mais à 28 px | `projet/Blocs.tsx:279-290`. « Annuler » est en `min-h-0 py-1` (`:286`), avec un minuteur de 6 s (`:221`) |
| Il n'y a ni vibration, ni indicateur réseau, ni `error.tsx`, ni `loading.tsx` sur la fiche | Vrai | `navigator.vibrate` et `onLine` : 0 occurrence. `error.tsx` : 0 fichier. « Chargement… » dans `demandes/[id]/page.tsx:941` |
| Deux couleurs de bouton primaire coexistent | Vrai | `Button.tsx:6` (`bg-signal text-white`, 3,7:1) contre `bg-ink` dans `AConfirmer.tsx:209`, `FermerJournee.tsx:195` et `VueAccueil.tsx:140`. Les deux se côtoient dans le même composant : `AConfirmer.tsx:155` et `:209` |
| La fiche projet dépasse le plafond d'accents | Vrai | `EnTeteProjet.tsx:190,211,220,230` et `projet/Blocs.tsx:98,264`, plus le « + » : au moins 7 apparitions au premier écran |
| **Trouvé en plus** : un succès affiché sans vérification | Défaut d'état | `AConfirmer.tsx:122-131` : la replanification ne lit pas le résultat de l'écriture, et la carte disparaît même si elle a échoué |

## 1. Notes

Les poids sont ceux du protocole. La « cohérence » est lue comme l'applicabilité à tous les écrans existants sans réécriture totale.

| Critère (poids) | A | B | C | D |
|---|---|---|---|---|
| Charge mentale (30) | 4 | 6 | 7 | 7 |
| Gestes des tâches fréquentes (20) | 5 | 5 | 6 | 6 |
| Lisibilité à 360 px, au soleil, avec des gants (20) | 4 | 6 | 8 | 7 |
| Risque technique et de régression (15) | 10 | 3 | 4 | 6 |
| Coût de migration (10) | 10 | 3 | 4 | 6 |
| Applicabilité à l'existant (5) | 8 | 3 | 2 | 8 |
| **Total sur 100** | **59** | **49** | **60** | **66** |

**A, ne rien changer**
- Charge mentale 4. Rien n'est retiré. A écrit deux primaires, terracotta pour « avancer » et anthracite pour « trancher », une distinction que Gérard ne saurait pas énoncer. Sa propre fiche annotée dépasse six accents.
- Gestes 5. Neutre par construction. Sans le lot 1, qu'il emprunte aux autres, rattraper une coche reste à 3 gestes ou plus.
- Lisibilité 4. A officialise le 11 px mono en capitales et le blanc sur `signal` (3,7:1). Son lot 0 corrige un défaut déjà corrigé.
- Risque 10. Aucun code.
- Migration 10. Rien à migrer.
- Applicabilité 8. A décrit la génération 2 telle qu'elle est, mais sa règle des boutons est fausse pour environ 160 `<button>` bruts et 50 `<Button>`.

**B, le plus soustractif**
- Charge mentale 6. C'est le langage le plus facile à réciter. Mais « Oui » et « Non » pèsent pareil, la cloche disparaît de la fiche, et l'exception « sauf le devis » refait deux langages.
- Gestes 5. « Annuler » fait gagner un geste, et perdre la cloche hors de l'accueil en coûte un.
- Lisibilité 6. Le 17 px partout aide. Mais les cartes sont à 1,16:1, sans ombre ni contour fort, et le texte déborde sur le devis, la grille et le Bilan.
- Risque 3. Retirer la barre haute touche `CentreNotifications`, la safe-area, `--barre-bas` et les éléments collants. Le codemod passe sans tests, et la promesse « rien n'est perdu » est fausse.
- Migration 3. Environ 856 déclarations de taille et 50 boutons changent d'un coup.
- Applicabilité 3. B est inapplicable aux écrans denses, de son propre aveu.

**C, gros boutons de chantier**
- Charge mentale 7. Une seule recette, un seul plein, et la typographie porte tout. Mais la fiche s'allonge, et « Terminer le chantier » (trois écritures) pèse autant que « Planifier un passage ».
- Gestes 6. « Annuler » arrive sur l'accueil, et Oui et Non font 56 px. Mais les trois tuiles empilées font défiler davantage : à 360 × 640, on voit 1,4 ligne d'Aujourd'hui au lieu de 1,7.
- Lisibilité 8. La meilleure du duel à 360 px : 20 px pour ce qu'on touche, des cibles de 64 px et une ligne qui s'inverse sous le doigt. Rien n'est mesuré, et les filets sont à 1,3:1.
- Risque 4. La maquette invente une file hors ligne (« en attente du réseau ») et une suppression de projet. Le chantier touche environ 20 fichiers, et trois langages coexistent tant qu'on n'a pas fini.
- Migration 4. Il faut réécrire les listes, l'accueil et la fiche.
- Applicabilité 2. Le devis, la grille, le Bilan et les paramètres sont « hors C », et ce sont les écrans du soir de la conjointe.

**D, synthèse libre**
- Charge mentale 7. Un primaire, trois accents, aucune phrase longue et une seule grammaire pour les états. Mais D garde cinq tailles, un surtitre mono de 12 px et deux masses sombres sur l'accueil.
- Gestes 6. « Annuler » est étendu, « Oui » fait 146 × 48 px et le manque de réseau se voit sans geste. Mais « Chantier terminé · Annuler » est infaisable tel quel.
- Lisibilité 7. Fin du 10-11 px et des opacités à 60 % ou moins ; deux tons à 4,9:1 au moins ; focus en encre. D garde 12 px et des filets à 1,3:1, et rien n'est testé au soleil.
- Risque 6. Environ 50 boutons, écrans de connexion compris, changent de couleur. Le cliquet tourne en `prebuild` sans CI, `navigator.onLine` est peu fiable, et la promesse « saisies gardées » va trop loin.
- Migration 6. Cinq lots, aucun écran réécrit d'un coup, aucune donnée migrée.
- Applicabilité 8. Les cinq tailles couvrent aussi le devis et la grille, et la génération 2 en est déjà très proche.

## 2. Vainqueur : D, amendé (66 sur 100)

D est le seul candidat qui fait les deux choses à la fois. Il garde le langage qui marche déjà : la génération 2, présente sur l'accueil, la fiche, quatre listes, l'agenda mobile et la barre du bas. Et il comble les trous que le brief nomme (états, retours, soulagement) avec les tokens existants, en lots séparables. C est plus lisible mais ne couvre que la moitié de l'application. A ne risque rien mais ne tranche rien. B retire trop, pour trop cher.

Ce n'est pas une prime à la richesse. **Je retire de D six éléments :**
1. Le cliquet `scripts/verif-langage.mjs` et son `prebuild`. Il n'y a ni CI ni tests (`package.json` ne lance que `lint`), donc ce script peut bloquer un correctif urgent.
2. Les nouveaux noms de taille dans `tailwind.config.ts`. On prend les tailles Tailwind par défaut : `text-3xl`, `xl`, `base`, `sm`, `xs`. Le 32 px devient 30 px. La configuration ne change pas, et le site vitrine ne court aucun risque.
3. « Chantier terminé · Annuler ». La question posée avant (« Chantier terminé ? ») existe déjà et suffit. La trace qui suit n'a pas d'« Annuler ».
4. « Vos saisies sont gardées » dans le bandeau. Il dit « Pas de réseau. », rien de plus. « Gardé sur ce téléphone » ne s'écrit que là où un brouillon local existe vraiment.
5. Le minuteur de 5 s sur la trace. Elle reste jusqu'à ce qu'on quitte l'écran : une interruption de chantier dure plus de cinq secondes.
6. L'« Annuler » étendu à « À confirmer ». La chaîne visite, puis chantier, puis planification (`AConfirmer.tsx:50-116`) en ferait l'annulation de trois écritures. On garde la vibration et la trace, sans « Annuler ».

**Les trois greffes :**
1. **De A, l'application au fil de l'eau.** C'est le lot 2 de A : « on migre un écran de génération 1 quand on le touche ». S'y ajoute la page de règles avec des exemples bon / mauvais tirés du code. Les deux remplacent le cliquet de D.
2. **De B, l'erreur reste dans la ligne** (planche « Erreur » de B). Le détail devient « Pas enregistré » en texte d'alerte, et « Réessayer » prend la place de la coche. Le geste se refait en un appui, au même endroit. D, lui, ajoutait un second bouton pleine largeur sous la ligne.
3. **De C, l'appui se voit par la couleur, sur toute la ligne** (« L'appui inverse la ligne »). On le prend en version douce : `active:bg-ink/10` sur les lignes et `active:bg-ink/80` sur le plein. Cela remplace le survol, invisible au doigt, et le `scale(0.98)` de D.

## 3. Les objections des perdants qui restent valables

- **B, et la critique.** « Un seul plein par écran » plie sur l'accueil, où « Maintenant » (carte sombre) et « Oui » font deux masses sombres. Je tranche en faisant de « Maintenant » la seule carte sombre de l'application, un lien et non un bouton. C'est une exception assumée, pas une règle tenue.
- **B et C.** Cinq tailles, ce n'est pas « très grand / très petit, peu de moyen » : le 20 et le 16 sont du moyen. Je les garde parce que le devis et la grille ne tiennent ni en deux tailles ni en trois. Si le terrain montre que le 14 px ne se lit pas, c'est C qui avait raison.
- **C.** Le bloc, c'est-à-dire la carte, est conservé. Avec un filet à environ 1,3:1, il ne se voit pas au soleil, et la structure repose déjà sur l'espace et la typographie. On pouvait se passer de cette recette.
- **C et B.** L'en-tête de la fiche garde l'avatar, la jauge à 5 segments et les trois tuiles, soit environ 11 éléments avant « Maintenant ». C'est au duel D (fiche projet) de trancher ; le langage ne le fait pas.
- **A.** Passer environ 50 `<Button>` du terracotta à l'anthracite touche aussi la connexion, la demande d'accès, le premier lancement et l'administration (`app/(auth)/*`, `app/demander-acces/page.tsx`, `components/onboarding/PremierLancement.tsx`). C'est un changement d'identité, pas un correctif, alors que ne rien coder ne fait courir aucun risque de régression.
- **La critique.** D ne montre aucune vue `.ordi` : la conjointe à 1440 px n'a pas été vue. La règle « sur ordinateur » du document est donc déduite, pas observée.
- **La critique.** Personne n'a testé la vibration, ni la lecture au soleil avec des gants.

## 4. Ce qui me ferait changer d'avis

- **Un test sur le terrain** avec trois artisans de plus de 50 ans, sur un Android d'entrée de gamme, au soleil de midi, avec des gants. Si le détail en `text-sm text-steel` ne se lit pas, ou si l'on ne distingue pas une ligne de son fond, on passe à l'échelle de C : rien sous 16 px dans un écran de travail, et des lignes sans bloc.
- **Les journaux d'erreurs.** Si plus de quelques pour cent des écritures échouent en 4G, la file d'écriture hors ligne passe avant le reste du langage. Le bandeau pourra alors promettre quelque chose.
- **Le retour de la conjointe.** Si, à 1440 px, les lignes de 64 px et le texte de 16 px ralentissent la saisie du soir, il faut une densité propre à l'ordinateur (`sm:min-h-12`, détail en `sm:text-sm`).
- **Les coches par erreur.** Si les « Fait » et les « Oui » touchés par erreur restent fréquents malgré la trace, on revient à une confirmation.
- **La couleur d'action.** Si le fondateur garde le terracotta pour l'action principale, D tient encore avec `bg-signal-fonce text-white` (environ 5,2:1), mais pas avec `bg-signal` (3,7:1).
- **La vibration.** Si les artisans ne la sentent pas avec des gants, ou si elle les agace, on la retire. Cela ne coûte rien.

## 5. Découpage en lots

Les lots se livrent dans cet ordre, séparément, et chacun laisse l'application cohérente.

**Lot 1 : le document et des filets presque invisibles.**
- Fichiers : `docs/langage-interface.md` (écrit), `BRAND.md:33` une fois la décision 1 prise, `app/globals.css:296-299` (plancher porté de 44 à 48 px), `components/ui/Skeleton.tsx:20` (`motion-safe:animate-pulse`).
- Risques : le plancher de 48 px peut déplacer des contrôles compacts sous 640 px, comme le sélecteur de priorité (`EnTeteProjet.tsx:101`) ou les champs de replanification (`AConfirmer.tsx:225-240`). Il faut relire l'accueil, la fiche et le devis à 360 px.

**Lot 2 : les états, par ajouts purs.**
- Fichiers : `app/dashboard/error.tsx` (nouveau, réutilise `EtatErreur`) ; `app/dashboard/demandes/[id]/loading.tsx` (nouveau) ; `app/dashboard/loading.tsx` (reprendre la forme réelle de l'accueil) ; un bandeau « Pas de réseau. » (nouveau composant, monté dans `app/dashboard/layout.tsx`) ; `AConfirmer.tsx:122-131` (lire le résultat de l'écriture) ; les « Chargement… » de `demandes/[id]/page.tsx:941`, `notes/page.tsx:102`, `parametres/page.tsx:85` et `planning/nouveau/page.tsx:353`, remplacés par des squelettes.
- Risques : `error.tsx` doit être un composant client. Le bandeau reste dans le flux, sous la barre haute, jamais en `fixed`, pour ne décaler ni `--barre-bas` ni les éléments collants (`ValiderDevis.tsx:788`, `BrouillonProjet.tsx:215`). `navigator.onLine` peut se tromper : on n'affiche le bandeau qu'après l'événement `offline`.

**Lot 3 : les retours et le soulagement.**
- Fichiers : `lib/retour.ts` (nouveau, avec `vibrer()` et `vibrerEchec()`) ; `components/accueil/ListeAujourdhui.tsx` (une trace « Fait · Annuler » qui survit à la liste vide, et l'erreur dans la ligne) ; `components/accueil/Blocs.tsx:61-62` (appui visible) ; `components/projet/Blocs.tsx:217-228,286` (trace sans minuteur, « Annuler » à 48 px) ; `AConfirmer.tsx` et `ConfirmerClotureProjet.tsx` (vibration et trace, sans « Annuler ») ; `FermerJournee.tsx` (vibration).
- Risques : `router.refresh()` (`ListeAujourdhui.tsx:52`) ne doit pas effacer la trace, qu'on garde dans un composant qui reste monté. Décocher passe par `marquerNoteTerminee(…, false)`, que la fiche utilise déjà. `navigator.vibrate` n'existe pas sur iPhone : rien ne doit en dépendre.

**Lot 4 : les boutons et les surfaces, le seul saut visible.** Il attend la décision 1.
- Fichiers : `components/ui/Button.tsx` (primaire plein en encre, `danger` en contour d'alerte, fin du zoom, focus en encre) ; `components/ui/Card.tsx` (sans ombre, filet `ink/15`) ; `components/ui/EtatErreur.tsx` (pastille neutre) ; `components/projet/EnTeteProjet.tsx:190,211,220,230` et `components/projet/Blocs.tsx:264,427` (icônes en encre) ; `components/accueil/BoutonCapture.tsx:12`.
- Risques : environ 50 boutons changent ensemble, y compris la connexion, la demande d'accès, le premier lancement et l'administration. « Partager » (WhatsApp) doit rester l'unique plein de `SuiviDevis`. Il faut relire chaque écran en clair et en sombre, à 360 et à 1440 px.

**Lot 5 : la migration écran par écran, au fil de l'eau** (greffe de A).
- Ordre : l'accueil, la fiche, les listes et l'agenda d'abord, car ils sont déjà proches. Puis Notes, Équipe, Mon compte et Bilan. Le devis et la grille du planning viennent après leurs duels (F et G).
- Contenu de chaque PR : les tailles ramenées à l'échelle, les opacités de texte remplacées par `steel`, les hex remplacés par des tokens (`Avatar.tsx:9-12`, `lib/notes/index.ts:194-196`, `GrilleAgenda.tsx:30-32`, `planning/nouveau/page.tsx:17-19`), et les phrases de plus d'une ligne raccourcies.
- Risques : le texte se tronque plus tôt (16 px au lieu de 15) et peut déborder à 360 px. Chaque PR reste petite et se relit en clair et en sombre.

**Renvoyé aux autres duels.** La chaîne « Oui » → « Chantier aussi terminé ? » → « Planifier ? » (2 à 3 gestes, trois cartes, `AConfirmer.tsx:50-190`) relève du duel C. L'en-tête de la fiche relève du duel D. La densité de l'éditeur de devis relève du duel F, celle de la grille du planning du duel G, et la barre haute du duel B.

## 6. Les décisions du fondateur

1. **La couleur de l'action principale.** Anthracite (D ; une trentaine de boutons le sont déjà) ou terracotta. Si c'est le terracotta, seule la version `bg-signal-fonce text-white` (5,2:1) est lisible. Dans les deux cas, `BRAND.md:33` (« boutons d'action ») est à réécrire.
2. **Le plus gros texte de l'accueil.** « Bonjour Gérard » en 30 px, la date, ou rien (B et C l'enlèvent). C'est une question de ton.
3. **Les mots des états.** Un seul mot par état, le même partout : « Fait », « Annuler », « Pas enregistré », « Réessayer », « Pas de réseau. », « Gardé sur ce téléphone. », « Rien de prévu. », « Tout est réglé. ».
4. **La promesse hors ligne.** Aujourd'hui, seule une saisie qui a un brouillon local survit à une coupure. La contrainte « rien ne se perd, jamais » n'est donc pas tenue pour une coche ni pour un « Oui ». Il faut choisir : construire la file d'écriture (un chantier à part, voir `public/sw.js:47-54`), ou assumer l'aveu « Pas enregistré. Réessayer. ».
5. **Rouvrir un chantier terminé.** Sans action « Rouvrir », il n'y a pas d'« Annuler » après « Chantier terminé ». Faut-il la créer ?
6. **La vibration et l'avatar.** La vibration est proposée sans son et sans réglage. L'avatar coloré des clients est à garder en tokens seulement, ou à retirer.
