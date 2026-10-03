# Duel E — Arbitrage : la capture

> Juge. J'ai lu le protocole, les consignes, le brief (poids standard), `docs/langage-interface.md`, les quatre candidats, deux rendus (A, B) et la critique, dont je reprends les vérifications. J'ai revérifié ce qui décide (code au 03/10). Décisions amont : duel D (« Bien reçu » devient l'action de Maintenant après `?cree=1`) et duel A (la RLS de `partages_entrants` reste personnelle sans duel de sécurité).

## La décision en bref

1. **Vainqueur : A, « réparer le parcours actuel », 62/100.** Suivent B (61), D (54) et C (52,5).
2. **Trois greffes.** De B : le repli sur place, déjà rempli du message. De B encore : la ligne « Reçu » pour un partage abandonné. De D : « Bien reçu » après **tout** message reçu (RDV détecté, projet existant).
3. **Un seul atterrissage, la fiche**, où le duel D a mis « Bien reçu ». Aucun écran neuf, aucune migration, aucune notification.
4. **Le « bien reçu » sans numéro attend le test T1** sur un vrai Android (§5). Aucun lot ne repose avant sur `wa.me/?text=` ni sur l'ordre des conversations.
5. **La feuille [+] et la dictée ne bougent pas** : elles ont été décidées le 27/09.

## 1. Les notes

| Critère (poids) | A | B | C | D |
|---|---|---|---|---|
| Charge mentale (30) | 5 | 6,5 | 5 | 5,5 |
| Gestes (20) | 5 | 6,5 | 6 | 5 |
| Lisibilité 360 px (20) | 5 | 7,5 | 7,5 | 7,5 |
| Risque (15) | 9 | 4 | 3 | 4 |
| Coût (10) | 10 | 5 | 4 | 5 |
| Cohérence (5) | 7 | 5 | 4 | 3 |
| **Total** | **62** | **61** | **52,5** | **54** |

- **A.**
  - Charge : la revue à six champs et trois atterrissages restent, et le partage abandonné reste invisible.
  - Gestes : 7 sans numéro et 6 avec. Mais son propre exemple (« passer jeudi ? ») mène à `ConfirmationRdv`, sans accusé (`ConfirmationRdv.tsx:158`).
  - Lisibilité : la page de partage est hors du langage (`Card`, roue, `text-ink/60` et erreur en `text-signal`, `partage/[id]/page.tsx:309-323`).
  - Risque et coût : quatre fichiers, et un seul pari, le lien sans numéro.
  - Cohérence : seul à atterrir sur la fiche du duel D.
- **B.**
  - Charge : un atterrissage et l'accusé dès l'arrivée, mais un écran à huit états.
  - Gestes : 7, 6, 6 pour le client connu, 4 à 5 pour la dictée.
  - Lisibilité : dessiné selon le langage.
  - Risque : réécrit le chemin le plus précieux. `nouvelle` perd l'alerte de doublon (`:217-269`) et l'atterrissage des erreurs (`api/partage/route.ts:107,133`). Le rapprochement par nom qu'il dessine n'existe pas.
  - Cohérence : contourne la fiche du duel D.
- **C.**
  - Charge : rien à décider sur le moment, mais une pile que seul Gérard voit, et « Oui » en un geste seulement si le nom est explicite.
  - Gestes : accusé en 6, mais projet rangé en 8 et dictée en 6.
  - Risque : une migration, l'IA lancée à l'ouverture d'Aujourd'hui, un double accusé possible (`messagesClient.ts:292`), et le brut gardé, contre le Module 24 (`schema.sql:1105-1110`).
- **D.**
  - Charge : un plein qui fait deux choses, et « Retour à la conversation » est une promesse que le web ne tient pas.
  - Gestes : 8 sur le cas courant.
  - Risque : WhatsApp s'ouvre après une écriture réseau, et le navigateur peut bloquer cette ouverture.
  - Cohérence : remet « Dicter » en tête, contre le 27/09.

**Pourquoi A plutôt que B, à un point près.** Avec les greffes, A obtient l'essentiel de B (un atterrissage, un repli sans perte, un message abandonné qui revient) sans réécrire ni le partage ni `nouvelle`. Sur le cas courant, les deux font 7 gestes, et sur le même lien non testé. La réécriture de B n'achète qu'un geste de dictée et la fin d'une feuille que le fondateur vient de refaire.

## 2. Les greffes et les corrections

- **G1 (B, maquette 8) : le repli sur place.**
  - Si l'IA échoue, la page de partage montre la même revue (`BrouillonProjetForm`), déjà remplie : message d'origine (`texteOrigine`, affiché à `BrouillonProjet.tsx:206`), téléphone trouvé par `extraireTelephone`, nom vide.
  - « Créer le projet » reste le plein et n'est jamais bloqué (« Client à identifier », `creer-depuis-brouillon:85`). « Réessayer » est en contour.
  - C'est déjà le cas de la photo seule (`partage/[id]/page.tsx:150-163`).
  - Cette greffe remplace le lot 3 de A, qui écrivait sous la clé unique `compyo_brouillon_nouveau_projet` et écrasait un brouillon en cours.
- **G2 (B, maquette 9) : le partage abandonné revient.** Voir §4.
- **G3 (D, lot 1) : « Bien reçu » après tout message reçu.**
  - Un RDV confirmé atterrit sur la fiche (`?cree=1`) au lieu du planning (`ConfirmationRdv.tsx:158,163`).
  - « Ajouter à ce projet » (`partage/[id]/page.tsx:213`, `importer/page.tsx:152`) ouvre la fiche avec `?recu=1`. « Bien reçu » s'y montre une fois, même si le client a déjà été contacté.
- **Corrections imposées.**
  - `router.replace` dans tout le parcours : aujourd'hui, « Retour » rouvre un partage supprimé (`:140`).
  - Une fonction `lienMessageSansNumero` à part. `lienMessage` reste stricte, parce que les relances et la météo l'utilisent.
  - Une capture unique ouvre sa fiche (`?cree=1`), plus la liste (`importer-capture/page.tsx:289`).
  - « Dicter » passe à 48 px.
  - Tout écran touché suit le langage : squelette, bloc sans ombre, erreur en `signal-fonce`.

## 3. Les parcours finals, en gestes

Le partage compte pour 3 gestes : appui long, Partager, Compyo. Après l'accusé, Gérard est déjà dans WhatsApp : il retourne au travail sans geste de plus.

| Parcours | Après | Avant |
|---|---|---|
| **Numéro dans le message.** 1-3 partage, revue (squelette), 4 « Créer le projet », fiche, 5 « WhatsApp » dans Maintenant, 6 Envoyer | **6** | 6 |
| **Sans numéro** (lot 4, si T1 passe). 1-3, 4 Créer, 5 WhatsApp, 6 choisir la conversation, 7 Envoyer | **7** | 4 sans accusé ; ≈ 10 avec |
| **Avec RDV** (« passer jeudi »). … 4 Créer, 5 « Ajouter au planning », fiche, 6 WhatsApp, 7 Envoyer (+1 sans numéro) | **7 ou 8** | 5 sans accusé |
| **Client connu** (numéro dans le texte, `matcher:71-79`). 1-3, 4 « Ajouter à ce projet », fiche `?recu=1`, 5 WhatsApp, 6 Envoyer | **6** | 4 sans accusé |
| **Client connu sans numéro**. Il n'est pas reconnu et devient « Client à identifier » | doublon | doublon |
| **Dictée d'un nouveau projet** : [+], « Écrire moi-même », « Dicter », parler, nom tapé, Créer | 5 + nom | 5 + nom |
| **L'IA échoue** (G1) : « Créer le projet » sur la revue remplie | **1** | texte à retaper (≈ +4) |
| **La dictée échoue** (`network`, `dictee.ts:67-81`) : le texte dicté reste dans la clé locale, et le micro du clavier prend le relais | rien de perdu | idem |

- **Le client connu sans numéro** reste un trou commun aux cinq versions. Le rapprochement par nom a été refusé par écrit (`creer-depuis-brouillon:93-100`).
- **Le coéquipier (duel A)** passe par la même porte. Son projet appartient à l'organisation. Son partage abandonné n'est visible que de lui.

## 4. Le partage abandonné

Aujourd'hui, si un appel coupe le parcours, la ligne reste en base (seule la création la supprime). Aucun écran ne la liste et aucune purge ne passe (`schema.sql:1131-1137`) : le message est sauvé, mais introuvable.

- **La ligne.** Chaque partage non rangé de moins de 7 jours devient une ligne de « À faire de votre côté » (`VueAccueil.tsx:96-98`).
  - Elle montre « Reçu », l'heure et l'aperçu en `truncate`.
  - Elle passe en tête, pour rester parmi les 5 lignes visibles.
  - Toucher la ligne rouvre `partage/[id]`, qui relance la recherche du client et l'IA.
- **Le seul compte qui a capté la voit.** La RLS ne change pas.
  - La conjointe voit les projets une fois créés, jamais les messages bruts.
  - Élargir la RLS donnerait à un `employe` le droit de lire, modifier et supprimer les messages du patron. C'est un duel de sécurité.
- **Pas une notification.** Une ligne dans un bloc existant, sans push ni badge. Elle empêche « Tout est réglé » (`app/dashboard/page.tsx:455-462`), et c'est juste.
- **Après 7 jours**, la ligne est masquée, pas supprimée. Pas de migration.

## 5. Les lots, dans l'ordre

1. **Rien ne se perd.** Aucun test d'appareil n'est requis.
   - Ce que fait le lot : G1, `router.replace`, la capture unique vers la fiche, « Dicter » à 48 px, le langage sur la page de partage.
   - Fichiers : `partage/[id]/page.tsx`, `importer-capture/page.tsx`, `nouvelle/page.tsx` (une classe).
   - Risques : la photo seule doit garder son brouillon vierge ; `?erreur=partage_vide` doit toujours atterrir sur `nouvelle`.
2. **Le message abandonné revient** (G2).
   - Fichiers : `app/dashboard/page.tsx` (une requête), `VueAccueil.tsx`, le banc `apercu-moins`.
   - Risques : de vieux partages qui remontent d'un coup (d'où les 7 jours) ; le plafond de 5 lignes.
