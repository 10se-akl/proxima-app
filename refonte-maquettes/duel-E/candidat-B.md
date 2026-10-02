# Candidat B — Une seule porte : l'écran « Reçu »

**L'approche.** Partage Android, collage, photo, texte écrit ou dicté au clavier : tout atterrit sur le même écran, « Reçu ». Il montre le message d'origine en une ligne, propose l'accusé « bien reçu » tout de suite (sans attendre l'IA) puis le rangement en une ligne (nouveau projet ou projet existant), et reste affiché après « Ranger » : un seul atterrissage, plus de feuille à trois choix. Le serveur a déjà une seule porte (`matcher`, `creer-depuis-brouillon` et `ajouter-note-depuis-partage` acceptent un texte seul, `partageId` facultatif) : seule l'interface en a quatre.

**La douleur.** « il n'y ait plus rien à trier » (recherche, « l'administratif du soir ») et « bien reçu, je vous rappelle ce soir » en une seconde. Aujourd'hui l'accusé n'existe que si le projet a un téléphone (`?cree=1`) : or un partage WhatsApp n'en contient presque jamais (`app/api/partage/route.ts` ne reçoit que titre, texte, url). Un partage abandonné reste en base sans jamais reparaître (`schema.sql:1131-1136`) : c'est du tri qui s'accumule.

**Ce qui change.**
- *Supprimé* : la feuille `FeuilleCapture` (3 choix), l'écran « Coller » séparé, le choix de porte, l'impasse « Créer le projet manuellement » (qui repart d'un formulaire vide), le second chemin d'écriture (l'insertion directe de `nouvelle/page.tsx`).
- *Fusionné* : `BrouillonProjet` (6 champs), `CorrespondanceProjetExistant`, `ConfirmationRdv` et la carte « bien reçu » deviennent trois blocs d'un écran. Le crayon ouvre les champs sur place.
- *Ajouté* : l'accusé sans numéro (`wa.me/?text=` et `sms:?body=`, l'artisan choisit le contact) ; une ligne « Reçu · à ranger » dans le bloc existant « À faire de votre côté » ; la lecture IA d'une capture partagée (aujourd'hui « Photo partagée — à compléter »).
- *L'artisan perd* : l'import de plusieurs captures de clients différents d'un coup (`importer-capture` reste en ligne, sans lien) ; le bouton « Dicter » interne (le micro du clavier fait l'affaire, décision d'Axel du 27/09 : le grand micro n'est **pas** remis) ; la revue à 6 champs par défaut.

**Gestes (avant → après).**
| Tâche | Avant | Après |
|---|---|---|
| WhatsApp → partage → rangé → « bien reçu » envoyé, **sans numéro** (cas courant) | 4, **sans accusé** (à la main dans WhatsApp : 4 de plus et de la frappe) | **7** : 3 partage, Ranger, WhatsApp, choisir le contact, Envoyer |
| idem, numéro dans le message | 6 | 6 |
| idem, client déjà connu | 4, l'accusé disparaît | 6, accusé inclus |
| Dictée d'un nouveau projet | 5 + nom tapé | **4** : [+], micro du clavier, « Lire avec l'IA », Ranger (+1 si le micro ne s'arrête pas seul) |
| Repli (IA ou dictée en échec) | 1 + tout retaper, texte perdu | **2** : Client, Ranger ; texte gardé |
| iPhone (coller) | ≈ 10 | ≈ 8 |

Retour au travail : 0 geste de plus, l'artisan est déjà dans WhatsApp. Le cas favorable (6) ne raccourcit pas : B rend le cas courant possible et supprime l'impasse.

**Impact technique.** Nouveau `components/capture/Recu.tsx`, enveloppé par `partage/[id]/page.tsx` (341 → ~60 lignes) et `nouvelle/page.tsx` (558 → ~80). Touchés : `Sidebar.tsx` et `BoutonCapture.tsx` (le [+] navigue au lieu d'ouvrir la feuille ; l'interception de la fiche projet reste), `lib/messagesClient.ts` (numéro absent), `app/dashboard/page.tsx` et `VueAccueil` (une requête, une ligne), `globals.css` (`--barre-bas` remis à 0 quand la barre s'efface, bug déjà relevé), `importer/page.tsx` (redirection). Inchangés : `/api/partage`, `sw.js`, les trois routes ci-dessus. **Aucune migration**, aucune route supprimée, `partages_entrants` reste personnelle (RLS `artisan_id = auth.uid()`). Dépend du duel barre : le [+] reste au centre. Duel A : le coéquipier utilise la même porte, rien de propre au terrain.

**Lots.** (1) Correctifs sans changer d'écran : accusé sans numéro, repli qui garde le texte (écrire le texte partagé dans `compyo_brouillon_nouveau_projet`) : c'est exactement le candidat A. (2) « Reçu » pour le partage seul : on peut s'arrêter ici. (3) Le [+] ouvre « Reçu » vide, `importer` redirige, la feuille sort du chemin. (4) La ligne sur Aujourd'hui et la lecture des captures partagées.

**Auto-évaluation.** Charge mentale 8 · Gestes 6,5 · Lisibilité 8 · Risque 5 · Migration 6 · Cohérence 8, soit ≈ 70/100.
**Faiblesses.**
1. **Un écran à tout faire** : « Reçu » a sept états (arrivée, lecture, proposition, client connu, échec, rangé, RDV) et réécrit le chemin le plus précieux (le partage WhatsApp). Raté, on recrée le formulaire de revue qu'on voulait retirer. D'où le lot 2 isolé.
2. **La perte de l'import multi-captures** et une voix devenue invisible (le micro du clavier, que Gérard doit connaître). S'y ajoutent deux réserves non testées ici : `wa.me/?text=` et `sms:?body=` sans numéro (à vérifier sur Android), et la RLS personnelle (la conjointe ne voit pas les « Reçu » non rangés de Gérard ; l'ouvrir à l'organisation est un changement de sécurité à part).
