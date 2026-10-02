# Langage de l'interface

> Ces règles valent pour tout écran de l'application connectée. Elles viennent de l'arbitrage du duel H (`refonte-maquettes/duel-H/arbitrage.md`).
>
> Le test : **Gérard, 57 ans, sur un Android d'entrée de gamme, au soleil, avec des gants, comprend quoi faire en deux secondes, d'une main.**
>
> Contraintes : seulement les tokens de couleur de `tailwind.config.ts`, Tailwind 3.4, aucune dépendance. Les références `fichier:ligne` décrivent le code au 02/10/2026.

## Densité

**1. Cinq blocs, cinq lignes, quatre éléments.**
- Au premier écran (360 × 640), il y a cinq blocs au plus.
- Un bloc a un titre de deux ou trois mots et un nombre. Il montre cinq lignes au plus, puis « Voir les N ».
- Une ligne porte quatre éléments au plus : un repère, quoi, un détail, une action.
- Bon : `components/accueil/Blocs.tsx:12,33-37` (`LIGNES_MAX = 5`, puis « Voir les N → »).
- Mauvais : `components/projet/Blocs.tsx:293-340` (« Avant de chiffrer » : trois listes dans un même bloc).
- Classes : gouttière `px-4` ; entre deux blocs `mt-7` ; dans un bloc `mt-2.5 flex flex-col gap-2`.

**2. Une ligne de texte, jamais deux.** Dans un écran de travail, tout texte tient sur une ligne à 360 px. Ce qui ne tient pas est raccourci ou supprimé, pas replié. Les réglages et le guide ne sont pas concernés.
- Bon : `components/accueil/Blocs.tsx:73-74` (titre et détail en `truncate`).
- Mauvais : `components/projet/Blocs.tsx:37-40,108` (deux lignes sous le bouton, alors que « Vous relisez avant l'envoi. » suffit) ; `components/dashboard/ValiderDevis.tsx:737` (228 caractères en 11 px, à 40 % d'opacité).
- Classes : `truncate`. Ni `leading-relaxed` ni `line-clamp-3` dans un écran de travail.

## Échelle typographique

**3. Cinq tailles Tailwind, deux graisses, aucune taille écrite en pixels.**

| Classe | Taille | Rôle |
|---|---|---|
| `font-display text-3xl font-semibold` | 30 px | titre de l'écran ou chiffre clé, deux au plus par écran |
| `font-display text-xl font-semibold` | 20 px | titre de bloc ou de feuille |
| `text-base` | 16 px | ce qu'on lit et ce qu'on touche : titre de ligne (`font-semibold`), bouton |
| `text-sm` | 14 px | le détail, sous le titre |
| `text-xs` | 12 px | libellés de la barre du bas et date en surtitre ; jamais une information qu'on doit lire pour agir |

