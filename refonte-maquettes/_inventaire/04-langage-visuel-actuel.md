# 04 — Langage visuel et tactile actuel de l'application connectée

> Audit en lecture seule, 01/10/2026. Périmètre : `app/dashboard/**` et `components/**`, sans `components/marketing/**` ni `components/seo`. `components/admin` n'est cité que s'il fausse un chiffre. Tous les comptages viennent d'une lecture statique du code (grep et scripts sur les classes). Aucun rendu n'a été fait : les chiffres de densité (point 9) sont des estimations tirées du JSX.

## Constat d'ensemble

Deux générations de design cohabitent dans le code.

- **Génération 1 (août – mi-septembre).** Classes Tailwind standard (`text-sm`, `text-xs`), `<Card>` (bordure, ombre), `<Button>` primaire terracotta, `p-8`, aides en `text-[11px] text-ink/40`. On la trouve dans : Notes, Équipe, Mon compte, Bilan, ValiderDevis, SuiviDevis, AConfirmer (état « planifier »), formulaires `nouvelle` / `importer`.
- **Génération 2 (« moins mais mieux », 24–27/09).** Tailles en pixels (`text-[13px]`, `[15px]`, `[17px]`), lignes `rounded-2xl bg-surface ring-1 ring-ink/[0.07]`, action principale **anthracite** (`bg-ink text-paper`), cibles `min-h-12`, et `motion-safe:`. On la trouve dans : Accueil, Fiche projet, Listes (projets, devis, factures), Agenda mobile, barre du bas, feuilles.

La génération 2 est nettement meilleure. Mais elle a déplacé l'action principale du terracotta vers l'anthracite **sans mettre à jour `Button.tsx` ni `BRAND.md`**. BRAND.md dit pourtant : « Terracotta principal — boutons d'action ». Le résultat : deux couleurs de « primaire » se côtoient, parfois sur le même écran.

---

## 1. Couleurs : tokens, mode sombre, couleurs en dur

### Tokens existants
Ils sont déclarés dans `tailwind.config.ts:17-49` sous la forme `rgb(var(--c-x) / <alpha-value>)` et définis dans `app/globals.css:15` (`:root`) et `app/globals.css:36` (`.dark`).

| Token | Clair | Sombre | Remarque |
|---|---|---|---|
| `paper` | 250 248 245 | 24 20 18 | fond de page |
| `paper-warm` | 243 237 230 | 33 27 23 | peu utilisé (mémo projet, `Blocs.tsx:409`) |
| `surface` | 255 255 255 | 36 30 26 | cartes |
| `ink` | 31 41 55 | 245 243 240 | texte, s'inverse avec le mode |
| `steel` | 92 112 128 | 168 156 145 | texte secondaire (contraste 4,9:1 sur paper, conforme) |
| `gris-clair` | 232 232 232 | 50 42 36 | **quasiment inutilisé** dans l'app (on écrit `border-ink/10` à la place) |
| `signal` | 201 107 74 | identique | terracotta. **Blanc sur signal = 3,7:1** et signal sur paper ≈ 3,5:1 : en dessous de l'AA pour du texte de 14 px |
| `signal-clair` / `signal-fonce` | 232 197 182 / 168 86 58 | identiques | `signal-fonce` sur paper ≈ 4,9:1 : c'est la bonne couleur de texte d'alerte |
| `anthracite` | 31 41 55 | fixe | barre latérale, ne s'inverse pas |
| `succes`, `alerte-orange` | 47 143 91 / 217 134 26 | identiques | ajoutés le 09/09, pas encore utilisés partout |

- **Pas de token « danger » ni « erreur ».** Les erreurs sont en terracotta (`text-signal`), la même couleur que la marque et que l'accent. `Button` `danger` = `bg-signal/10 text-signal` (`components/ui/Button.tsx:15`).
- **Mode sombre** : classe `.dark` sur `<html>` (`darkMode: "class"`), bascule par `components/ThemeToggle.tsx:29` (enregistrée dans localStorage) et script anti-flash dans `app/layout.tsx:284`. Seules les variables changent. `.theme-sombre-fixe` (`globals.css:69`) ne sert qu'au marketing. Il existe aussi un « mode nuit » distinct, un voile noir à 55 % (`globals.css:378-389`, `ModeNuitToggle.tsx`), qui fait doublon conceptuel avec le mode sombre.
- On compte 20 surcharges `dark:` dans l'app, toutes du type `text-signal-fonce dark:text-signal-clair` (par exemple `components/accueil/Blocs.tsx:66`). C'est le bon réflexe, mais il est répété à la main : il manque un token `texte-alerte`.

### Couleurs en dur (hors tokens)

