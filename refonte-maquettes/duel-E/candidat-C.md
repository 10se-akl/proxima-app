# Candidat C — « Reçu d'abord, rangé ensuite »

**L'approche.** À la capture, Gérard ne décide rien : le message est déjà en base (`partages_entrants`) et l'écran dit « Reçu. » avec un seul bouton plein, « Bien reçu, par WhatsApp ». Compyo prépare le rangement en fond (client connu, projet existant ou nouveau projet) et le pose en **une ligne « Oui » dans le bloc existant « À faire de votre côté »** d'Aujourd'hui, le soir ou au bureau. L'accusé ne dépend plus de la création du projet ni du numéro ; la voix passe par le micro du clavier, dans un champ déjà ouvert.

**La douleur.** « Le besoin n'est pas de répondre à la place de l'artisan. C'est de pouvoir dire en une seconde "bien reçu, je vous rappelle ce soir", pour que le client arrête d'appeler et n'aille pas voir ailleurs. » (recherche, l. 110). L'accusé ne peut pas attendre, le rangement peut ; aujourd'hui on les attache (attente de l'IA, relecture, saisie du téléphone, puis l'accusé s'il apparaît). Si un appel coupe le parcours, **le message reste en base mais aucun écran ne le liste** (vérifié dans le code) : sauvé, mais introuvable.

**Supprimé, fusionné, ajouté.**
- Supprimé du chemin de capture : l'attente de l'IA, la relecture, « Préparer le brouillon », les trois atterrissages différents. Le micro Web Speech reste retiré (91bc744 : « sert à rien et marche pas bien »).
- Fusionné : « Coller un message », « Écrire moi-même » et « Dicter » en **« Écrire ou dicter »** (un champ, clavier ouvert, « Coller » en lien). Partage, collé, voix et captures tombent dans la même boîte, rendue par un bloc existant (pas de sixième bloc).
- Ajouté : l'écran « Reçu », la page `noter`, la ligne « À ranger », deux colonnes nullables.
- Gérard perd : le projet n'existe pas tout de suite (pas de fiche à l'instant) et le brouillon à badges n'est vu qu'en touchant la ligne. « Oui » en un geste seulement si le nom est **explicite** ; sinon « Compléter ».

**Gestes (Android, appli installée).**

| Tâche | Avant | Après |
|---|---|---|
| Capture seule, sans accusé | 4 (3 + « Créer »), après l'attente de l'IA | **3**, sans attente |
| Capture + accusé, numéro dans le texte | 6 | **5** |
| Capture + accusé, numéro absent (cas courant) | aucun accusé proposé ; 8-9 en saisissant le numéro | **6** (… « Bien reçu », choisir la conversation, envoyer) |
| Rangement du projet | inclus (« Créer ») | +1 « Oui », plus tard |
| Dictée d'un nouveau projet | 5 + le nom tapé au clavier | **4**, rien tapé |
| iPhone : collé + accusé | 10-11 | **~10**, sans attente ni relecture |

Jusqu'au projet rangé et à l'accusé envoyé, numéro absent : 8-9 → **7**. C ne raccourcit pas le chemin de l'accusé : il le **dégage**.

**Repli.** « Noter » se garde à chaque frappe (`brouillonLocal`) : « Pas enregistré. Gardé sur ce téléphone. », « Réessayer », texte intact. Si l'IA échoue, la ligne devient « À ranger vous-même » et ouvre `nouvelle` **déjà rempli du message** (le repli vide d'aujourd'hui est corrigé).

**Impact technique.** Migration additive : `partages_entrants.proposition jsonb` et `accuse_le timestamptz` (nulles, RLS inchangée). Fichiers : `partage/[id]/page.tsx` (écran « Reçu », la revue actuelle derrière « Ranger maintenant »), `app/dashboard/page.tsx` + `VueAccueil.tsx` (+1 requête, lignes fusionnées dans `aProduire`), composant `LigneARanger`, `FeuilleCapture.tsx` (3 lignes → 2), page `noter` + petite route d'insertion, `lienMessage` (numéro vide : `sms:?body=`, `wa.me/?text=`), `nouvelle` (préremplissage), une phrase du prompt de `brouillonProjet.ts`. `importer`, `importer-capture`, `nouvelle` restent ; `creer-depuis-brouillon` et `ajouter-note-depuis-partage` sont réutilisés tels quels. Régression : les anciennes lignes orphelines referaient surface d'un coup, donc on n'affiche que celles de moins de 14 jours.

**Lots.** 1) Corrections sûres : numéro vide, repli prérempli, écran « Reçu » (revue derrière). 2) Migration, lignes « À ranger », « Oui ». 3) « Écrire ou dicter » ; les captures d'écran alimentent la même boîte. 4) Selon le duel A : boîte lisible par l'organisation (le bureau de la conjointe) et intégration à « En suspens » de la fermeture de journée.

**Auto-évaluation.** Charge mentale 23/30 · Gestes 15/20 · Lisibilité 16/20 · Risque technique 9/15 · Coût 6/10 · Cohérence 4/5 = **73/100**.

**Deux vraies faiblesses.**
1. **La pile.** « Il n'y ait plus rien à trier le soir » (l. 75) n'est tenu qu'à moitié : il reste un « Oui » par capture, et une boîte qu'on n'ouvre pas laisse un client sans projet ni relance. Un candidat qui range tout de suite, avec un « Oui » sur l'écran d'arrivée, fait 4 gestes et ne laisse aucune pile : si l'IA est rapide, il bat C.
2. **Trois paris non testés sur appareil.** (a) Sans numéro, `wa.me/?text=` doit ouvrir la liste des conversations, la dernière en tête (déduit de la documentation WhatsApp) ; répondre à la main dans le fil coûte autant. (b) L'IA tourne en fond puis à l'ouverture d'Aujourd'hui : squelette possible de quelques secondes. (c) Le bureau de la conjointe ne voit la boîte que si la RLS s'élargit à l'organisation (duel A).