- Graisses : la normale et `font-semibold`.
- Heures et montants : `font-mono tabular-nums`, à la taille de leur rôle.
- Correspondances pour migrer : `text-[17px]` devient `text-xl` ; `text-[15px]` devient `text-base` ; de `text-[12.5px]` à `text-[14.5px]`, ainsi que `text-xs` employé pour du contenu, deviennent `text-sm`.
- Bon : `components/planning/AgendaMobile.tsx:162-164` (heure en mono, titre en 16 px semi-gras : c'est presque la règle).
- Mauvais : `components/devis/EditeurLignes.tsx:292,305,337` (`text-[10px] text-ink/40`, environ 2,4:1) ; `components/projet/Blocs.tsx`, qui emploie neuf tailles dans un seul fichier, de 11 px à 1,3 rem.

**4. Deux tons de texte.** `text-ink` pour ce qu'on lit, `text-steel` (4,9:1) pour le détail. Aucune opacité sur du texte. Seule exception, sur la carte sombre : `text-paper` et `text-paper/70`.
- Bon : `components/accueil/Blocs.tsx:30` (le nombre du bloc en `text-steel`).
- Mauvais : `components/dashboard/AConfirmer.tsx:202` (`text-ink/55`) et `:222` (libellé `text-[11px] text-ink/50`) ; `components/accueil/VueAccueil.tsx:143` (« MAINTENANT » en 10,5 px à 55 %).

## Boutons

**5. Un seul bouton plein par écran.**
- Le bouton plein est l'action la plus probable. Il est en encre sur papier (anthracite en mode clair, clair en mode sombre), sur toute la largeur, sous le pouce.
- Le « + » de la barre du bas ne compte pas.
- La carte « Maintenant » de l'accueil est un lien, pas un bouton : c'est la seule carte sombre de l'application.
- Si le fondateur garde le terracotta pour l'action principale (décision 1 de l'arbitrage), on prend `bg-signal-fonce text-white`, jamais `bg-signal`.
- Bon : `components/dashboard/AConfirmer.tsx:209-214` (« Oui » plein, « Non » en contour, 48 px) ; `components/projet/Blocs.tsx:96-121` (une action principale sur toute la largeur, les autres dessous).
- Mauvais : `components/ui/Button.tsx:6` (primaire `bg-signal text-white`, 3,7:1), si bien que deux couleurs de primaire se côtoient dans le même composant, `AConfirmer.tsx:155` et `:209` ; `components/accueil/VueAccueil.tsx:129` avec `components/dashboard/Sidebar.tsx:230`, deux « Nouveau projet » terracotta l'un au-dessus de l'autre.
- Classes : `min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 disabled:opacity-60 sm:w-auto`.

**6. Les autres boutons en contour ou en texte ; une action destructrice n'est jamais pleine.** Une action destructrice ou irréversible est précédée d'une question. Elle n'est jamais suivie d'un « Annuler ».
- Bon : `components/devis/SuiviDevis.tsx:292-297` (« Noter ce devis comme refusé ? », puis « Oui, refusé ») ; `components/accueil/FermerJournee.tsx:208` (« Demain » en contour, à côté de « Fait »).
- Mauvais : `components/ui/Button.tsx:15` (`danger` reprend le terracotta du primaire) ; `components/ui/Button.tsx:44` (zoom au survol, sans effet sous le doigt).
- Classes :
  - contour : `min-h-12 rounded-2xl px-4 text-base font-semibold text-ink ring-1 ring-inset ring-ink/60`
  - texte : `min-h-12 px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4`
  - destructif : `min-h-12 rounded-2xl px-4 text-base font-semibold text-signal-fonce ring-1 ring-inset ring-signal-fonce/50 dark:text-signal-clair dark:ring-signal-clair/50`

## Cartes et listes

**7. La ligne : une seule recette pour tout ce qu'on touche.** Fond `surface`, un filet, un rayon de 16 px, pas d'ombre, 64 px de haut au moins. Toute la ligne est la cible. L'action de fin (coche, « Relancer ») a sa propre colonne de 56 px.
- Bon : `components/dashboard/DemandeCard.tsx:52`, `components/dashboard/ListeDevisRecherchable.tsx:112`, `components/dashboard/ListeFacturesRecherchable.tsx:103` et `components/accueil/Blocs.tsx:61` (la même recette dans quatre listes) ; `components/accueil/ListeAujourdhui.tsx:75` (la colonne de la coche).
- Mauvais : `components/dashboard/AConfirmer.tsx:196` (une `<Card>` avec bordure et ombre au milieu de lignes sans ombre).
- Classes :
  - ligne : `flex min-h-16 items-stretch overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/15`
  - zone touchée : `flex min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-ink/10 sm:hover:bg-ink/5`
  - colonne de fin : `grid w-14 shrink-0 place-items-center border-l border-ink/15`

