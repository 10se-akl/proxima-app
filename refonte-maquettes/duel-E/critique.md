# Duel E, critique adverse

Les quatre candidats construisent sur le même fait, jamais observé : un partage WhatsApp n'a pas de numéro. L'inventaire le marque « déduit » (`05-ecrans-coeur.md`, comptage). Tous l'écrivent « cas courant ».

## Ce que le code établit, et ce qu'il laisse ouvert

- **Pas de numéro, pas de client.** Le matcher ne cherche qu'un numéro dans le texte (`api/partage/matcher/route.ts:71-79`). Le nom seul est écarté par décision (`creer-depuis-brouillon/route.ts:93-100`). Sans numéro, le projet n'a pas de `client_id` et s'appelle « Client à identifier » (`:85`). Un client déjà connu n'est donc **jamais** reconnu sur un partage sans numéro, dans les quatre candidats. La feuille « Message au client » redemande aussi le numéro à chaque fois (`FeuilleMessageClient.tsx:202`).
- **`wa.me/?text=` et `sms:?body=` sans numéro.** Le dépôt n'utilise que `wa.me/{n}?text=` (`messagesClient.ts:173`) et `sms:{n}?body=`, « testé sur Samsung » (`:146`). Sans numéro, rien n'a été essayé. À ma connaissance WhatsApp documente `wa.me/?text=` : à confirmer. Reste inconnu : l'ordre de la liste de conversations (C l'affiche « la dernière en tête », B montre M. Dupont en premier : c'est une illustration, pas un fait), le comportement dans une PWA installée (ouverture directe ou page intermédiaire, ce qui ajouterait un geste), et le risque d'un « bien reçu » envoyé au mauvais client, alors qu'avec un numéro le destinataire est exact. Un essai de dix minutes sur un vrai Android avant tout lot.
- **Retrait du micro (91bc744).** Deux causes mêlées : la fiabilité de la dictée du navigateur dans la PWA (message du commit ; `lib/dictee.ts:29-34`, bégaiement d'Android corrigé le jour même, et `:67-81`, permission et réseau) et des choix confus (`FeuilleCapture.tsx:11-17`). Aucun candidat ne les sépare.
- **RLS.** `partages_entrants` est personnelle, par choix écrit (`schema.sql:1121-1130`). Aucune policy du schéma ne lit `memberships.role` (`03-equipe-securite.md:32`). L'élargir à l'organisation donne à tout `employe` la lecture, la modification et la suppression (FOR ALL) des messages bruts du patron. Deux « Oui » concurrents créent un doublon. C'est un changement de sécurité à auditer, pas une ligne de lot.
- **Migrations.** A, B, D : aucune, c'est vrai. C : deux colonnes. B, lui, a besoin d'un matcher modifié (voir plus bas).

## Recompte (appui long, Partager, Compyo = 3 ; saisie de numéro = 2 ; coller = 2 ; Retour = 1)

| Cas | Avant | A | B | C | D |
|---|---|---|---|---|---|
| WhatsApp sans numéro : projet et bien reçu envoyé | ≈ 10 | 7 | 7 | 6 pour l'accusé ; projet rangé : 8 (« Oui », ouvrir Aujourd'hui), si le nom est explicite | **8** (Retour, 2 pour coller) |
| Avec numéro | 6 | 6 | 6 | 5 (+2 pour ranger) | 5 |
| Client connu, numéro dans le texte | 4, sans accusé | 4, **non traité** | 6 | 5 (+2) | 5 |
| Client connu, sans numéro dans le texte | doublon | doublon | doublon | doublon | doublon (lot 3) |
| Dictée jusqu'au projet créé | 5 + nom | 5 + nom | 4 à 5, si le micro du clavier s'arrête et que le clavier s'ouvre seul | 4 + « Oui » + ouvrir = **6** | 5 |
| IA en échec jusqu'au projet créé | tout retaper (≈ +4) | 3 | 2 à 3 | 3 | 1 si « Réessayer » passe, sinon 3 |

