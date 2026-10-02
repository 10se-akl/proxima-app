# Duel H — Le langage visuel et tactile

**Le problème en une phrase.** L'application n'a pas de règles écrites sur la densité, la typographie, la hiérarchie des boutons, les cartes, les états et les retours. Chaque écran a donc fini par inventer les siennes, et c'est sur ce langage que s'appuieront tous les autres duels.

**La douleur.** La recherche dit : « Tolteck, le plus simple du marché, a la meilleure note : 4,9 sur 5 […] il se prend en main en quelques minutes, quel que soit l'âge. » Elle pose aussi le principe « Des chiffres et des pastilles plutôt que des phrases. "3 devis en attente" se lit en une seconde. » Gérard regarde son téléphone au soleil, avec des gants.

**L'état actuel.** Lis `_inventaire/04-langage-visuel-actuel.md` (s'il n'est pas encore là, audite toi-même `tailwind.config.ts`, `app/globals.css`, `components/ui/*`, `BRAND.md`), puis les captures dans `captures/avant/`.

**Ce qu'il faut trancher, puis appliquer à toute l'application :**
- la densité : combien d'éléments par écran à 360 px ;
- l'échelle typographique : très grand / très petit, peu de moyen ;
- la hiérarchie des boutons : un seul primaire par écran ;
- la forme des cartes et des listes ;
- les états : chargement, vide, erreur, succès, hors-ligne ;
- les retours tactiles et sonores ;
- l'expression du **moment de soulagement** quand quelque chose est terminé, sans confettis, sans badges, sans jeu.

**Livrable final du duel** (écrit après l'arbitrage, pas par les solveurs) : `docs/langage-interface.md`. C'est une page de règles courtes, que tout écran doit respecter, avec des exemples bon / mauvais tirés de l'application actuelle.

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** Formaliser le langage actuel tel qu'il est (les règles implicites qui existent déjà) et montrer trois écrans actuels annotés.
- **B — Le plus soustractif.** Le minimum de règles et de variantes. Par exemple : 2 tailles de texte, 1 forme de carte, 1 bouton primaire et 1 secondaire. On supprime toute variante non indispensable.
- **C — Une logique différente.** Par exemple, un langage « gros boutons de chantier » : listes plein écran, une action par ligne, la typographie qui porte tout, pas de cartes.
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

Chaque maquette montre **le même écran Aujourd'hui** et **la même fiche projet** dans son langage, plus une planche des états (chargement, vide, erreur, hors-ligne, succès / soulagement), en clair **et** en sombre (dupliquer l'écran avec `<div class="dark">` autour).

**Les poids.** Ce sont les poids standard. Le critère « Cohérence » est relu ici comme « applicabilité à tous les écrans existants sans réécriture totale ».