3. **« Bien reçu » après tout message reçu, numéro connu** (G3).
   - Fichiers : `ConfirmationRdv.tsx`, `partage/[id]/page.tsx`, `importer/page.tsx`, `VueProjet.tsx:301`, ou `prochaineAction.ts` si le lot 3 du duel D est passé.
   - Risques : un double accusé (la préparation est tracée) ; le RDV doit rester une proposition.
4. **« Bien reçu » sans numéro.** **Bloqué jusqu'à T1.**
   - Fichiers : `messagesClient.ts`, `VueProjet.tsx` (la condition de téléphone tombe).
   - Risque : le mauvais destinataire.

**Le test T1**, avant le lot 4. Deux Android d'entrée de gamme (Android 11 à 14, Chrome et Samsung Internet), la PWA installée, en 4G.
- (a) Depuis la PWA, `wa.me/?text=…` ouvre-t-il « Envoyer à… » de WhatsApp sans page intermédiaire ?
- (b) La conversation qu'on vient de quitter est-elle **en tête** ? Refaire l'essai après avoir écrit à quelqu'un d'autre.
- (c) `sms:?body=…` ouvre-t-il un message neuf, avec le texte et sans destinataire ?
- (d) Que contient un partage WhatsApp (`titre`, `texte`, `url`) ? Y trouve-t-on un nom ou un numéro ? Et que contient le collage de deux messages copiés ?
- (e) `navigator.share({ text })` propose-t-il la dernière conversation parmi les cibles directes ?