Aucun candidat ne passe sous 6 sur le cas courant, sauf C, qui ne crée pas le projet. D, le plus lent, gonfle son « avant » de dictée à « 6-7 » (le brief et les autres disent 5).

## A, ne rien changer

1. **Sérieuse. Le RDV détecté reste sans accusé.** Il mène à `ConfirmationRdv` (`ConfirmationRdv.tsx:158-192`), qui n'ajoute pas `?cree=1`, comme le choix d'un projet connu (`partage/[id]/page.tsx:213`). Les exemples d'A proposent « passer jeudi ». Le « 7 » ne vaut que sans date.
2. **Sérieuse. Le numéro absent devient permanent.** `wa.me/?text=` ne retient rien (A l'admet). Chaque message suivant redemande le numéro, et le client reste introuvable : la charge est déplacée.
3. **Sérieuse. Le repli** écrit sous `compyo_brouillon_nouveau_projet`, clé unique (`nouvelle/page.tsx:167`) : il écrase un brouillon en cours, contre « rien ne se perd ». Il reste 3 gestes (le nom est obligatoire, `:340`), pas 0.
4. **Mineure.** « Dicter » mesure 44 px (`min-h-11`, 48 requis). Le « code mort » `?dictee=1` est encore référencé par `NouveauProjetMenu.tsx:74` (composant jamais importé). `lienMessage` ne doit pas être assoupli : `FeuilleMessageClient` l'utilise pour les relances et la météo, il faut une fonction à part.

## B, une seule porte

1. **Bloquante (non déclarée). `nouvelle` passe de 558 à ~80 lignes et perd :** l'alerte de doublon par nom (`:217-269`), la saisie sans IA, et l'atterrissage des erreurs de partage (`?erreur=…`, `sw.js:250-254`, `api/partage/route.ts:107,133`). L'écran « Reçu » aurait huit états, pas sept.
2. **Sérieuse. Contradiction.** B déclare le matcher « inchangé », mais sa maquette 4 dit « trouvé… par le nom après la lecture ». Ce rapprochement n'existe pas pour les partages (il existe seulement pour les captures, `analyser-captures/route.ts:164-190`). « Client connu : 6 » suppose un numéro.
3. **Sérieuse. Tout projet dépend de l'IA.** Le plafond est de 25 s par tentative, trois tentatives (`lib/ai/client.ts:46`), plus un quota (429). Le « 2 à 4 s » de la maquette n'est mesuré nulle part.
4. **Sérieuse. L'import de plusieurs captures est orphelin.** La capture est pourtant la seule entrée qui porte l'en-tête, donc le numéro (`analyser-captures:32`).
5. **Mineure. Faux sur le code actuel :** le `--barre-bas` est déjà remis à 0 (`globals.css:793-798`, 01/10). La ligne « Reçu · à ranger » entre dans un bloc plafonné à 5 lignes, avec « Voir les N ».

## C, reçu d'abord, rangé ensuite

1. **Bloquante (maquette 9 et lot 4). Le bureau de la conjointe suppose la RLS élargie.** Avant ce lot, elle ne voit rien. Voir plus haut : c'est un changement de sécurité, présenté comme une maquette.
2. **Sérieuse. Double accusé possible.** `suggererMessages` repropose « bien reçu » pendant 24 h tant qu'aucun événement `message_prepare` n'existe (`messagesClient.ts:292`, `VueProjet.tsx:301`). C garde `accuse_le` sur la ligne brute, et `creer-depuis-brouillon` « réutilisé tel quel » ne le copie pas.
3. **Sérieuse. « IA en fond » n'existe pas côté serveur.** La route redirige, sans file ni cron (`schema.sql:1131-1137`). L'IA se lancerait donc à l'ouverture d'Aujourd'hui, l'écran le plus ouvert, pour chaque capture (y compris « Merci »). `proposition jsonb` garde nom, téléphone et adresse sur une ligne brute sans purge. Le filtre de 14 jours masque, il ne purge pas, contre l'intention du Module 24 (`schema.sql:1111-1118`).
4. **Sérieuse. « Oui » en un geste valide une ligne tronquée.** L'en-tête WhatsApp porte l'identité, le texte souvent pas : le « Oui » à un geste est donc le cas minoritaire, sinon « Compléter » (≥ 3).
5. **Sérieuse. Le « 4 gestes » de dictée compare une note gardée à un projet créé.** À projet créé : 6.
6. **Mineure.** « La dernière conversation en tête » est écrit comme un fait (« déduit de la documentation »).

## D, « Reçu » avec « Créer et répondre »

1. **Sérieuse. C'est le plus lent sur le cas courant : 8.** « Retour à la conversation » promet ce que le web ne sait pas faire : rendre la main à WhatsApp. Seul le geste Retour d'Android le fait, et rien ne prouve qu'il revienne dans la bonne conversation. Coller coûte 2 gestes, pas 1. D l'admet en partie (« pas en une seconde »).
2. **Sérieuse. Le micro revient par la porte du fond.** Maquettes 8 et 9 : [+], « Un message », puis « Dicter » en tête. C'est le parcours qu'Axel a jugé inutile, sur une API capricieuse (`dictee.ts:67-81`, erreur `network` en 4G faible). Le « gain » (l'IA extrait le nom) fait entrer un nom mal compris sans frappe de vérification. D extrait aussi `useDictee.ts` d'un code qui marche.
3. **Sérieuse. « Créer et répondre » fait deux choses, avec une ouverture de messagerie après une écriture réseau.** Le repli est un bouton à l'écran suivant : D le reconnaît.
4. **Sérieuse. Pertes déclarées** : formulaire sans IA, alerte de doublon par nom (jusqu'au lot 3). La maquette 12 (IA en échec) montre « Client : Mme Fabre » prérempli alors que la lecture a échoué : en vrai, le champ serait vide, donc « Client à identifier ».
5. **Mineure.** Reçu contourne la fiche. Le « bien reçu dans Maintenant » décidé au duel D ne sert plus au partage. Seul A s'y raccorde.

## Affirmations vérifiées

- **A** : carte exigeant un téléphone, vrai (`VueProjet.tsx:301`) ; capture sans `?cree=1`, route qui renvoie `projetId`, vrai (`importer-capture/page.tsx:289`, `confirmer-import-captures/route.ts:142,176`) ; repli vide, vrai (`partage/[id]:324`) ; « seul inconnu : wa.me », faux (voir 1 et 2).
- **B** : routes à texte seul, vrai ; partage abandonné jamais listé, vrai ; `--barre-bas`, périmé ; matcher inchangé, contradictoire.
- **C** : message introuvable, vrai ; `lib/brouillonLocal.ts`, existe ; « tels quels », vrai mais l'accusé n'est pas tracé.
- **D** : `router.replace` à cause de `partage_vide`, vrai (`:140,256`, `creer:154-156`) ; RLS personnelle et organisation côté serveur, vrai (`partage/route.ts:38`) ; « avant » de dictée à 6-7, faux.

## Ce qu'aucun candidat ne traite

1. **L'identité de l'expéditeur.** Nom et numéro sont dans l'en-tête WhatsApp, pas dans le texte partagé. Les quatre construisent autour de ce trou. Personne n'envisage de saisir le numéro une fois sur la fiche, ni d'exploiter la capture d'écran qui, elle, porte l'en-tête.
2. **La conjointe le soir sur ordinateur.** Sans RLS élargie, rien de ce que Gérard capte ne lui arrive. Seul C y pense, et seulement au lot 4.
3. **Aucune mesure.** Ni fréquence du « sans numéro », ni latence réelle de l'IA, ni test `wa.me` et `sms:` sur appareil. Premier test avant l'arbitrage : un vrai partage depuis WhatsApp sur un Android.
4. **Plusieurs messages en rafale**, et la file pendant un appel, quand l'IA met plusieurs secondes.
5. **L'artisan seul**, le cas le plus fréquent : A le sert avec le moins de risque, B et D avec une seule porte, C par une pile qu'il doit vider lui-même.
