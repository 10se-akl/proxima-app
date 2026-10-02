# Candidat C — La fiche suit l'étape du projet

**Approche.** L'en-tête ne bouge jamais : nom, Appeler / Message / Itinéraire, et trois étapes **non cliquables** (Avant devis · Chantier · À facturer), déduites du `statut` existant. Dessous, un seul bloc dit où l'on en est et porte l'unique bouton plein : « Préparer le devis » avant devis, **Photo** sur le chantier, « Créer la facture de solde » (avec le reste à facturer en 30 px) à la fin. Photo · Dicter · Note sont sous le pouce, toujours à la même place ; le reste (À retenir, À faire, Argent, Carnet) se range dessous, sans onglet, sans rôle, sans vue terrain. Variante retenue : « une fiche par étape », pas les trois volets Chantier / Client / Argent, qui obligeraient Gérard à choisir un volet alors que la donnée sait déjà où il en est.

**Douleur.** L'information éparpillée et la journée qui ne se ferme jamais (`recherche-douleurs-artisans.md` l.81) : « Deux mois plus tard, le client demande ce qui avait été convenu pour tel détail, et l'artisan doit fouiller partout. » Aujourd'hui, sur le chantier, Photo / Dicter / Note sont derrière le [+] et une feuille (`VueProjet.tsx:406-415`), et le Carnet est le dernier bloc (`VueProjet.tsx:392`). Le soir, la conjointe ne voit pas « quoi facturer ».

**Supprimé, fusionné, ajouté.**
- Supprimé : les 5 segments (`EnTeteProjet.tsx:18-24`) deviennent 3 ; la carte « Maintenant » à trois boutons et sa phrase IA de deux lignes (→ « Vous relisez avant l'envoi. ») ; la feuille 2×2 « Ajouter au projet » sur la fiche ; la pastille Urgent et les trois icônes terracotta (→ le mot « Urgent » en `signal-fonce`) ; le bloc « Dossier ».
- Fusionné : devis et factures deviennent des lignes « Argent » (cohérent avec le duel B) ; À retenir tient en une ligne qui s'ouvre.
- Ajouté : la rangée Photo · Dicter · Note sur téléphone (elle existe déjà sur ordinateur) ; le reste à facturer (déjà calculé, `FacturesProjet.tsx:198`) ; la question « Chantier terminé ? » (corrige l'absence de confirmation) ; le prénom de l'auteur dans le Carnet **seulement si ce n'est pas vous** (duel A).
- Ce que l'artisan perd : le [+] cesse d'« Ajouter » sur la fiche et redevient « Nouveau » partout (un seul sens) ; « Terminer le chantier » n'est plus un bouton, il est dans « … ».

**Gestes (avant → après).**
| Tâche | Avant | Après |
|---|---|---|
| Ajouter 3 photos de la galerie | 7 | 5 |
| Prendre 1 photo | 5 | 4 |
| Dicter une note | 5 | 3 (si l'écoute démarre à l'ouverture, à vérifier dans `NotesVocales.tsx`) |
| Note écrite | 4 | 3 |
| Facturer le solde (chantier terminé) | 2 | 1 |
| Terminer le chantier | 1 | 3 (« … », Terminer, « Oui » : voulu, geste rare) |

Sans défiler à 360 × 740 : en-tête ≈ 180 px (≈ 260 aujourd'hui), puis le bloc d'étape, la rangée de capture et deux lignes ; plus aucun bouton coupé sur un projet neuf.

**Impact technique.** Aucune migration, aucune route retirée, `statut` inchangé. `prochaineAction.ts` (déjà une machine par statut) est gardé tel quel ; seule la présentation change. Touchés : `EnTeteProjet.tsx`, `Blocs.tsx` (Maintenant, Dossier), `VueProjet.tsx` (ordre par étape, rangée de capture, fin de l'interception de `compyo:capture` l.154-161), `PhotosProjet.tsx` (un seul champ sans `capture` : le sélecteur d'Android propose appareil photo et galerie ; sinon on garde les deux champs actuels), `entreesCarnet.ts` (prénom via `artisan_id`, déjà présent sur notes, notes vocales et évènements, dont `photo_ajoutee`, `PhotosProjet.tsx:150`). `[id]/page.tsx` n'est touché que pour la confirmation. Risques : un statut resté « en_cours » par oubli montre encore Photo au lieu de Facturer ; le sélecteur photo varie selon l'Android ; lecture des prénoms de l'équipe à confirmer avec le duel A.

**Lots.** (1) En-tête à 3 étapes, sans autre changement. (2) Rangée Photo · Dicter · Note et fin du [+] intercepté, après test sur 2 ou 3 Android. (3) Blocs par étape et confirmation de fin de chantier, avec la décision du duel B. (4) Prénom d'auteur dans le Carnet, avec le duel A. Chaque lot se livre seul.

**Auto-évaluation (sur 100).** Charge mentale 24/30 · gestes 16/20 · lisibilité 17/20 · risque 10/15 · coût 6/10 · cohérence 4/5 = **77**. Faiblesses : (1) la fiche change de forme avec l'étape, donc l'ordre des blocs ne se mémorise plus, et tout repose sur un statut tenu à jour ; (2) les gains Photo et Dicter reposent sur des hypothèses non testées sur appareil, et terminer un chantier coûte deux gestes de plus. Non traité ici : la fusion des deux feuilles « Message au client » et le brouillon local d'« À retenir », à faire dans tous les cas.
