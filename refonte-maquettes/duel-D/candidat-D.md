# Candidat D (libre) — Une fiche à ordre fixe, des blocs qui n'existent que s'ils ont du contenu

## L'approche en 3 phrases
La fiche garde son squelette (en-tête, état du projet, Carnet) mais chaque étage s'allège : une phrase, **au plus un bouton plein**, et trois gestes d'ajout **visibles** (Photo · Dicter · Note) au lieu de quatre portes vers une feuille. Le Dossier disparaît : devis et facture deviennent un bloc « Argent » (même mot que le 5e onglet, duel B), les photos vivent dans le Carnet, le client dans « … ». « À faire », « À retenir » et « Argent » n'apparaissent que s'ils ont quelque chose à dire : à 360 × 740, les trois étapes montrent quatre blocs, jamais plus de cinq.

## La douleur
Information éparpillée (★★★★★) : « l'artisan doit fouiller partout ». Tout est dans le Carnet, mais c'est le dernier bloc, derrière quatre cartes, et sa recherche n'est jamais à l'écran. Photo, note et dictée coûtent 5 gestes : on les remet au soir.

## Supprimé, fusionné, ajouté — et ce que l'artisan perd
- **Supprimé** : le Dossier ; trois des quatre portes d'ajout (« + Ajouter » du Carnet, « Ajouter » de À faire, bouton de Maintenant) ; les boutons secondaires de Maintenant déjà dans « … » ; la carte « bien reçu » (110 px), qui devient la première suggestion de la feuille Message ; les icônes terracotta.
- **Fusionné** : les deux feuilles « Message au client » en une (le texte de l'IA reçoit SMS / WhatsApp, plus de copier-coller) ; « La demande » et le résumé IA deviennent la première entrée du Carnet.
- **Ajouté** : la bande de trois tuiles ; une loupe (seulement si le Carnet dépasse 5 lignes) ; la question « Chantier terminé ? ».
- **Perdu** : le Carnet replié à l'ouverture (décision du 27/09, **rouverte** : 5 dernières lignes, puis « Voir les N ») ; « Résumer mes notes avec l'IA » et « Faire le devis moi-même » passent à deux appuis ; le mémo vide n'invite plus à écrire (il se crée par « … ») ; le libellé de l'étape sur téléphone.

## Gestes (convention de l'inventaire : appui, saisie, validation système)
| Tâche | Avant | Après |
|---|---|---|
| 1 photo (appareil) | [+] · Photos · Prendre · déclencheur · ✓ = 5 | Photo · déclencheur · ✓ = **3** |
| 3 photos, galerie | [+] · Photos · Galerie · 3 vignettes · valider = 7 | Photo · 3 vignettes · Ajouter = **5** (si le sélecteur système le permet) |
| 3 photos, appareil | 15 | **9** |
| Dictée | [+] · Dicter · Dicter une note · parler · Arrêter · Ajouter = 5 | Dicter · Terminé · Ajouter = **3** |
| Note écrite | [+] · Note · titre · Enregistrer = 4 | Note · titre · Enregistrer = **3** |
| Retrouver « la mesure de la fenêtre » | défiler en bas · champ · saisir ≈ 4 | loupe · saisir = **2** |
| Terminer le chantier | 1, sans question | 2 (le prix de la sécurité) |

## Impact technique
Aucune migration, aucune table. Fichiers : `VueProjet.tsx`, `EnTeteProjet.tsx`, `Blocs.tsx` (Maintenant ≤ 1 bouton plein + 1 lien ; À retenir en ligne + feuille avec `lib/brouillonLocal` ; Dossier → Argent), `Carnet.tsx`, `entreesCarnet.ts` (5 lignes, auteur), `prochaineAction.ts`, `FeuilleMessageClient.tsx` + feuille IA de `[id]/page.tsx`, `NotesVocales.tsx` (écoute à l'ouverture), `PhotosProjet.tsx` (champ direct). `[id]/page.tsx` ne reçoit que des props. Pas de rôle (duel A) : tous voient les mêmes montants, donc aucune branche à écrire. Risques : le prénom des coéquipiers (notes et événements ont `artisan_id`, **pas les photos**, un simple tableau de chemins : préfixer le chemin ou lire l'événement `photo_ajoutee`) ; `SpeechRecognition.start()` dès l'ouverture de la feuille ; la mise en page deux colonnes de l'ordinateur.

## Lots (pas de big bang)
1. **Même écran, bugs et règles** : une feuille Message, brouillon du mémo, confirmation de « Terminer », tailles et couleurs (règles 3, 4, 9), Maintenant à un bouton plein.
2. **Trois gestes directs** : la bande, appareil et micro à l'ouverture, trois portes en moins.
3. **Argent et Carnet** : Argent à la place du Dossier (après le duel B ; sinon « Devis et facture »), 5 lignes + loupe.
4. **Auteurs dans le Carnet** (après le duel A).

## Auto-évaluation (sur 10)
Charge mentale 7,5 · Gestes 8,5 · Lisibilité 8 · Risque technique 6,5 · Migration 7 · Cohérence 8,5 → **76/100** pondéré.

## Deux faiblesses réelles
1. **Moins soustractif que B** : une fiche riche peut montrer sept blocs, et la discipline « seulement s'il a du contenu » vit dans le code, pas dans la structure. La capture a aussi deux portes (la bande, et le [+] que je laisse intact, décision du 26/09) : si la bande convainc, le [+] pourrait redevenir « Nouveau projet » partout, mais c'est au duel de navigation d'en décider.
2. **Trois paris non vérifiés sur un vrai Android d'entrée de gamme** : le sélecteur d'images (appareil et galerie multiple), l'écoute dès l'ouverture, l'auteur des photos. Si l'un échoue, le gain perd un geste, rien ne casse. Au chantier, le Carnet est au deuxième écran (À faire passe devant) et la loupe, en haut à droite, est loin du pouce. Écart assumé à la règle 2 : le texte de l'utilisateur (note, mémo) tient sur deux lignes.