**Après T1.**
- Si (a) et (b) passent, le lot 4 utilise `wa.me`.
- Sinon, si (e) passe, il utilise `navigator.share`, avec un geste de plus.
- Sinon, le lot 4 n'est pas fait.
- Le point (d) mesure enfin la fréquence du cas « sans numéro ».

## 6. La dissidence contre A

- **B.** Les trois portes de la feuille [+] et les six champs de la revue restent. Gérard décide encore pendant le travail.
- **C.** L'accusé attend l'IA, jusqu'à 35 s (`lib/ai/client.ts:44-45`), et le client attend avec lui.
- **D.** La dictée garde le nom tapé avec des gants.
- **La critique.** L'accusé devient possible, mais le client reste anonyme : chaque relance redemandera son numéro (`FeuilleMessageClient.tsx:202`). L'en-tête WhatsApp porte son identité, et personne ne l'exploite.

## 7. Ce qui me ferait changer d'avis

- **T1 (d) trouve un nom ou un numéro dans le partage** : le cas sans numéro devient rare, et le lot 4 recule.
- **Une IA à moins de 3 s** (médiane mesurée en 4G sur 50 partages) : l'écran « Reçu » de B mérite sa réécriture.
- **Plus de deux lignes « Reçu » par semaine et par artisan** après le lot 2 : la capture est trop lente, et le modèle de C mérite un lot.
- **Des testeurs qui hésitent encore** entre les trois lignes du [+] : je fusionne « Coller » et « Écrire » (C, D).
- **Des captures d'écran qui portent le numéro** (contact non enregistré) : la lecture IA des captures partagées (B) passe en lot.

## 8. Ce que le fondateur tranche (hors code)

1. **Le texte de l'accusé.** « Je vous rappelle ce soir » engage Gérard.
2. **Le bouton plein de l'accusé** : WhatsApp ou SMS.
3. **La purge au-delà de 7 jours, et un « Effacer ce message ? »** sur la ligne. Par défaut : ni l'un ni l'autre.
4. **Le mot de la ligne** : « Reçu » ou « Message à ranger ».
5. **Le risque du mauvais destinataire** sans numéro, une fois T1 passé.
