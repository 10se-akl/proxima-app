# Duel D — La fiche projet (le cœur de l'application)

**Le problème en une phrase.** C'est l'écran où l'artisan passe le plus de temps. À 360 px, on ne voit sans défiler que l'en-tête et le haut de « Maintenant ». Photo, note et dictée demandent environ 5 gestes chacune.

**La douleur.** C'est l'information éparpillée (★★★★★) : « deux mois plus tard, le client demande ce qui avait été convenu pour tel détail, et l'artisan doit fouiller partout ». Ce sont aussi les photos introuvables, et le principe « Le pouce d'abord ».

**L'état actuel.** Lis `_inventaire/05-ecrans-coeur.md` §3, puis vérifie `components/projet/VueProjet.tsx`, `EnTeteProjet.tsx`, `Blocs.tsx`, `Carnet.tsx`, `entreesCarnet.ts`, `Feuille.tsx`, `FeuilleMessageClient.tsx` et `app/dashboard/demandes/[id]/page.tsx` (1305 lignes : tout le chargement et toutes les écritures). Les captures sont `captures/avant/fiche-*`.
- De haut en bas : l'en-tête (Appeler / Message / Itinéraire, progression), « Maintenant », À faire, À retenir, Carnet, Dossier.
- Deux feuilles portent le même titre « Message au client » (des modèles SMS/WhatsApp, et un texte IA à copier).
- « À retenir » n'a pas de brouillon local.
- « Terminer le projet » ne demande pas de confirmation.

**Ce qu'il faut trancher :**
- sur 360 × 740, ce qu'on voit sans défiler ;
- ce qui se range sous quoi ;
- où sont la photo, la note et la dictée (au pouce, en un ou deux gestes) ;
- comment un coéquipier de terrain voit ce même écran (duel A en parallèle : prévois les deux cas, avec ou sans restriction des prix) ;
- où vivent le devis et la facture du projet (duel B en parallèle : ils deviennent peut-être des objets du projet plutôt que des destinations).

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** L'écran actuel, avec seulement les bugs corrigés : les deux feuilles fusionnées, le brouillon d'« À retenir », la confirmation pour terminer.
- **B — Le plus soustractif.** Un en-tête, une seule action « Maintenant », et le Carnet comme fil unique où tout arrive (photos, notes, dictées, devis, factures). Une barre d'action au pouce : Photo · Dicter · Écrire.
- **C — Une logique différente.** Par exemple, la fiche comme un « dossier » à trois volets fixes (Chantier / Client / Argent) sans onglets cachés, ou bien une fiche différente selon l'étape du projet (avant devis, chantier, à facturer).
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

**Chaque maquette montre :**
- un projet nouveau, un projet en chantier et un projet à facturer, à 360 px sans défiler ;
- le geste « ajouter 3 photos » ;
- la vue du coéquipier de terrain.

**Les poids** sont les poids standard.
