# Identité visuelle Compyo

Version 2 — remplace la simple lettre "C" utilisée jusqu'ici.

## Le symbole

Un arc ouvert (terracotta principal) et une forme pleine (terracotta clair) qui vient se loger dans son ouverture. Ensemble, ils se lisent comme un C. Séparément, ils racontent l'idée du produit : deux éléments — l'artisan et Compyo — qui travaillent ensemble, jamais l'un à la place de l'autre.

Volontairement écarté : marteau, clé à molette, maison, casque de chantier, robot, cerveau IA. Le symbole doit pouvoir représenter n'importe quel indépendant — artisan du bâtiment aujourd'hui, potentiellement un autre métier demain — sans jamais paraître réservé au BTP.

Source de vérité dans le code : `components/marketing/CompyoMark.tsx` (composant React, réutilisé partout dans l'app). Fichiers exportés pour un usage hors-code dans `public/brand/`.

## Fichiers disponibles (`public/brand/`)

| Fichier | Usage |
|---|---|
| `icone.svg` | Symbole seul, couleur, fond clair |
| `icone-monochrome.svg` | Symbole seul, anthracite uni |
| `icone-blanc.svg` | Symbole seul, pour fond sombre |
| `icone-noir.svg` | Symbole seul, noir pur (impression 1 couleur) |
| `logo-horizontal.svg` | Symbole + "Compyo" côte à côte — en-têtes, signatures email |
| `logo-vertical.svg` | Symbole au-dessus de "Compyo" — écrans de démarrage, réseaux sociaux |
| `logo-blanc.svg` | Version horizontale complète, blanche, pour fond sombre |
| `logo-noir.svg` | Version horizontale complète, noire, impression 1 couleur |
| `logo-monochrome.svg` | Version horizontale complète, anthracite uni |

Le favicon (`app/icon.tsx`) et l'image de partage sur les réseaux (`app/opengraph-image.tsx`) utilisent la même construction, régénérés automatiquement par Next.js — rien à maintenir séparément.

## Palette officielle

| Nom | Hex | Usage |
|---|---|---|
| Terracotta principal | `#C96B4A` | Couleur de marque — symbole, bouton « + » de la barre du bas, accents rares. Les boutons d'action de l'application sont en anthracite (refonte du 03/10, voir docs/langage-interface.md) |
| Terracotta clair | `#E8C5B6` | Second plan du symbole, fonds d'accent très légers |
| Blanc cassé | `#FAF8F5` | Fond principal de l'app et du site |
| Anthracite | `#1F2937` | Texte, fonds sombres (pied de page, sections contrastées) |
| Gris clair | `#E8E8E8` | Bordures discrètes, séparateurs |

Dans le code, ces couleurs sont les tokens Tailwind `signal`, `signal-clair`, `paper`, `ink`, `gris-clair` (voir `tailwind.config.ts`) — ne jamais écrire un code hexadécimal en dur dans un composant, toujours passer par ces noms pour que toute l'app reste cohérente si la palette évolue.

## Typographie

- **Titres** (`font-display`) : Manrope, graisses 600/700/800. Le mot "Compyo" s'écrit toujours en 600 (semi-bold), jamais en gras total ni en fin.
- **Texte courant** (`font-sans`) : Inter.
- **Labels techniques, mono** (`font-mono`) : IBM Plex Mono — réservé aux petites étiquettes en majuscules espacées (ex. "BÊTA PRIVÉE"), jamais pour un titre ou un paragraphe.

## Règles d'utilisation

1. **Zone de respiration minimale** : laisser autour du symbole un espace au moins égal à la moitié de sa largeur, de tous les côtés. Ne jamais l'accoler à un bord ou à un autre élément.
2. **Taille minimale** : le symbole seul reste identifiable à partir de 20-24 px (favicon, icône d'app). En dessous, utiliser uniquement le symbole, jamais la version avec texte.
3. **Couleurs** : sur fond clair (blanc cassé, blanc, gris clair), utiliser la version couleur. Sur fond sombre ou photo, utiliser la version blanche. La version noire est réservée à l'impression en une seule couleur (facture, tampon).
4. **Ne jamais** : changer les proportions du symbole indépendamment (étirer, aplatir), le faire pivoter, ajouter une ombre portée, un dégradé, un contour, ou recolorer l'arc et la forme pleine dans des couleurs hors palette.
5. **Le mot "Compyo"** s'écrit toujours avec un C majuscule et le reste en minuscules — jamais "COMPYO" en capitales, jamais "compyo" tout en minuscules dans un contexte de marque (titres, logo). Les minuscules restent acceptables dans une URL ou une adresse email.

## Pourquoi ce choix

Le style se rapproche volontairement de ce que font Linear, Stripe, Notion, Raycast ou Vercel pour leur propre marque : un symbole géométrique très simple, sans dégradé complexe, sans détail superflu, qui reste net à n'importe quelle taille et ne se démodera pas dans deux ans. C'est un choix qui doit vieillir bien, pas un choix qui doit impressionner une seule fois.
