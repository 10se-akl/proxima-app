# Duel E, candidat A : ne rien changer, réparer ce qui est cassé

**L'approche.** Le parcours existe déjà et il est le bon : partage Android, revue du brouillon, fiche, carte « Répondre bien reçu ». On ne dessine rien de neuf. On répare trois défauts réels : la carte « bien reçu » disparaît quand le partage n'a pas de numéro (le cas courant), elle n'existe pas après « Photo ou capture », et le repli manuel repart d'un formulaire vide. Le grand micro reste retiré : Axel l'a décidé le 27/09 (91bc744, « sert à rien et marche pas bien »).

**La douleur.** « Le besoin n'est pas de répondre à la place de l'artisan. C'est de pouvoir dire en une seconde "bien reçu, je vous rappelle ce soir". » La recherche prévient aussi : les devis dictés « doivent être vérifiés point par point », donc « aucun gain de temps ». Le micro n'a pas à revenir.

**Supprimé, fusionné, ajouté, perdu.**
- Supprimé : le code mort `?dictee=1` de `nouvelle/page.tsx:324-333` et son commentaire. Rien de visible.
- Ajouté : trois corrections, aucun écran. La carte « bien reçu » s'affiche aussi sans numéro. Elle ouvre alors la messagerie sans destinataire (`wa.me/?text=…`, `sms:?body=…`) : Gérard choisit la conversation, celle d'où il vient est en tête. Après une seule capture importée, on ouvre la fiche avec `?cree=1`. Le repli « Créer le projet manuellement » reprend le texte partagé.
- Perdu : sans numéro, Compyo ne retient pas le numéro quand on choisit la conversation dans WhatsApp. Rien d'autre.
- Coéquipier de terrain (duel A, espace partagé) : inchangé, le projet naît dans l'organisation.

**Les gestes** (une saisie de numéro compte pour 2).

| Tâche | Avant | Après |
|---|---|---|
| WhatsApp → partage → projet → bien reçu envoyé, sans numéro | 4 sans accusé, ≈ 10 avec | **7** |
| Le même, numéro présent | 6 | 6 |
| Capture d'écran → projet → bien reçu | 5 sans accusé, ≈ 13 avec | **8** |
| Dictée d'un nouveau projet | 5 + le nom tapé | 5 + le nom tapé |
| IA en échec après partage : reprendre à la main | retaper tout, retourner dans WhatsApp (+4) | 0 |

**Impact technique.** Fichiers : `components/projet/VueProjet.tsx` (la condition de la carte), `lib/messagesClient.ts` (`lienMessage` accepte un numéro vide), `app/dashboard/demandes/importer-capture/page.tsx` (`router.push` si `nbReussis === 1`, la route renvoie déjà `projetId`), `partage/[id]/page.tsx` (garder le texte, l'écrire sous la clé locale `compyo_brouillon_nouveau_projet` que `nouvelle` relit déjà). Aucune migration, aucune route, aucune dépendance. Régression : faible. Seul inconnu : `wa.me/?text=` et `sms:?body=` sans numéro, à essayer sur un vrai Android.

**Lots.**
1. Carte « bien reçu » sans numéro (une condition, un lien). Se vérifie sur `/apercu-moins`.
2. Après une capture unique : la fiche, la carte.
3. Repli qui garde le texte, et retrait du code mort.
Chaque lot se livre seul, en une demi-journée.

**Auto-évaluation** (sur 100, honnête).
- Charge mentale 15/30 · Gestes 8/20 · Lisibilité 360 px 10/20 · Risque 14/15 · Coût 10/10 · Cohérence 4/5 : **≈ 61**.
- Faiblesse 1 : A ne raccourcit pas le geste le plus fréquent. 7 gestes, contre environ 4 avec un écran « Reçu » unique. Les trois atterrissages restent (fiche, planning, liste). C'est la raison d'être du duel, et A l'esquive.
- Faiblesse 2 : « le soir, rien à trier » n'est pas traité. Un partage abandonné pendant l'analyse reste en base (`partages_entrants`) mais n'est listé nulle part. La revue garde ses six champs. Les écrans de capture restent hors de `langage-interface.md` (cartes à ombre, texte à 60 %, deux lignes).
- Ce que A défend : la plus petite surface de risque, un gain réel dès demain, et aucun pari sur une dictée que le fondateur a déjà jugée instable.