**8. Le bloc et la feuille, rien d'autre.**
- Pour regrouper, on utilise un bloc : même fond, même filet, même rayon que la ligne, sans ombre. Jamais de carte dans un bloc.
- Pour saisir, on utilise la feuille qui monte du bas. C'est la seule surface qui porte une ombre.
- Il n'y a que trois rayons : `rounded-2xl`, `rounded-full` et `rounded-t-[1.6rem]`.
- Bon : `components/projet/Feuille.tsx:124` (la feuille) ; `components/dashboard/Sidebar.tsx:269` (la feuille « Plus » : des lignes de 56 px séparées par un filet).
- Mauvais : `components/ui/Card.tsx:19` (bordure et ombre, 47 usages) ; `app/dashboard/loading.tsx:11` (un `rounded-3xl` pour un en-tête qui n'existe plus).
- Classes : bloc `rounded-2xl bg-surface p-5 ring-1 ring-ink/15` ; titre de bloc `font-display text-xl font-semibold text-ink`, suivi de son nombre en `font-sans text-sm tabular-nums text-steel`.

## Couleurs et accent

**9. Le terracotta est rare : trois apparitions par écran au plus.** Le terracotta plein, c'est le « + », et rien d'autre. En texte, il ne sert qu'au mot d'alerte (« Retard », « Pas enregistré »). Les icônes sont en `text-ink`. Le texte blanc n'est admis que sur `signal` et sur `anthracite`.
- Bon : `components/accueil/Blocs.tsx:66` (« Retard » en `text-signal-fonce dark:text-signal-clair`) ; `components/dashboard/Sidebar.tsx:230` (le « + »).
- Mauvais : la fiche projet en montre au moins sept au premier écran : `components/projet/EnTeteProjet.tsx:190` (Urgent), `:211,220,230` (trois icônes), `components/projet/Blocs.tsx:98` (le bouton), `:264` (le calendrier), plus le « + ».
- Classes : alerte `text-signal-fonce dark:text-signal-clair` ; « + » `bg-signal text-white` ; icône `text-ink`.

**10. Une couleur, un sens ; aucun code hexadécimal.**
- `succes` sert à la coche et à sa pastille, `alerte-orange` à un point. Ni l'une ni l'autre ne sert pour du texte : elles n'atteignent que 3,8:1 et 2,7:1.
- Un succès s'écrit en `text-ink`, à côté d'une coche verte.
- Interdits : les `#…`, `bg-white`, et `text-signal` pour du texte (3,5:1).
- Bon : `components/accueil/FermerJournee.tsx:142-146` (pastille `bg-succes/10 text-succes`, phrase en `text-ink`).
- Mauvais : `components/projet/Blocs.tsx:399` (« Enregistré » en `text-succes`, 12,5 px) ; `lib/notes/index.ts:194-196` et `components/planning/GrilleAgenda.tsx:30-32` (feux tricolores en hex, dont un rouge `#C23B22` hors palette) ; `components/ui/Avatar.tsx:9-12` (un violet et un bleu hors palette).

## États

**11. Chargement : la forme vide, jamais un mot.** Le squelette est la vraie ligne vidée : même hauteur, même rayon, même filet. Un bouton qui travaille garde sa taille, montre une roue et se désactive.
- Bon : `components/ui/Button.tsx:47-52` (`loading` : roue et `disabled`) ; `components/devis/EspaceDevis.tsx:137-141` (un squelette à la forme du devis).
- Mauvais : `app/dashboard/demandes/[id]/page.tsx:941` (« Chargement… » sur la fiche projet, l'écran le plus ouvert) ; `components/ui/Skeleton.tsx:20` (`animate-pulse` qui ignore le réglage de mouvement réduit).
- Classes : `min-h-16 rounded-2xl bg-surface ring-1 ring-ink/15`, avec des barres `h-4 rounded-full bg-ink/10 motion-safe:animate-pulse`.

**12. Vide : une phrase et une action au plus.** La phrase fait moins de 30 caractères, en `text-base text-steel`. Un bloc vide ne s'affiche pas.
- Bon : `components/planning/AgendaMobile.tsx:146` (« Rien de prévu. ») ; `components/projet/Blocs.tsx:237` (un « À faire » vide est masqué sur téléphone).
- Mauvais : `components/dashboard/ListeFacturesRecherchable.tsx:92` (89 caractères) ; `components/notifications/CentreNotifications.tsx:143` (« Rien en attente. » suivi d'un emoji pouce levé, en 12 px à 40 %).

**13. Erreur : là où était le doigt.**
- Sur une ligne, la ligne revient. Son détail devient « Pas enregistré » en texte d'alerte, et « Réessayer » prend la place de la coche.
- Sur une page, on affiche une phrase et « Réessayer ». `app/dashboard/error.tsx` est le minimum.
- Rien ne s'affiche comme réussi avant qu'on ait lu le résultat de l'écriture.
- Bon : `components/accueil/ListeAujourdhui.tsx:41-50` (la coche revient si l'écriture échoue) ; `components/ui/EtatErreur.tsx:31-39`.
- Mauvais : `components/dashboard/AConfirmer.tsx:122-131` (le résultat de la replanification n'est pas lu, et la carte disparaît même en cas d'échec) ; `components/projet/Blocs.tsx:140` (erreur en `text-signal`) ; aucun `error.tsx` sous `app/dashboard/`.
- Classes : le mot `text-sm font-semibold text-signal-fonce dark:text-signal-clair`, puis le bouton en contour de la règle 6.

**14. Hors ligne : le dire, ne rien promettre.**
- Un bandeau d'une ligne, sous la barre du haut et sans bouton, dit « Pas de réseau. ». Il apparaît sur l'événement `offline` et disparaît sur `online`.
- Le bandeau n'est qu'un indice : `navigator.onLine` se trompe en 4G faible. C'est l'erreur sur la ligne (règle 13) qui fait foi.
- « Gardé sur ce téléphone. » ne s'écrit que là où un brouillon local existe.
- Jamais « rien n'est perdu », « en attente du réseau » ni « sera envoyé » : aucune écriture n'est mise en file d'attente (`public/sw.js:47-54`).
- Bon : `components/dashboard/NotesVocales.tsx:52-90,230` (le texte dicté est vraiment gardé sur le téléphone ; la phrase est vraie, mais à raccourcir en « Pas de réseau. Gardé sur ce téléphone. »).
- Mauvais : `app/hors-ligne/page.tsx:25-36` (un emoji d'antenne sur fond terracotta et un paragraphe de trois lignes) ; et, dans l'application, aucun indicateur de réseau.
- Classes : `flex min-h-10 items-center gap-2 bg-paper-warm px-4 text-sm font-semibold text-ink`, avec un point `h-2 w-2 rounded-full bg-alerte-orange`.

## Retours tactiles et sonores

**15. Chaque appui se voit et se sent, sans aucun son.**
- Sous le doigt, la couleur fonce : au soleil, c'est elle qui se voit, pas un changement de taille.
- Pas d'effet au survol sur téléphone.
- Au toucher de « Fait » et de « Oui », le téléphone vibre 12 ms (`navigator.vibrate?.(12)`, Android seulement). Un échec donne deux vibrations brèves (`[12, 60, 12]`).
- Ni son, ni réglage. Toute animation passe par `motion-safe:`.
- Bon : `components/accueil/FermerJournee.tsx:195` (`motion-safe:active:scale-[0.97]`) ; `components/dashboard/Sidebar.tsx:230` (`motion-safe:group-active:scale-95`).
- Mauvais : `components/ui/Button.tsx:44` (`hover:scale-[1.02] hover:shadow-md`, hors `motion-safe` et sans effet sous le doigt) ; `components/accueil/Blocs.tsx:62` (`hover:bg-ink/[0.03]` : rien ne se voit au toucher).
- Classes : ligne `active:bg-ink/10` ; bouton plein `active:bg-ink/80` ; transition `motion-safe:transition-colors`.

## Moment de soulagement

**16. Fait, trace, repos.** Le soulagement arrive en trois temps :
1. La coche passe au vert et le téléphone vibre.
2. La ligne devient une trace « Fait : … · Annuler ». Elle reste jusqu'à ce qu'on quitte l'écran ou qu'on coche autre chose ; il n'y a pas de minuteur.
3. Quand plus rien n'est en suspens, l'écran le dit : « Tout est réglé. » en 30 px, avec une pastille verte, puis « Demain · … » sur une ligne.

Ni confettis, ni série de jours, ni badge, ni emoji.

« Annuler » n'existe que si le retour en arrière est une écriture qui existe déjà, comme décocher une note. Sinon, on pose la question avant (« Chantier terminé ? »), et la trace n'a pas d'« Annuler ».
- Bon : `components/projet/Blocs.tsx:279-290` (« Fait : … » et « Annuler » dans une zone `aria-live`) ; `components/accueil/FermerJournee.tsx:139-154` (« Tout est réglé » arrive de lui-même, et seulement quand c'est vrai).
- Mauvais : `components/accueil/ListeAujourdhui.tsx:55-56` (la ligne disparaît sans un mot ; comme la liste rend `null` quand elle est vide, la trace doit vivre hors de la liste) ; `components/projet/Blocs.tsx:221,286` (minuteur de 6 s, « Annuler » de 28 px) ; `components/dashboard/AConfirmer.tsx:183` (« ✓ Oui, chantier terminé » : un symbole dans le libellé, sur un bouton terracotta).
- Classes :
  - coche faite : `border-succes bg-succes/10 text-succes`
  - trace : `flex min-h-12 items-center gap-3 rounded-2xl bg-succes/10 pl-4 text-sm text-ink`, avec « Annuler » en bouton texte (règle 6)
  - repos : `font-display text-3xl font-semibold text-ink`, avec la pastille `grid h-12 w-12 place-items-center rounded-full bg-succes/10 text-succes`

## Accessibilité

**17. Des cibles de 48, 56 et 64 px.**
- Tout ce qui se touche mesure au moins 48 px, le bouton plein 56 px et une ligne 64 px.
- Un petit visuel vit dans une grande cible.
- Jamais `min-h-0` ni `h-8` sur ce qui se touche, même au-dessus de 640 px.
- Le plancher global de `app/globals.css:296-299` (44 px, et seulement pour `button` et `a[role="button"]`) est un dernier recours, pas la règle.
- Bon : `components/accueil/ListeAujourdhui.tsx:75-77` (un rond de 28 px dans une colonne de toute la hauteur de la ligne) ; `components/projet/EnTeteProjet.tsx:209` (des tuiles de 68 px).
- Mauvais : `components/projet/Blocs.tsx:133,286,418` (`min-h-0 py-1`, environ 28 px) ; `components/devis/EditeurLignes.tsx:66` (`sm:h-8`, soit 32 px sur tablette).
- Classes : `min-h-12`, `min-h-14`, `min-h-16`. Pour une petite cible : `-m-2.5 grid h-12 w-12 place-items-center` autour d'un rond `h-6 w-6`.

**18. Contraste, focus, lecteur d'écran, mode sombre.**
- Le texte atteint au moins 4,5:1. On l'écrit donc en `ink`, en `steel`, ou en `signal-fonce` (4,9:1) pour l'alerte. Jamais de texte blanc sur `signal`.
- Le focus se voit, en encre.
- Tout bouton-icône a un `aria-label`. Tout changement d'état (fait, erreur, réseau) passe par `aria-live="polite"`.
- Le mode sombre vient des tokens : aucun `dark:` en dehors de l'alerte.
- Bon : `components/accueil/ListeAujourdhui.tsx:74` (`aria-label="Fait : …"`) ; `tailwind.config.ts:26-48` (tous les tokens sont des variables, si bien que le mode sombre ne coûte rien).
- Mauvais : `components/ui/Button.tsx:44` (`focus-visible:ring-signal/40`, à peine visible) ; `components/devis/EditeurLignes.tsx` (aucun style de focus) ; `components/dashboard/Sidebar.tsx:248` (`aria-haspopup` sans `aria-expanded`).
- Classes : `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper`.

## Comment on applique ces règles

- **Au fil de l'eau.** Un écran passe sous ces règles quand on le touche. Un écran neuf les respecte dès son premier commit. Pas de script dans le build, pas de refonte d'un seul coup.
- **Sur ordinateur, le bureau du soir.** Les règles sont les mêmes. Le bouton plein n'occupe plus toute la largeur (`sm:w-auto`), le survol s'ajoute à l'appui (`sm:hover:bg-ink/5`), et les listes restent dans `max-w-2xl`.
- **En attente de leur duel.** La densité de l'éditeur de devis (duel F) et celle de la grille du planning (duel G) restent ouvertes. Ces deux écrans suivent déjà les règles 3, 4, 9, 10, 13, 17 et 18.
