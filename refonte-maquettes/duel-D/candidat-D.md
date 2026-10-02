# Candidat D (libre) — Une fiche à ordre fixe, des blocs qui n'existent que s'ils ont du contenu

## L'approche en 3 phrases
La fiche garde son squelette (en-tête, état du projet, Carnet) mais chaque étage s'allège : une phrase, **au plus un bouton plein**, et trois gestes d'ajout **visibles** (Photo · Dicter · Note) au lieu de quatre portes vers une feuille. Le Dossier disparaît : devis et facture deviennent un bloc « Argent » (même mot que le 5e onglet, duel B), les photos vivent dans le Carnet, le client dans « … ». « À faire », « À retenir » et « Argent » n'apparaissent que s'ils ont quelque chose à dire ; à 360 × 740 le premier écran ne porte jamais plus de quatre blocs, et le Carnet est le même fil pour tous (duel A : seul le prénom de l'autre s'y ajoute).

## La douleur
Information éparpillée (★★★★★) : « l'artisan doit fouiller partout ». Aujourd'hui tout est dans le Carnet, mais il est le dernier bloc, derrière quatre cartes, et sa recherche n'est jamais à l'écran. Photo, note et dictée coûtent 5 gestes chacune, donc on les fait en fin de journée plutôt que sur place.

## Supprimé, fusionné, ajouté — et ce que l'artisan perd
- **Supprimé** : le bloc Dossier ; trois des quatre portes d'ajout (« + Ajouter » du Carnet, « Ajouter » de À faire, bouton « Ajouter une note ou des photos » de Maintenant) ; les boutons secondaires de Maintenant déjà présents dans « … » ; la carte « bien reçu » (110 px), qui devient la première suggestion de la feuille Message ; le libellé de l'étape sur téléphone ; les icônes terracotta (règle 9).
- **Fusionné** : les deux feuilles « Message au client » en une (le texte de l'IA y reçoit SMS / WhatsApp, plus de copier-coller) ; « La demande » et le résumé IA entrent dans le Carnet comme première entrée.
- **Ajouté** : une bande de trois tuiles ; une loupe (seulement si le Carnet dépasse 5 lignes) ; la question « Chantier terminé ? » avant de terminer.
- **Perdu** : le Carnet replié à l'ouverture (décision du 27/09, rouverte : on montre les 5 dernières lignes, puis « Voir les N ») ; « Résumer mes notes avec l'IA » et « Faire le devis moi-même » passent d'un appui à deux (« … ») ; le mémo vide n'invite plus à écrire (il se crée par « … ») ; le texte de l'étape sous la barre ; « N autres chantiers ensemble » (déplacé dans « Infos du client »).

## Gestes (convention de l'inventaire : un appui, une saisie, une validation système)
| Tâche | Avant | Après |
|---|---|---|
| 1 photo (appareil) | [+] · Photos · Prendre · déclencheur · ✓ = 5 | Photo · déclencheur · ✓ = **3** |
| 3 photos depuis la galerie | [+] · Photos · Galerie · 3 vignettes · valider = 7 | Photo · 3 vignettes · Ajouter = **5** (si le sélecteur système le permet) |
| 3 photos à l'appareil | 15 | **9** |
| Dictée | [+] · Dicter · Dicter une note · parler · Arrêter · Ajouter = 5 | Dicter · Terminé · Ajouter = **3** |
| Note écrite | [+] · Note · titre · Enregistrer = 4 | Note · titre · Enregistrer = **3** |
| Retrouver « la mesure de la fenêtre » | défiler jusqu'au bas · champ · saisir ≈ 4 | loupe · saisir = **2** |
| Terminer le chantier | 1 (sans question) | 2 (la question est le prix de la sécurité) |

## Impact technique
Aucune migration, aucune table touchée. Fichiers : `VueProjet.tsx` (ordre, bande, portes retirées), `EnTeteProjet.tsx` (tuiles 56 px, icônes en encre, loupe), `Blocs.tsx` (Maintenant ≤ 1 bouton plein + 1 lien ; À retenir en ligne + feuille avec brouillon par `lib/brouillonLocal` ; Dossier → Argent), `Carnet.tsx` et `entreesCarnet.ts` (5 lignes, auteur), `prochaineAction.ts`, `FeuilleMessageClient.tsx` et la feuille IA de `[id]/page.tsx` (fusion), `NotesVocales.tsx` (écoute à l'ouverture), `PhotosProjet.tsx` (champ direct). `[id]/page.tsx` ne reçoit que des props en plus : pas de refonte des 1305 lignes. Risques : le prénom des coéquipiers (lecture de `profils` sous RLS ; les notes et événements ont `artisan_id`, **pas les photos**, qui sont un tableau de chemins : préfixer le chemin à l'envoi ou lire l'événement `photo_ajoutee`) ; `SpeechRecognition.start()` à l'ouverture de la feuille (le geste de l'utilisateur doit rester dans la même pile) ; mise en page deux colonnes de l'ordinateur.

## Lots (jamais de big bang)
1. **Même écran, bugs et règles** : une feuille Message, brouillon du mémo, confirmation de « Terminer », tailles et couleurs de la fiche (règles 3, 4, 9), Maintenant à un bouton plein.
2. **Trois gestes directs** : bande Photo · Dicter · Note, appareil et micro à l'ouverture, retrait des trois portes.
3. **Argent et Carnet** : bloc Argent à la place du Dossier (après le duel B ; sinon il s'appelle « Devis et facture »), 5 lignes + loupe.
4. **Auteurs dans le Carnet** (après le duel A).

## Auto-évaluation (sur 10, puis pondérée)
Charge mentale 7,5 · Gestes 8,5 · Lisibilité 360 px 8 · Risque technique 6,5 · Coût de migration 7 · Cohérence 8,5 → **76/100**.

## Deux faiblesses réelles
1. **Moins soustractif que B** : une fiche riche peut afficher sept blocs ; la discipline « seulement s'il a du contenu » vit dans le code, pas dans la structure. Et la capture a deux portes (la bande, et le [+] que je ne touche pas, décision du 26/09) : si la bande se montre plus lisible, le [+] pourrait redevenir « Nouveau projet » partout, mais c'est au duel de navigation de le décider.
2. **Trois paris non vérifiés sur un vrai Android bas de gamme** : le sélecteur d'images (appareil + galerie multiple), l'écoute de la dictée dès l'ouverture, l'auteur des photos. Si l'un échoue, le gain tombe d'un geste sans casser le reste. En plus, au chantier, le Carnet est au deuxième écran (À faire passe devant) ; la loupe, en haut à droite, est loin du pouce. Écart assumé à la règle 2 : le texte de l'utilisateur (note, mémo) tient sur deux lignes, pas une.