| Type | Nombre | Où |
|---|---|---|
| Hex en classe arbitraire `bg-[#…]` / `text-[#…]` | **20 lignes, 28 valeurs** | `app/dashboard/planning/nouveau/page.tsx:17-19`, `app/dashboard/planning/page.tsx:127,130,133`, `components/planning/GrilleAgenda.tsx:30-32`, `lib/notes/index.ts:194-196` (rouge `#C23B22`, orange `#D9861A`, vert `#2F8F5B` des priorités et importances) ; `components/ui/Avatar.tsx:9-12` (4 couleurs d'avatar, dont un violet `#8B5CF6` et un bleu `#3B6FA0` hors palette) ; `components/dashboard/GestionEquipe.tsx:121`, `components/dashboard/ListeFacturesRecherchable.tsx:31` (`#2F8F5B` au lieu de `succes`) ; `components/carte-mentale/CarteMentale.tsx:854` (`bg-[#160f0c]`) ; `components/devis-public/DevisPublicClient.tsx:257` |
| Hex en JS (légitime : PDF ou canvas) | 13 | `components/devis/pdf/DocumentDevisPdf.tsx:20-31` (12), `DevisPublicClient.tsx:58` |
| `rgba()` / `rgb()` | 24 | 19 dans le canvas `CarteMentale.tsx:383-527`, `BoutonRetour.tsx:376` (style en ligne `rgba(201,107,74,…)`), ombres arbitraires `rgb(0 0 0/…)` dans `ApercuPdf.tsx:184`, `DocumentDevis.tsx:34`, `guide/CaptureAnnotee.tsx:60`, `CarteMentale.tsx:736` |
| Palette Tailwind par défaut (`red-500`, `gray-*`…) | **1** | `components/admin/ToggleMaintenance.tsx:51` (`bg-emerald-500`, admin uniquement) |
| `white` / `black` (`text-white`, `bg-white`, `border-white/10`…) | **135** | `CarteMentale.tsx` 53, `Sidebar.tsx` 38, `Visionneuse.tsx` 11, `BoutonInstallerDiscret` 4, `PhotosProjet` 4, puis 1 à 3 par fichier. La plupart sont du blanc posé sur `signal` ou `anthracite` (acceptable), mais il n'existe pas de token « sur-accent ». |

- **Incohérence de priorité.** « Urgent » est rouge `#C23B22` dans le planning (`GrilleAgenda.tsx:30`) mais terracotta `bg-signal/15 text-signal` sur la fiche projet (`EnTeteProjet.tsx:190`). « Important » est `#D9861A` en dur dans un cas, le token `alerte-orange` (même valeur) dans l'autre.
- **Opacités de texte** : 13 niveaux de `text-ink/xx` (20, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85). Les 328 occurrences à ≤ 60 % (`ink/50` ×105, `ink/40` ×57…) sont sous l'AA 4,5:1 sur `paper`. Les `text-white/xx` ajoutent 10 niveaux supplémentaires.

**Bons exemples**
- `tailwind.config.ts:17-49` avec `globals.css:15/36` : un seul jeu de variables, le mode sombre « gratuit » pour tout composant tokenisé.
- `components/accueil/Blocs.tsx:66` : `text-signal-fonce dark:text-signal-clair`, un accent lisible dans les deux modes.
- `components/projet/Blocs.tsx:53-58` (`TONS`) : la barre latérale de « Maintenant » utilise les tokens sémantiques `succes` et `steel`.

**Mauvais exemples**
- `lib/notes/index.ts:194-196` et `GrilleAgenda.tsx:30-32` : feux tricolores en hex, jamais recalibrés pour le mode sombre, et un rouge hors palette.
- `components/ui/Avatar.tsx:9-12` : violet et bleu hors identité, dans un composant `ui/` partagé.
- `components/dashboard/ListeFacturesRecherchable.tsx:31` : `bg-[#2F8F5B]/15` alors que le token `succes` existe.

---

## 2. Typographie

- **Polices** : Manrope (`font-display`, 74 occurrences), Inter (`font-sans`, par défaut), IBM Plex Mono (`font-mono`, 68 occurrences). Chargées depuis Google Fonts dans `app/layout.tsx:281`.
- **Tailles réellement utilisées : 26 valeurs distinctes pour environ 856 déclarations.**

| Classe | Nb | | Classe | Nb |
|---|---|---|---|---|
| `text-sm` | 227 | | `text-[16px]` | 21 |
| `text-xs` | 215 | | `text-[12px]` | 21 |
| `text-[11px]` | 60 | | `text-lg` | 19 |
| `text-[15px]` | 53 | | `text-[13.5px]` | 19 |
| `text-[14px]` | 53 | | `text-[12.5px]` | 12 |
| `text-[13px]` | 37 | | `text-[17px]` | 11 |
| `text-xl` | 28 | | `text-[14.5px]` | 9 |
| `text-2xl` | 23 | | `text-[10.5px]` / `[11.5px]` | 7 / 6 |
| `text-[10px]` | 22 | | `sm:text-3xl` | 6 |
| `text-base` | 2 | | `text-[1.6rem]`, `[1.3rem]`, `[1.35rem]`, `[26px]`, `[19px]`… | 9 |

`text-3xl` n'apparaît qu'en `sm:` et `text-4xl` jamais. **40 % des déclarations font 12,5 px ou moins** (environ 343). Les tailles en pixels (`13`, `13.5`, `14`, `14.5`, `15`…) viennent de la génération 2. Elles sont lisibles, mais ce n'est plus une échelle : `text-sm` (14) et `text-[14px]` coexistent.
- **Graisses** : `medium` 168, `semibold` 151, `normal` 12, `bold` 5, `extrabold` 1. Deux graisses portent tout.
- **Majuscules espacées** : 46 `uppercase`, avec 5 interlettrages différents (`tracking-[0.2em]` ×19, `tracking-wider` ×18, `[0.18em]`, `wide`, `tight`).
- BRAND.md réserve le mono aux étiquettes en capitales. Dans les faits, il sert aussi aux heures (`components/accueil/Blocs.tsx:65`), aux montants (`ValiderDevis.tsx`, total en `font-mono text-lg`) et aux badges « IA » (`EditeurLignes.tsx:260`).

**Bons exemples**
- `components/accueil/Blocs.tsx:28-30` : titre de bloc `font-display text-[17px] font-semibold`, compteur `text-[13px] text-steel tabular-nums`. Hiérarchie claire en deux niveaux.
- `components/planning/AgendaMobile.tsx` (ligne d'événement) : heure en mono 15 px, titre 16 px semi-gras, détail 14 px. Lisible au soleil.
- `components/accueil/VueAccueil.tsx:58-60` : date en mono 11 px capitales, puis H1 Manrope 1,6rem.

**Mauvais exemples**
- `components/devis/EditeurLignes.tsx:292,305,337` : libellés « Quantité / Unité / Prix unitaire » en `text-[10px] text-ink/40` (≈ 2,4:1), sur l'écran le plus chiffré de l'app.
- `components/dashboard/ValiderDevis.tsx:520` : aide en `text-[11px] text-ink/40`. Même chose à `EditeurLignes.tsx:351`.
- `components/dashboard/Sidebar.tsx:233,256` : libellés de la barre du bas en 11 px.

---

## 3. Hiérarchie des boutons

`components/ui/Button.tsx` définit 4 variantes. Le style commun : `rounded-xl px-5 py-3 text-sm font-medium`, soit environ 44 px de haut, avec `hover:scale-[1.02] hover:shadow-md`, `active:scale-[0.98]`, `focus-visible:ring-2 ring-signal/40` et un `loading` avec spinner.
- `primary` : `bg-signal text-white` (contraste 3,7:1)
- `secondary` : `bg-ink text-paper hover:bg-signal-fonce` (3 usages seulement)
- `ghost` : bordure `ink/15` (33 usages)
- `danger` : `bg-signal/10 text-signal`. **Il est de la même teinte que `primary`** : une action destructrice ressemble à un accent de marque.

Usage réel : 86 `<Button>` (environ 50 primaires) contre **163 `<button>` bruts** stylés au cas par cas.

**Le « vrai » primaire de la génération 2 est l'anthracite**, en `<button>` brut :
- `bg-ink text-paper min-h-14` : « Valider ce devis » (`ValiderDevis.tsx`, bouton collant), soumission dans `planning/nouveau/page.tsx:555` et `demandes/nouvelle/page.tsx:547`
- carte « Maintenant » de l'accueil (`VueAccueil.tsx:140`)
- « Oui » de À confirmer (`AConfirmer.tsx:208`), SMS dans `VueProjet.tsx:311`, `FermerJournee.tsx:195`

On en compte environ 30 dans 25 fichiers.

**Écrans avec plusieurs aplats terracotta en même temps** (le bouton « + » central de la barre du bas, `Sidebar.tsx:230`, est toujours présent sur téléphone) :

| Écran | Aplats `bg-signal` simultanés | Détail |
|---|---|---|
| Accueil, jour vide ou premier projet | **2** | `BoutonCapture` (`components/accueil/BoutonCapture.tsx:12`) plus le « + » : deux fois « Nouveau projet » |
| Accueil, avec retard | 2 | « + » et pastille de retard (`Sidebar.tsx:352/419`) |
| Fiche projet | **2 à 4** | « + », bouton principal de « Maintenant » (`projet/Blocs.tsx:98`), plus `PropositionUrgence` et tâches proposées (`demandes/[id]/page.tsx:1171`) quand elles s'affichent |
| Notes | 2 | `<Button>Nouvelle note</Button>` (`notes/page.tsx:115`, enveloppé dans un `<Link>`, ce qui imbrique deux éléments interactifs) et « + » |
| Devis envoyé (SuiviDevis) | 2 + 1 danger | « Partager » (`SuiviDevis.tsx:266`), « + », « Refuser » `danger` |
| À confirmer, état replanifier | 1 par carte | `AConfirmer.tsx:243`. Avec N cartes ouvertes, N aplats |

Les fichiers qui portent le plus de `<Button>` primaires : `demandes/[id]/page.tsx` (4), `SuiviDevis.tsx` (4, mais dans des états exclusifs), `AConfirmer.tsx` (3), `BoutonRetour.tsx` (3).

**Nombre d'apparitions de l'accent signal (aplats, textes, icônes, fonds teintés)**

Estimation sur le premier écran à 360 px, focus exclus :
- **Accueil** : 1 à 3 (le « + », « Retard » en `signal-fonce`, la pastille). Sobre.
- **Fiche projet** : environ 10 à 15. Le « + », le bouton Maintenant, la barre « attention », 3 icônes Appeler/Message/Itinéraire en `text-signal` (`EnTeteProjet.tsx:211,220,230`), le badge Urgent, les icônes de tuiles d'ajout (`VueProjet.tsx:424`), les icônes calendrier de À faire (`Blocs.tsx:264`), l'étincelle IA (`Blocs.tsx:427`), les icônes vocales du carnet (`Carnet.tsx:86`).
- **Devis** : environ 5 à 8. Badges « IA » par ligne, survols, erreurs `text-signal`, le « + ».
- **Planning (agenda mobile)** : 15 mentions de signal dans `AgendaMobile.tsx`, plus les 3 hex de priorité.

**Bons exemples**
- `components/projet/Blocs.tsx:96-121` : un seul principal pleine largeur sous le pouce, puis les secondaires en `ghost`, et la phrase « ce que fait l'IA » juste sous le bouton.
- `components/dashboard/AConfirmer.tsx:208-213` : « Oui » en anthracite plein, « Non » en contour, tous deux `min-h-12`. Binaire et clair.
- `ValiderDevis.tsx` (bouton collant « Valider ce devis », `min-h-14`, au-dessus de la barre du bas) : une seule action finale, toujours visible.

**Mauvais exemples**
- `components/ui/Button.tsx:15` : `danger` et `primary` partagent le terracotta. Et le primaire du composant n'est plus le primaire de l'app.
- `components/accueil/VueAccueil.tsx:129` avec `Sidebar.tsx:230` : deux « Nouveau projet » terracotta l'un au-dessus de l'autre.
- `app/dashboard/notes/page.tsx:114-115` : `<Link><Button>` imbriqués, et un primaire terracotta redondant avec le « + ».

---

## 4. Zones tactiles

- **Filet global** : `globals.css:272-292` impose 16 px aux champs, `min-height: 48px` aux champs et `44px` à `button` et `a[role=button]` sous 640 px. ⚠️ **Ces règles sont imbriquées dans `@media (prefers-reduced-motion: no-preference)` (ouvert ligne 234, fermé ligne 334).** Un artisan qui a activé « Réduire les animations » perd donc les cibles de 44/48 px, le 16 px anti-zoom iOS, la suppression du halo de tap et `overscroll-behavior`. C'est le défaut le plus important de ce point.
- Le plancher est de 44 px, pas 48. Et il ne s'applique pas aux `<a>` / `<Link>` sans `role=button`. Le pattern local `[@media(pointer:coarse)]:min-h-11` (44 px) complète.
- Hauteurs fixes trouvées : `h-5` ×21, `h-6` ×14, `h-7` ×4, `h-8` ×14, `h-9` ×6, `h-10` ×10, `h-11` ×17, `h-12` ×16, `h-14` ×5. La plupart des `h-5` à `h-9` sont des pastilles d'icône **à l'intérieur** d'une cible plus grande (bon pattern).
- **`min-h-0` force la cible sous le plancher** à 6 endroits : `projet/Blocs.tsx:133` (lien d'alerte, `py-1`), `Blocs.tsx:286` (« Annuler » après « Fait »), `Blocs.tsx:418` (« Lire la suite »), etc. Environ 28 px.

Cibles sous 48 px repérées :

| Fichier:ligne | Élément | Taille approx. |
|---|---|---|
| `components/projet/EnTeteProjet.tsx:101` | sélecteur Urgent / Important / Normal (`py-1.5 text-[12.5px]`) | ≈ 30 px (44 si le filet global s'applique) |
| `components/onboarding/ExempleDevisModal.tsx:153` | fermer ✕ `w-8 h-8` | 32 px |
| `components/devis/EditeurLignes.tsx:66` | boutons monter / descendre / supprimer : `h-12` sur téléphone, **`sm:h-8`** au-dessus de 640 px | 32 px sur tablette |
| `components/devis/EditeurLignes.tsx:410` | sélecteur de lot `h-8` | 32 px (48 avec le filet) |
| `components/devis/EditeurLignes.tsx:372,449` | liens texte `text-[11px]` / `text-xs` (« Pour le client », « Organiser en lots ») | ≈ 16–20 px de haut |
| `components/dashboard/ValiderDevis.tsx` (suggestions, ≈ ligne 766-773) | « Ajouter » / « Ignorer » en `text-xs` sans padding | ≈ 16 px |
| `components/notes/NoteCard.tsx:123,131` | « ✓ Marquer comme terminé » et « Supprimer » en `text-xs` | 16 px (44 avec le filet) |
| `components/dashboard/AConfirmer.tsx:225,235` | champs date et heure `py-1.5 text-sm` | ≈ 34 px (48 avec le filet) |
| `components/projet/Visionneuse.tsx:66` | fermer `h-10 w-10` | 40 px |
| `components/dashboard/CaseEvenement.tsx:51` | case `w-5 h-5` (composant apparemment non importé) | 20 px |

**Bons exemples**
- `components/accueil/ListeAujourdhui.tsx:71-79` : la coche est une pastille de 28 px dans une colonne `w-14` de toute la hauteur de la ligne (≥ 56 px).
- `components/projet/Blocs.tsx:161-163` : `-m-2.5 h-11 w-11` autour d'une pastille de 24 px. La cible est agrandie sans grossir le visuel.
- `components/projet/EnTeteProjet.tsx:209` : Appeler / Message / Itinéraire en tuiles de 68 px (`min-h-[4.25rem]`) sur téléphone.

**Mauvais exemples**
- `app/globals.css:234-334` : filet tactile soumis à `prefers-reduced-motion`.
- `components/devis/EditeurLignes.tsx:292-372` : libellés de 10 px et liens de 11 px dans l'éditeur de lignes.
- `components/projet/Blocs.tsx:286` : « Annuler » (le geste de rattrapage) en `min-h-0 py-1`.

---

## 5. Formes des cartes et des listes

- **Arrondis** : `rounded-xl` 110, `rounded-full` 106, `rounded-2xl` 71, `rounded-lg` 30, `rounded-md` 11, `rounded` 6, `rounded-3xl` 5, `rounded-sm` 4, plus 3 valeurs arbitraires (`[3px]`, `[1.4rem]`, `[1.6rem]`). **9 rayons ou plus.**
- **Bordures** : `border-ink/…` en 11 opacités (`/10` ×85, `/15` ×43, `/25` ×19, `/30` ×13, `/[0.07]` ×12, `/5` ×9…), plus `ring-ink/…` en 7 opacités. Bordure et anneau coexistent pour le même rôle.
- **Ombres** : `shadow-sm` 8 (plus celle par défaut de `<Card>`), `lg` 6, `2xl` 4, `xl` 3, `md` 3 (plus le survol de `Button`), et 6 ombres arbitraires.

**Huit recettes de carte coexistent :**
1. `<Card>` : `bg-surface border border-ink/10 rounded-2xl shadow-sm` (`components/ui/Card.tsx:19`). 47 usages dans 21 fichiers, génération 1.
2. Bloc projet : `rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink/[0.08]` (`projet/Blocs.tsx:77,237,398,459`).
3. Ligne de liste : `rounded-2xl bg-surface ring-1 ring-ink/[0.07] min-h-[4.5rem]`, sans ombre (`accueil/Blocs.tsx:61`, `ListeDevisRecherchable.tsx:112`, `ListeFacturesRecherchable.tsx:103`, `DemandeCard.tsx:52`, `AgendaMobile.tsx:158`). **C'est la plus cohérente.**
4. Panneau d'action : `rounded-2xl bg-surface ring-1 ring-ink/10` (`FermerJournee.tsx:141`, `VueProjet.tsx:297,422`, `FeuilleCapture.tsx:56`).
5. Carte sombre : `rounded-2xl bg-ink text-paper` (« Maintenant », `VueAccueil.tsx:140`).
6. Sous-carte : `rounded-xl border border-ink/10 bg-paper` (suggestions dans `ValiderDevis.tsx`, ≈ ligne 756).
7. Modale ou feuille : `rounded-t-3xl sm:rounded-3xl … shadow-xl` (`ExempleDevisModal.tsx:144`), `rounded-t-3xl` dans `CarteMentale.tsx:854`.
8. Squelette : `rounded-2xl border border-ink/10` sans fond (`ui/Skeleton.tsx:28`), différent des lignes réelles (anneau et fond surface).

- Badges de statut : `rounded-md px-2 py-0.5 text-[12px]` (listes) ou `rounded-full px-2.5 py-0.5` (`EnTeteProjet.tsx:189`). Deux formes pour le même rôle.

**Bons exemples** : recette 3 partagée par 5 listes ; `components/projet/Blocs.tsx:77` (barre de ton `before:w-1` à gauche, sans couleur de fond) ; `components/dashboard/Sidebar.tsx:270` (feuille « Plus », lignes `min-h-14` séparées par `border-ink/[0.06]`).

**Mauvais exemples** : `<Card>` (bordure et ombre) à côté de lignes en anneau sans ombre sur l'accueil (`AConfirmer.tsx:196` est un `<Card>` dans une section dont les voisines sont en recette 3) ; `components/ui/Skeleton.tsx:28` qui ne ressemble pas à ce qu'il annonce ; 11 opacités de bordure.

---

## 6. États

| État | Où il existe | Où il manque ou diverge |
|---|---|---|
| **Chargement (squelette)** | `loading.tsx` : dashboard, bilan, demandes, devis, devis/[id], equipe, factures, planning (8). Squelette interne dans `devis/EspaceDevis.tsx:137-141` | **Fiche projet** : pas de `loading.tsx`. On voit d'abord le squelette de l'accueil (`app/dashboard/loading.tsx`), puis le texte « Chargement… » en `p-8` (`demandes/[id]/page.tsx:941`). Même texte nu dans `notes/page.tsx:102`, `notes/nouvelle/page.tsx:77`, `parametres/page.tsx:85`. Pas de `loading.tsx` pour notes, parametres, planning/nouveau, demandes/nouvelle, importer |
| Squelettes décalés | — | `app/dashboard/loading.tsx:9` : `p-8` et un en-tête `rounded-3xl` qui n'existe plus, alors que la page réelle utilise `px-4 pt-5` sans carte d'en-tête. `ui/SquelettePageListe.tsx:9-12` : `p-8` et un bouton `h-9 w-36` absent de la page Projets |
| **Vide** | Projets (`ListeProjetsRecherchable.tsx:62-65`, avec bouton de capture), devis et factures (texte seul), accueil « Rien d'urgent. » (`VueAccueil.tsx:127`), agenda « Rien de prévu. » (`AgendaMobile.tsx:146`), projet « Rien en attente sur ce chantier. » (`projet/Blocs.tsx:257`), carnet (`Carnet.tsx:278`) | Les tons varient : `text-ink/40` à `ink/60`, 13 à 15 px. Notifications « Rien en attente. 👍 » (emoji). Factures vides en phrase de 89 caractères |
| **Erreur de page** | `ui/EtatErreur.tsx` (pastille « ! » terracotta et « Réessayer »), utilisé par fiche projet, notes, parametres, planning/nouveau, partage, Mon compte, EspaceDevis | **Aucun `error.tsx`** dans `app/dashboard`. Les pages serveur (accueil, listes, planning, bilan) tombent sur l'erreur Next par défaut |
| **Erreur locale** | `ErreurInline` ; génération 2 : « Pas enregistré. Réessayez. » en `text-signal-fonce` (`ListeAujourdhui.tsx:60`, `FermerJournee.tsx:216`, `AgendaMobile.tsx:322`) | Génération 1 en `text-signal` (contraste insuffisant) : `projet/Blocs.tsx:140`, `EspaceDevis.tsx:335,348`, `planning/nouveau/page.tsx:552`, `demandes/nouvelle/page.tsx:545` |
| **Succès** | Voir point 8. Petits textes « Enregistré » (`Blocs.tsx:399` en `text-succes`, `MonCompte.tsx:234` « ✓ Enregistré » en `text-steel`, `VueParametres.tsx:194` en `text-steel`) | Pas de toast. Couleur du succès incohérente (`succes`, `steel` ou `#2F8F5B`) |
| **Hors-ligne** | Page de secours `/hors-ligne` du service worker (`public/sw.js:67`, `app/hors-ligne/page.tsx`) ; texte conservé dans les notes vocales (`NotesVocales.tsx:230`) | **Aucun indicateur dans l'app** (pas d'écoute de `navigator.onLine` ni de bandeau). L'utilisateur l'apprend par une erreur après coup |

**Bons exemples** : `components/accueil/ListeAujourdhui.tsx:38-53` (coche optimiste, retour en arrière et message si l'enregistrement échoue) ; `components/ui/EtatErreur.tsx` (message humain et action) ; `components/devis/EspaceDevis.tsx:137-141` (squelette à la forme du devis).

**Mauvais exemples** : `app/dashboard/demandes/[id]/page.tsx:941` (« Chargement… » sur l'écran le plus utilisé) ; absence de `app/dashboard/error.tsx` ; `app/dashboard/loading.tsx:10` (squelette d'un en-tête disparu).

---

## 7. Retours tactiles, sonores et animations

- **`navigator.vibrate` : 0 occurrence. Aucun son** (ni `Audio`, ni `AudioContext`). Aucun retour haptique ou sonore n'existe.
- Animations Tailwind : `animate-pulse` ×5 (squelettes, **sans `motion-safe`**), `motion-safe:animate-pulse` ×2, `animate-spin` ×2 (spinner de `Button`).
- `motion-safe:` / `motion-reduce:` : 9 occurrences dans 8 fichiers, toutes en génération 2 (par exemple `motion-safe:active:scale-[0.97]` dans `FermerJournee.tsx:195`).
- Transitions : `transition-colors` ×117, `transition` ×50, `transition-all` ×15, `duration-150/200` seulement ×14. Pas de courbe ni de durée normalisées.
- Échelles au survol ou à l'appui hors `motion-safe` : `Button.tsx:42` (`hover:scale-[1.02] active:scale-[0.98]`, appliqué aux 86 boutons), `CaseEvenement.tsx` (`hover:scale-105`).
- CSS (`globals.css`) : les feuilles (`.feuille-panneau`, ligne ≈ 532), le parcours « Faire un retour » (`.fr-*`, ligne 343) et la carte mentale (`.cm-*`, ligne 314) sont bien sous `prefers-reduced-motion: no-preference`. **Ne le sont pas** : `.pwa-carte-entree` (ligne 395), `.onboarding-entree` et `.onboarding-etape-flux` (lignes 408-430), `.fr-progres-segment`.
- `matchMedia("(prefers-reduced-motion: reduce)")` en JS : seulement `CarteMentale.tsx:319` et `useParallaxSouris.ts:27`.

**Bons exemples** : `globals.css:529-539` (feuilles : « Rien pour qui a demandé moins de mouvement ») ; `Sidebar.tsx:230` (`motion-safe:group-active:scale-95` sur le « + ») ; `CarteMentale.tsx:319`.

**Mauvais exemples** : `components/ui/Button.tsx:42` (zoom au survol non conditionné, et sans intérêt au doigt) ; `components/ui/Skeleton.tsx:21` (`animate-pulse` non conditionné) ; `globals.css:395-430` (entrées PWA et onboarding toujours animées).

---

## 8. Le « moment de soulagement »

Aujourd'hui, la fin d'une tâche se traduit surtout par une **disparition**, rarement par une **confirmation**.

- **Cocher une note sur l'accueil** (`ListeAujourdhui.tsx:40,55`) : la ligne disparaît instantanément, sans animation, sans message et sans « Annuler ». Le compteur baisse.
- **« Oui » dans À confirmer** (`AConfirmer.tsx:108-110`) : la carte disparaît (`setTraites`), puis la page se rafraîchit.
- **Cocher une tâche dans la fiche projet** (`projet/Blocs.tsx:279-290`) : bandeau `bg-succes/10` avec coche verte, « Fait : … » et « Annuler », dans une zone `aria-live`. **C'est le meilleur moment actuel.**
- **Fermer la journée** (`accueil/FermerJournee.tsx:141-150`) : quand tout est traité, pastille verte et « Tout est réglé pour aujourd'hui. » avec le bilan du jour. C'est le seul « moment » pensé comme tel, et il n'est visible qu'après 17 h.
- **Devis accepté** (`SuiviDevis.tsx:199-212`) : rond vert « ✓ », « Devis accepté », date et « La suite se passe sur le projet ».
- **Copier, enregistrer** : le libellé du bouton change (« ✓ Lien copié », « ✓ Enregistré » en `text-steel`, `MonCompte.tsx:234`).
- **Notes** : barré et grisé (`NoteCard.tsx:78`).
- **Projet terminé** : aucun écran ni message propre. Le projet sort de l'accueil.
- Le symbole « fait » prend trois formes : `IconeCoche` (SVG), le caractère « ✓ » (19 occurrences) et l'emoji 👍.

**Bons exemples** : `projet/Blocs.tsx:279-290` (confirmation et annulation) ; `FermerJournee.tsx:146` ; `SuiviDevis.tsx:199`.
**Mauvais exemples** : `ListeAujourdhui.tsx:55` (disparition muette) ; `AConfirmer.tsx:110` (idem, sur un geste important : « chantier terminé ») ; `CentreNotifications.tsx:143` (« Rien en attente. 👍 », un ton différent du reste).

---

## 9. Densité à 360 px (écrans principaux)

Estimation statique : on compte les éléments distincts (texte, bouton, icône porteuse de sens) en tenant compte de `truncate` et `line-clamp`. Les barres haute (3 éléments) et basse (5 éléments) sont incluses.

| Écran | Éléments sur la page déroulée | Dans le premier écran (≈ 360 × 640) | Textes de plus d'une ligne |
|---|---|---|---|
| **Accueil** (journée chargée : 2 à confirmer, 5 aujourd'hui, 3 à faire, 3 en attente) | ≈ 75–80 | ≈ 18–22 | **0** : tout est en `truncate`, c'est voulu (`accueil/Blocs.tsx:73-74`) |
| **Fiche projet** (avant le carnet) | ≈ 55–70 | ≈ 16–20 (en-tête ≈ 11 et début de « Maintenant ») | **≈ 7–9** : titre de « Maintenant » sur 2 lignes (`Blocs.tsx:82`), « ce que fait l'IA » (`Blocs.tsx:108`), alerte (`Blocs.tsx:129`), titres de notes `leading-snug` (`Blocs.tsx:171-175`), description de note (`Blocs.tsx:185`), « La demande » en `line-clamp-3` (`Blocs.tsx:416`), résumé IA (`Blocs.tsx:430`), placeholder du mémo (`Blocs.tsx:408`), conseils (`Blocs.tsx:306-330`) |
| **Devis** (ValiderDevis + éditeur, 8 lignes) | **≈ 100+** (≈ 10 contrôles par ligne : description, badge IA, quantité, unité, prix, ↑, ↓, supprimer, « Pour le client »…) | ≈ 20–25 | **≈ 8–10** : aides (`ValiderDevis.tsx:520,622,737` dont une de 228 caractères), `EditeurLignes.tsx:351,450,538`, mentions obligatoires de `CompletionMention.tsx:30-66` |
| **Planning** (agenda mobile) | ≈ 7 jours + titre + bouton + 4 par événement | ≈ 15–20 | 0–1 |
| **Listes** projets, devis, factures | ≈ 3 + 4 par ligne | ≈ 20 | 0 en usage, 1 phrase vide longue (`ListeFacturesRecherchable.tsx:92`) |

---

## 10. Textes de plus d'une ligne dans les écrans de travail

Seuil ≥ 55 caractères, soit plus d'une ligne à 360 px en 14–15 px. Les messages d'erreur réseau standard (environ 25 occurrences de « Impossible de … Vérifiez votre connexion ») sont exclus.

**Fiche projet**
- `components/projet/Blocs.tsx:37-40` : « L'IA chiffre avec vos notes, vos photos et vos tarifs. Vous relisez tout avant l'envoi. » et ses deux variantes, affichées sous le bouton principal
- `components/projet/Blocs.tsx:408` : placeholder « Code du portail, choix du client, mesures clés… Ce que vous voulez retrouver en un coup d'œil. »
- `components/projet/Carnet.tsx:278` : « Le carnet se remplit tout seul : notes dictées, photos, devis, rendez-vous. »
- `app/dashboard/demandes/[id]/page.tsx:1222` : « Vous pouvez préparer le devis quand même : il restera modifiable ligne par ligne avant l'envoi. »
- `app/dashboard/demandes/[id]/page.tsx:1240` : « Brouillon : relisez et ajustez avant de l'envoyer vous-même. »
- `app/dashboard/demandes/[id]/page.tsx:440` et `components/dashboard/PropositionUrgence.tsx:62-63,79` : « Vos notes laissent penser que ce chantier doit être traité en priorité. Voulez-vous passer ce projet en urgent ? »
- `components/dashboard/NotesVocales.tsx:230,262` : « Connexion perdue. Votre texte est conservé — réessayez dès que le réseau revient. »

**Devis**
- `components/dashboard/ValiderDevis.tsx:520` : « La première phrase que lit votre client, avant le détail chiffré. »
- `components/dashboard/ValiderDevis.tsx:622` : « Reprises de vos paramètres — modifiables pour ce devis seulement. »
- `components/dashboard/ValiderDevis.tsx:737` : explication marge / prix de revient (**228 caractères**, en `text-[11px] text-ink/40`)
- `components/dashboard/ValiderDevis.tsx:379-406` : 5 messages de validation de 65 à 89 caractères
- `components/devis/EditeurLignes.tsx:351`, `:450` (« Organiser en lots (cuisine, salle de bain, électricité…) »), `:538` (107 caractères)
- `components/devis/CompletionMention.tsx:30,45,59,66` : 4 mentions « Obligatoire sur un devis — … »
- `components/devis/SuiviDevis.tsx:50,211,230,261` (par exemple « Si le client a seulement tiqué sur un poste ou sur le prix, repartez de celui-ci. »)

**Capture et création**
- `app/dashboard/demandes/nouvelle/page.tsx:121-136` : 4 messages de partage raté (71 à 219 caractères), et `:274`, `:497`
- `app/dashboard/demandes/importer-capture/page.tsx:256` : « Une capture par conversation. Rien n'est enregistré avant que vous confirmiez. »
- `components/dashboard/CorrespondanceProjetExistant.tsx:46` : 111 caractères

**Planning et notes**
- `app/dashboard/planning/page.tsx:82` : « ✓ Un rendez-vous a été ajouté au planning à partir du message du client. »
- `app/dashboard/planning/nouveau/page.tsx:236,313` : conflit de créneau (96 caractères), également dans `ConfirmationRdv.tsx:136`

**Réglages (moins critique, hors chantier)**
- `components/dashboard/MonCompte.tsx:251,270` (311 caractères), `:315`
- `components/dashboard/EquipeSection.tsx:171,223,251`, `GestionEquipe.tsx:150`
- `components/parametres/VueParametres.tsx:309,419,571`
- `components/dashboard/VueBilan.tsx:280` (258 caractères), `:327` (269 caractères)

À noter : `ResumeJournee.tsx`, `ConseilsCompagnon.tsx`, `MiniApercu.tsx`, `NotesRappelsAujourdhui.tsx` et `CaseEvenement.tsx` contiennent beaucoup de texte long mais **ne semblent plus importés** (code mort probable).

---

## 11. Focus clavier et aria-label

- **Pas de style de focus global.** Le contour par défaut du navigateur reste actif sauf `outline-none`, qui apparaît 92 fois, presque toujours remplacé par un anneau.
- `focus-visible:` ×191. Anneaux : `ring-signal/50` ×51, `focus:ring-signal/15` ×24 (champs), `/60` ×3, `/40` ×3 (dont `Button`), `/20` ×2, `ring-white/40-70` ×3. Un anneau terracotta à 15–40 % d'opacité est peu visible : environ 1,5 à 2:1 sur `paper`.
- Sur 228 `<button>` et liens stylés, **192 n'ont aucun style de focus explicite**. Ils retombent sur le contour du navigateur, donc un rendu hétérogène. Exemples : `EditeurLignes.tsx` 11/11, `AgendaMobile.tsx` 11/13, `GrilleAgenda.tsx` 7/7, `projet/Carnet.tsx` 5/5, `VueBilan.tsx` 5/5.
- **aria-label** : 87 occurrences. Les boutons-icônes vérifiés sont étiquetés : `Visionneuse.tsx:70,88,96`, `Feuille.tsx:98,138`, `CentreNotifications.tsx:101,167`, `EditeurLignes.tsx:284,388,398`, `ExempleDevisModal.tsx:152`, « + » de la barre du bas (`Sidebar.tsx:226`), coche (`ListeAujourdhui.tsx:74`). Aucun bouton-icône sans nom n'a été trouvé dans l'échantillon (l'heuristique a remonté 19 candidats, tous des faux positifs avec texte visible).
- Points faibles : le bouton « Plus » de la barre du bas utilise `aria-haspopup` sans `aria-expanded` (`Sidebar.tsx:250`). Les libellés du formulaire de replanification sont dupliqués (`<label>` non relié et `aria-label`, `AConfirmer.tsx:219-237`). `<Link><Button>` est imbriqué (`notes/page.tsx:114,151`). Les emojis décoratifs ne sont pas masqués (« ✏️ Modifier », `GrilleAgenda.tsx:282` ; « 🌙 Atténuer la luminosité », `ModeNuitToggle.tsx:34`). On compte 81 caractères emoji ou symboles dans l'UI.

**Bons exemples** : `components/accueil/ListeAujourdhui.tsx:74-77` (`aria-label` « Fait : <titre> » et anneau de focus sur la pastille via `group-focus-visible`) ; `components/projet/EnTeteProjet.tsx:98-99` (`role="menuitemradio"` et `aria-checked`) ; `components/ui/Input.tsx:31-35` (libellé relié par `useId`).

**Mauvais exemples** : `components/devis/EditeurLignes.tsx` (11 boutons sans focus explicite, dont les liens de 11 px) ; `components/ui/Button.tsx:42` (`ring-signal/40`, trop pâle) ; `app/dashboard/notes/page.tsx:114` (lien et bouton imbriqués).

---

## Pistes directement utiles pour la refonte

1. Sortir les règles tactiles de `globals.css:272-313` du bloc `prefers-reduced-motion`, et monter le plancher des boutons à 48 px.
2. Trancher la couleur du primaire (anthracite ou terracotta), puis aligner `Button.tsx`, BRAND.md et les environ 30 `<button bg-ink>` bruts. Garder le terracotta pour **un seul** accent par écran, sans doublon avec le « + ».
3. Ajouter les tokens `danger`/`texte-alerte`, `priorite-urgent/important/normal` et `sur-accent`. Supprimer les 28 hex et les couleurs d'avatar hors palette.
4. Réduire l'échelle à environ 6 tailles (12, 13, 15, 17, 22, 28), 3 opacités de texte (100 / 70 / `steel`), 3 rayons (`xl`, `2xl`, `full`) et 2 recettes de carte (ligne et bloc).
5. États : `loading.tsx` pour la fiche projet, `app/dashboard/error.tsx`, bandeau hors-ligne, squelettes à la forme réelle.
6. Moment de soulagement : généraliser le pattern « Fait : … · Annuler » de `projet/Blocs.tsx:279-290` à l'accueil et à À confirmer. On peut y ajouter `navigator.vibrate(10)` en option, conditionné à `prefers-reduced-motion`.
