# Design v3 « Compagnon » (23/10/2026)

Refonte visuelle complète de l'application (pas du site vitrine), demandée par Axel. Synthèse de sept visions
(direction artistique, UX mobile terrain, design system, accessibilité, performance, accueil, applis natives), puis
relue par un relecteur de code et un regard extérieur. Les fonctions, la logique métier et les parcours ne changent pas.

## L'idée
Une encre bleu-nuit sur un papier clair ; une seule police travaillée ; la couleur réservée à ce qui a un sens.
« En haut on lit, en bas on agit. » Un client, une ligne, un geste. L'argent se voit.

## Jetons (app/globals.css, bloc « Design v3 », scopé `html:has([data-da="atelier"])`)
| Rôle | Jeton | Clair | Sombre |
|---|---|---|---|
| Fond | `paper` | 246 245 242 | 14 15 18 |
| Creux (bouton secondaire, champ, pilule active) | `paper-warm` | 237 235 230 | 38 41 48 |
| Carte | `surface` | 255 255 255 | 25 27 32 |
| Texte, bouton plein | `ink` | 20 25 36 (17,6:1) | 237 236 232 |
| Le seul gris de texte | `steel` | 74 80 93 (8,1:1) | 164 168 178 (7,2:1) |
| Filet | `gris-clair` | 226 224 219 | 44 47 54 |
| Carte « Maintenant », le + | `nuit` | 23 31 48 | 40 45 58 |
| Maintenant / urgent (plein, blanc dessus 5,1:1) | `signal` | 184 76 36 | 184 76 36 |
| Orange en texte | `signal-fonce` | 146 58 24 | 246 162 124 |
| Argent, c'est fait | `succes` / `succes-fond` | 18 96 58 / 226 242 232 | 120 204 150 / 26 52 38 |
| À faire | `alerte-orange` / `alerte-fond` | 122 70 0 / 251 239 216 | 238 182 92 / 58 44 22 |
| Information | `bleu` / `bleu-fond` | 28 78 160 / 230 238 251 | 140 180 255 / 28 40 64 |
| Facture | `violet` / `violet-fond` | 86 54 158 / 239 235 251 | 190 166 255 / 44 38 68 |

Règles : une étiquette d'état = `bg-X-fond text-X` (teinte opaque, ≥ 5,9:1), jamais `bg-X/15`. Texte : `ink` ou `steel`,
jamais une opacité d'encre (le CSS ramène `text-ink/30…70` à `steel`). Rien sous 13 px (plancher CSS). Pas de
capitales espacées. Le sombre est dessiné à part : pas d'ombres, des paliers de surface.

## Typographie
Inter seule, servie par le site (`next/font`, variable `--font-app`), pour le texte, les titres et les chiffres
(`tabular-nums` pour aligner). Titres serrés (−0,02 em). Repères : titre d'écran 30/36 gras ; titre de bloc 20 gras ;
ligne principale 17 semi-gras ; détail 15 ; étiquette 13 semi-gras ; gros chiffre 32-36 gras (−0,03 em).

## Formes
Rayons : 14 (bouton, champ, vignette), 20 (carte), 24 (carte « Maintenant »), 28 (haut des feuilles), plein
(pastille, +). Deux élévations : `ombre-douce` (cartes) et `ombre-feuille` (feuilles). Aucun flou, aucun dégradé,
aucun halo. Cibles ≥ 44-48 px ; bouton principal 48-56 px.

## Composants
- **Barre du bas** : opaque, filet en haut, icônes 24, l'onglet actif porte une pilule creuse ; le + bleu-nuit dans la
  barre (8 px de débord), sans halo.
- **Le cordeau** (`components/ui/Cordeau.tsx`) : la signature. Cinq segments Demande · Devis · Signé · Chantier ·
  Terminé, à l'encre jusqu'à l'étape, vert une fois terminé. Sous chaque projet et en grand sur la fiche.
- **Ligne** (`LigneAccueil`) : repère, qui en 17, quoi en 15 sur deux lignes au plus, les gestes en pastilles creuses à
  droite (plus de colonnes à filet).
- **Feuille** : coins de 28 px, voile sans flou, poignée qui se tire vers le bas (80 px ou geste rapide).
- **Bouton** : `primary` plein à l'encre (un seul par écran), `secondary` en creux.

## L'accueil (téléphone, dans cet ordre)
1. Date et « Bonjour Thomas. » ; 2. la carte du haut (une seule chose : maintenant, ou le repos) ; 3. l'argent : un gros
chiffre « À encaisser », le retard, le mois en une ligne ; 4. Aujourd'hui ; 5. « À faire » : les questions d'un geste
puis les dossiers (relancer, facturer, planifier) ; 6. trois chantiers. Ordinateur : à faire à gauche ; argent et
chantiers à droite. Retirés : « En résumé », la phrase du soir, les tuiles de compteurs.

## Thème
Dans l'application, le thème suit le téléphone tant qu'on n'a rien choisi ; la barre d'état prend la couleur du fond.
Le site vitrine garde son sombre par défaut.

## Écarts assumés avec la maquette d'Axel
Pas de tuiles de compteurs (des chiffres sans geste) ; pas d'onglets sur la fiche (trop hauts pour le pouce, trop petits
avec des gants) ; pas de grande photo en tête de fiche (lourde en 4G) ; textes jamais sous 13 px ni gris pâles.

## Restes à faire
Vraies miniatures de photos (une version 256 px à l'envoi) ; le menu « … » de la fiche en feuille du bas ; une barre
d'actions de fiche sous le pouce ; l'éditeur de devis (`EditeurLignes`) et le document client gardent leur mise en page.
