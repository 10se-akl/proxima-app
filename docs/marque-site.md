# La fiche de marque du site Compyo

Écrite le 14/11/2026, d'après la méthode des formations « sites à 10 000 $ avec Claude Code »
(celles du TikTok envoyé par Axel). Leur règle de base : avant de toucher au design, une page
qui dit pour qui on travaille, l'effet voulu, l'action unique, les polices, les couleurs et ce
qui est interdit. **À lire avant toute retouche du site vitrine.** Pour l'application, la
référence reste `docs/langage-interface.md`.

## Pour qui

Gérard, plaquiste, 57 ans, seul, Android d'entrée de gamme, en plein soleil, interrompu toutes
les dix minutes. Il ne lit pas : il regarde, il appuie, il repart. Souvent, c'est sa conjointe
qui choisit le logiciel. Et aussi Karim (plombier, 2 salariés, urgences) et Lucas (peintre,
29 ans, iPhone).

## L'effet voulu, en trois mots

**Net, du métier, franc.** Net : lisible d'un coup d'œil, au soleil. Du métier : le carnet de
chantier, le camion, le devis ; pas une « startup ». Franc : chaque phrase est vraie, les
exemples inventés sont dits inventés, ce qui n'existe pas encore est rangé à part.

## L'action unique

**« Essayer gratuitement »** (créer son compte, `/demander-acces`). Visible sans faire défiler
(premier écran et en-tête), répétée à la fin. Aucune autre action ne lui fait concurrence :
« Voir comment » est un lien discret.

## Le test des cinq secondes

Quelqu'un regarde l'accueil cinq secondes, on cache l'écran : il doit pouvoir dire « c'est pour
les artisans, ça prépare les réponses, les devis et les factures ». Si une retouche casse ça,
elle est mauvaise.

## Polices

- Titres : **Bricolage Grotesque**.
- Texte : **Atkinson Hyperlegible** (chiffres en Inter, à cause du zéro barré).
- Une seule exception, comptée : **Caveat** (écriture à la main), uniquement pour les heures de
  la journée et les numéros entourés. Jamais pour une phrase.

## Couleurs (une couleur = un rôle)

| Rôle | Couleur |
|---|---|
| Fond | papier quadrillé `#F3F2ED` (et `#EAE8E1` une section sur deux) |
| Texte | encre `#1C1E21`, secondaire `#464B52` |
| **L'action** | bleu cordeau `#2356C4` (boutons, liens) |
| L'action sur fond sombre | jaune du mètre `#F2C02E` (photo du haut, nuit de la fin) |
| L'annotation | rouge crayon `#B53722` (étiquettes de section, heures) |
| C'est fait | vert `#21754A` (coches, tampon) |

Pas d'autre couleur. Pas de dégradé décoratif (le seul dégradé assombrit la photo sous le texte).

## Images

1. D'abord **de vraies captures de l'application** (`public/guide/`, refaites à chaque changement
   de design). C'est la preuve.
2. Ensuite de vraies photos d'artisans, sans pose de banque d'images, avec la mention « Photo
   d'illustration » (licence Pexels : la personne ne recommande pas Compyo).
3. Les téléphones dessinés servent seulement à montrer un geste animé, avec « exemples inventés ».
4. Pas d'image générée payante sans l'accord d'Axel. Pas d'icônes en emoji.

## Mouvement

Une animation par section, au plus. Autour de 250 à 450 ms. **Rien qui rebondit.** Tout reste
lisible si les animations sont coupées (`prefers-reduced-motion`) ou si le script ne tourne pas.

## Texte

Phrases courtes, concrètes, au présent. Un chiffre vaut mieux qu'un adjectif (« 387,20 € »,
« 18 h 45 »). On parle de la soirée de l'artisan, pas de nos fonctions.

## Interdits

- Un avis, un chiffre d'utilisateurs ou un logo de client qui n'existe pas.
- « Solution innovante », « révolutionnaire », « boostez », « IA » en titre.
- Tout centrer. Les dégradés violets, les halos, le verre dépoli.
- Les phrases qu'on ne peut pas tenir (« plus rien à faire », « réponse sous 24 h »).
- Un deuxième bouton plein à côté du premier.
- Demander tous les changements d'un coup : une couche à la fois (tailles, puis espaces, puis
  mouvement), et « ne touche à rien d'autre ».

## La grille de relecture (à passer avant de pousser)

Pour chaque point : fort, moyen ou absent. Sans complaisance.

1. Un point de vue (on reconnaît Compyo sans le logo ?)
2. La typographie (deux polices, une échelle régulière)
3. La couleur (retenue : une couleur, un rôle)
4. La hiérarchie (l'œil sait quoi lire en 1er, 2e, 3e)
5. Les images (vraies, utiles)
6. Le texte (court, vrai, concret)
7. Le mouvement (guide l'œil, ne distrait pas)
8. Le téléphone (pensé à 360-375 px, pas seulement « adapté »)
