# Rapport de la refonte : où on en est

*Branche `refonte-app`, partie de `master` (`f8d263b`). Rien n'est poussé. Pour suivre, quatre documents :*
- *[`etat-des-lieux-refonte.md`](etat-des-lieux-refonte.md) : l'avant, écran par écran ;*
- *[`decisions-refonte.md`](decisions-refonte.md) : les 8 duels, leurs vainqueurs et leurs dissidences ;*
- *[`langage-interface.md`](langage-interface.md) : les 18 règles d'écran ;*
- *[`point-arret-equipe-navigation.md`](point-arret-equipe-navigation.md) : ce que je dois faire valider.*

## En une phrase

Les 8 duels sont tranchés. J'ai livré les lots qui ne demandaient ni ta validation ni un test sur téléphone. L'équipe (duel A) et la navigation (duel B) attendent ta réponse, comme convenu.

---

## 1. Ce qui a été livré, lot par lot

| Commit | Lot | Ce qui change pour l'artisan | Douleur traitée |
|---|---|---|---|
| `1995ce2` | Sécurité (correctif) | Le plafond d'appels IA s'applique enfin : avant, le compteur valait toujours 0. Une invitation ne peut plus être détournée par un compte qui écrit l'adresse invitée dans son propre profil. | Confiance |
| `7e51a30` | Accessibilité (correctif) | Les cibles tactiles et l'anti-zoom iOS ne sautent plus quand « Réduire les animations » est activé. | Gants, soleil |
| `b5fb100` | Téléphone (correctif) | Pendant la saisie, « Valider ce devis » se pose sur le clavier au lieu de flotter 72 px au-dessus. | Gestes |
| `f0f8a31` | Langage, lots 1 et 2 | Cibles de 48 px partout. Squelettes à la vraie forme des écrans. Une erreur d'écran garde la navigation. Bandeau « Pas de réseau. ». Une replanification ratée ne disparaît plus. | Rien ne se perd |
| `ac10567` | Aujourd'hui, lot 1 | Le bon jour (heure de Paris), « Relire le devis » ouvre le devis, plus de rendez-vous en double, « À confirmer » plafonné à 5, l'accueil se recalcule au retour dans l'application. | Journée qui ne se ferme jamais |
| `6a2f1c0` | Aujourd'hui, lot 2 | Plus aucun rendez-vous client déplacé en silence : la feuille « Déplacer » (demain même heure déjà rempli), puis le message au client avec la nouvelle date. | Silence avec le client |
| `a30f12d` | Aujourd'hui, lot 3 | « Chantier terminé ? » ne vient plus après un simple métré. « Pas encore » s'écrit en base, et la question ne revient plus chaque jour. | Charge mentale |
| `06da4b5` | Fiche projet, lot 1 (première partie) | Une question avant « Terminer le chantier » et avant de créer une facture numérotée. L'avoir sans `window.confirm`. Le mémo gardé sur le téléphone à chaque frappe. | Rien ne se perd, peur de mal faire |
| `147f1ec` | Devis, lot 1 | « Envoyer par WhatsApp » fige le devis puis ouvre le message au numéro du client, lien prêt : de 7 gestes à 3. Une question si une mention obligatoire manque. Les paramètres sont relus avant le gel. Les libellés disent vrai (« Noté envoyé », « Sans réponse · 5 j », « Pas parti ? Rouvrir »). | Devis, conformité |
| `35f8818` | Message au client | Le message de décalage montre la nouvelle date avant d'envoyer. | Silence avec le client |
| `5751661` | Capture, lot 1 | Si l'IA échoue, la revue reste déjà remplie du message (avant, il était perdu). Une seule capture d'écran ouvre sa fiche. « Retour » ne rouvre plus un partage traité. | Information éparpillée |
| `9ed8716` | Planning, lot 1 | Déplacer, annuler ou modifier un rendez-vous client propose toujours de prévenir le client. « Annuler » pose une question. | Silence avec le client |

Les autres commits ne contiennent que des documents : inventaires, briefs, maquettes, critiques, arbitrages.

**Vérifications.**
- **`npx tsc --noEmit`** : sans erreur.
- **`npm run build`** : la compilation passe. La génération échoue ensuite sur deux images, `/icon` et `/opengraph-image`, dans `@vercel/og`. **Le même échec existe sur `master`** : je l'ai vérifié en construisant `master` dans une copie de travail séparée. Il vient de l'environnement local (Node 24.18 avec Next 14.2.5), pas de cette branche. Vercel, qui tourne sous Node 20 ou 22, ne devrait pas le voir. À confirmer sur la prévisualisation.
- **`npm run lint`** : impossible à lancer. ESLint n'est ni configuré ni installé dans le dépôt, et l'installer serait une dépendance nouvelle.

**Captures.**
- Dossiers : `refonte-maquettes/captures/avant/` et `…/apres/`, avec les 30 écrans du banc d'aperçu, à 360, 390 et 1440 px, en clair et en sombre. Elles sont prises par `refonte-maquettes/outils/captures.mjs` (Edge sans fenêtre, aucune dépendance) et ne sont pas versionnées.
- Les feuilles nouvelles (Déplacer, Annuler, Envoyer par WhatsApp) ont été vérifiées dans le navigateur à 390 px. Je n'ai jamais cliqué sur une action qui écrit : le banc est branché sur la base de production.

---

## 2. Avant / après

**Ce qui est mesuré.** C'est l'état réellement livré sur la branche. La colonne « Cible » est ce que donnent les décisions une fois tous les lots livrés.

| Mesure | Avant | Après (livré) | Cible | Si rien ne bouge, pourquoi |
|---|---|---|---|---|
| Destinations de navigation sur téléphone | 10 | 10 | **4** dans la barre (Aujourd'hui, Projets, Planning, Argent), et 3 pages rares derrière l'avatar | Duel B en attente de ta validation |
| Blocs sur Aujourd'hui, jour chargé | 6, « À confirmer » sans plafond | 6, plafonnés à 5 lignes | **5** (en-tête et 4 blocs) | Lot 4 du duel C (la structure) pas encore livré |
| Mots sur Aujourd'hui, jour chargé | ≈ 170, ≈ 230 le soir | ≈ 170, ≈ 230 | ≈ 150, et le soir sans le bilan chiffré | Idem |
| Gestes pour dicter un nouveau projet | 5 + le nom tapé | 5 + le nom tapé | 5 + le nom tapé | Le duel E a gardé ce parcours, et le micro ne revient pas (décision du 27/09). Le gain de dictée est sur la fiche (5 → 3), au lot 2 du duel D, après le test Android |
| Gestes pour valider et envoyer un devis | 6 (8 depuis Aujourd'hui) | **3 (4)** | 1 (lot 3 du duel F) | — |
| Écrans distincts | 18 routes | 18 routes | 18 routes, plus Argent | Aucune route ajoutée ni retirée. Les ajouts sont des feuilles |
| Champs obligatoires (inscription, première utilisation, premier devis conforme) | 8 / 0 / 12 | 8 / 0 / 12 | Inchangé | Hors des duels : la demande d'accès est hors refonte. La question avant envoi rattrape les 12 au bon moment |
| Endroits où l'on gère l'équipe | 2 | 2 | **1** (Paramètres › Équipe) | Lot 3 du duel A, en attente de validation |

**Les huit parcours chronométrés** (appuis dans Compyo, plus ceux dans WhatsApp ou les SMS quand le message part) :

| Parcours | Avant | Après (livré) | Note |
|---|---|---|---|
| (a) 8 h 10, voir la journée | 1 (2 pour l'itinéraire) | 1 (2) | L'accueil se recalcule s'il était resté ouvert depuis la veille. « Y aller » en 1 geste arrive au lot 4 du duel C |
| (b) 10 h 30, demande WhatsApp, capter et accuser réception | 6 avec numéro ; impossible sans numéro | 6 ; toujours impossible sans numéro | Bloqué jusqu'au test T1 sur un vrai Android (duel E). Si l'IA échoue : avant, le message était perdu ; maintenant, 1 geste pour créer quand même |
| (c) Créer un devis, le vérifier, l'envoyer | 6 + 1 glissement (8 depuis Aujourd'hui) | **3 (4)** | Valider, Envoyer par WhatsApp, Envoyer dans WhatsApp |
| (d) 14 h, prévenir d'un retard | 4 | 4 | Déjà bon (fiche, Message, SMS, Envoyer) |
| (e) 18 h 45, fermer la journée (un rendez-vous client raté) | 1, **sans prévenir** (≈ 6 pour prévenir) | **4, client prévenu** | Déplacer, Déplacer, SMS, Envoyer |
| (f) Le coéquipier ajoute une note et 3 photos | Note 4, photos 7 | Note 4, photos 7 | Lot 2 du duel D (bande Photo · Dicter · Note : photo 5 → 3) après le test Android. Le prénom de l'auteur arrive avec le lot 4 du duel A |
| (g) Le propriétaire invite quelqu'un depuis son téléphone | 4 appuis + 2 saisies | Inchangé | Duel A en attente |
| (h) La conjointe, le soir sur ordinateur, transforme ce que le terrain a capté en facture | 3 + défilement | 4 + défilement | **+1 voulu** : « Facture de solde : 5 075,00 € ? », parce qu'une facture numérotée est définitive. La page Argent (duel B) en fera 1 clic pour la trouver |

---

## 3. Ce qui a été retiré de l'usage (aucune donnée ni route supprimée)

| Retiré | Pourquoi | Ce que l'artisan perd |
|---|---|---|
| Le petit formulaire de replanification dans « À confirmer » | Remplacé par la feuille « Déplacer », qui propose de prévenir le client | Rien |
| Le « Plus tard » sur « Chantier terminé ? », gardé dans le navigateur | Remplacé par « Pas encore », écrit en base | Rien. La question ne revient plus à tort |
| `window.confirm` pour l'avoir et pour la suppression d'un rendez-vous sur téléphone | Remplacés par des feuilles qui disent ce qui va se passer | Rien |
| « Supprimer » dans la feuille d'un rendez-vous sur téléphone | « Annuler » suffit sur le chantier (arbitrage du duel G) | La suppression rapide depuis le téléphone. Elle reste sur la grille de l'ordinateur |
| Le bouton « Envoyer au client », qui n'envoyait rien | Remplacé par « Envoyer par WhatsApp / Par SMS » | Rien. « Le noter comme envoyé », le partage et la copie du lien restent |
| Le paragraphe de 11 px sur « Prêt à partir » | Règle 2 du langage (une ligne) | Rien |

---

## 4. Les migrations : écrites dans les arbitrages, **pas encore en fichiers**

Je n'ai écrit **aucun fichier de migration**. Toutes appartiennent au duel A, que tu dois valider avant que je les écrive. Une seule exception : le Module 53, qui dépend de ta décision « pour qui » au duel G. Le contenu, les retours arrière et les vérifications sont rédigés dans `refonte-maquettes/duel-A/arbitrage.md` § 4.

**Avant tout (G1 à G5).**
- Une sauvegarde, et une copie de la base pour les tests.
- Vérifier que la base correspond bien à `schema.sql`.
- Prendre un instantané des policies.
- Relever les noms réels des clés étrangères.
- Vérifier les droits d'exécution que Supabase accorde par défaut à `anon`.

**L'ordre de passage.**

| # | Temps | Contenu | Retour arrière |
|---|---|---|---|
| 45 | 1 (ajoute seulement) | Les fonctions exposées sont fermées à `anon` (numérotation des factures, thème), `est_proprietaire()`, contrainte de rôle `not valid` | Remettre le corps d'origine et les droits |
| 46 | 1 | Un devis envoyé ne repasse plus en brouillon, `signature_*` est figée, l'IBAN et le BIC sont recopiés par la base dans les documents | Remettre la version 42c du verrou, retirer les triggers |
| 47 | 1 | Les nouveaux fichiers sont rangés par entreprise, les anciens rattachés par une table figée (**aucun fichier déplacé**) | Avant le code : tout retirer. Après : garder la policy des nouveaux chemins |
| 48 | 1 | `anciens_membres`, purge des notifications au retrait, auteur forcé à `auth.uid()` | Retirer les triggers |
| 49 | 1 | Table `invitations` (invitation à accepter) | `drop table` |
| 50 | 2 (resserre) | Fin de l'ancien accès aux fichiers `{uid}/…`, limites de taille et de type. **Au moins 2 semaines après la 47** | Recréer les deux policies |
| 51 | 2 | Plus aucune suppression en cascade ni suppression de projet, devis ou facture ; le journal en ajout seul | Recréer les policies et les cascades |
| 52 | 2 | IBAN réservé au propriétaire, notifications par personne, signature publique fermée en direct | Recréer les policies et les droits |
| 53 | Optionnelle (duel G) | Colonne « pour qui » et chevauchement par personne. **Non retenue** sauf si tu dis oui | Rédigée dans `duel-G/arbitrage.md` ; le retour arrière peut échouer si des chevauchements existent déjà |

**Le déploiement en deux temps.**
- **Temps 1 (45 à 49) :** chaque migration ne fait qu'ajouter, l'application actuelle continue de marcher.
- **Temps 2 (50 à 52) :** chaque migration ne passe qu'après son code, une à la fois, avec la matrice d'isolation rejouée sur la copie.

**La matrice d'isolation.**
- Son esquisse complète est dans `duel-A/arbitrage.md` § 5 : tables × {autre entreprise, employé, membre retiré} × {lire, écrire, supprimer}, plus le stockage, les fonctions, le test des visiteurs anonymes et le test « canari ».
- Elle deviendra `supabase/tests/isolation.sql` (lot 0 du duel A) dès ta validation. **Elle n'est pas encore écrite en SQL.**

---

## 5. Les idées écartées (une ligne chacune)

- **Rôle « terrain » qui cache les prix en base** (duel A) : environ 40 fichiers sans un seul test, et une faille de la même classe que F2 rouverte. On le reconsidère si deux artisans sur cinq le demandent.
- **Accès anonyme « porte de chantier » pour l'apprenti** (duel A) : cinq fonctions ouvertes aux visiteurs anonymes, et un lien qui n'expire jamais.
- **Plafond à deux personnes** (duel A) : il exclut le trio Gérard, l'apprenti et l'épouse.
- **Plusieurs entreprises pour un même compte, et accès de l'expert-comptable** (duel A) : 49 fichiers supposent une seule entreprise, et l'export comptable existe déjà.
- **Lien d'invitation sans e-mail** (duels A et E) : un WhatsApp transféré ferait entrer n'importe qui.
- **Planning hors de la barre, et page « Bureau »** (duel B) : on perd l'habitude, la météo et « Prévenir ».
- **Une seule liste de 7 lignes sur l'accueil** (duel C) : sans « Demain » ni « Non », on ne ferme la journée qu'en cochant « Fait » à tort.
- **Un accueil qui change selon l'heure** (duel C) : il repose sur un « chantier en cours » deviné, et la PWA ne se recalcule pas.
- **« Noter pour demain »** (duel C) : coûts non chiffrés.
- **Le Carnet ouvert par défaut** (duel D) : la décision du 27/09 est maintenue. À confirmer par toi.
- **Une fiche différente selon l'étape** (duel D) : l'ordre ne se mémorise plus.
- **Un écran unique « Reçu » pour toute la capture** (duel E) : il réécrit le partage WhatsApp, le chemin le plus précieux.
- **Le grand micro « Parler »** (duel E) : retiré par toi le 27/09, je ne le remets pas.
- **Ranger tout seul et faire valider le soir** (duel E) : l'accusé de réception attendrait l'IA, jusqu'à 35 s.
- **Le devis en cartes une par une** (duel F) : peu de gain, et deux parcours à maintenir.
- **« Envoyé » seulement après « Oui, parti »** (duel F) : le lien de signature resterait mort.
- **Le chevauchement par créateur ou par chantier** (duel G) : l'artisan seul ou le couple perdent leur protection.
- **Le glisser-déposer dans le planning** (duel G).
- **Un huitième modèle de message pour l'annulation** (duel G) : il y a déjà la limite de 7.
- **Un script de contrôle du langage au build** (duel H) : pas de CI, il bloquerait un correctif urgent.
- **Deux tailles de texte seulement** (duel H) : intenable sur le devis et la grille.

---

## 6. Ce qui est de ton ressort (hors code)

**Bloquant pour la suite.**
1. Valider le duel A (équipe) et le duel B (navigation) : voir `point-arret-equipe-navigation.md`.
2. La couleur du bouton d'action principal : anthracite (recommandé) ou terracotta foncé. Le terracotta actuel en texte blanc n'est qu'à 3,7:1.

**Les mots.**

3. Le mot de la 5e case : « Argent » ou « Factures ».
4. Aucun mot de rôle dans l'équipe, et la phrase « Elle verra tout, comme vous : devis, prix, factures. ».
5. Les titres « À régler » et « À suivre » sur l'accueil.
6. Le texte de décalage (« Je vous propose le 3 octobre à 14h. Cela vous convient-il ? »), et celui d'une annulation (aujourd'hui : « je reviens vers vous avec une nouvelle date », ce qui sonne faux pour une annulation).
7. Le texte de « Bien reçu », qui promet « je vous rappelle ce soir ».
8. La signature d'une relance envoyée par ta conjointe : son nom ou le tien.
9. Les mots des états : « Fait », « Pas enregistré », « Réessayer », « Pas de réseau. », « Tout est réglé. ».

**Les règles.**

10. La règle « À facturer » (chantier terminé, devis accepté, solde après acomptes et avoirs).
11. Le bilan du soir disparaît de l'accueil, alors que la vitrine le promet (`TelephoneSoir.tsx:26`).
12. 17 h tous les jours, dimanche compris ; et la pause de 7 jours après une relance.
13. Le Carnet replié à l'ouverture : on garde ?
14. « Rouvrir un chantier terminé » : faut-il le créer ?
15. « Pour qui » au planning (rouvre « pas d'assignation »). Le juge recommande non.
16. L'IBAN modifiable seulement par le propriétaire, et le transfert de propriété par le support.

**L'économie.**

17. Le tarif reste « une entreprise = un abonnement ». Un siège payant doublerait le prix d'un couple.
18. La promesse hors ligne : construire une file d'enregistrement, ou assumer « Pas enregistré. Réessayer. ».

**La confidentialité.**

19. Anonymiser au lieu de supprimer un ancien membre, à écrire dans la politique de confidentialité.
20. Effacer les brouillons d'une personne retirée.

---

## 7. Ce qu'il te reste à faire

1. **Me répondre sur le point d'arrêt** (duels A et B) et sur la couleur du bouton. Sans ça, je ne touche ni à l'équipe, ni à la navigation, ni à l'identité des boutons.
2. **Pousser la branche `refonte-app`** (elle est seulement locale : je n'ai rien poussé), puis ouvrir sa prévisualisation Vercel sur ton Samsung. `master` n'est pas touché. À vérifier en particulier :
   - l'envoi d'un devis par WhatsApp (le message s'ouvre-t-il au bon contact ?) ;
   - « Déplacer » depuis l'accueil et depuis le planning ;
   - le bandeau « Pas de réseau. » en mode avion ;
   - un partage WhatsApp quand l'IA échoue (coupe le réseau pendant l'analyse).
3. **Faire le test T1** (duel E) sur deux Android d'entrée de gamme. Il décide si « Bien reçu » sans numéro est faisable. Et **le test photo et dictée** (duel D, lot 2), avant que je livre la bande Photo · Dicter · Note.
4. **Après validation du duel A :** je t'écris les migrations 45 à 52 et `supabase/tests/isolation.sql`. Tu les passes d'abord sur une copie, en suivant G1 à G5, puis tu rejoues la matrice.
5. **Faire essayer** l'accueil, la fiche et l'envoi du devis à un ou deux vrais artisans, au téléphone, sans les aider. Noter chaque hésitation.
6. **Pousser en production** seulement après tout cela, et avec ton accord explicite.

---

## 8. À savoir sur l'environnement local

- **`.env.local` pointe sur la base de production.** Aucune donnée n'y a été lue ni écrite pour les tests. Les captures viennent du banc à données simulées `/apercu-moins`.
- **Les deux bancs d'aperçu non versionnés** (`app/apercu-moins`, `app/apercu-guide`) ont reçu deux retouches pour suivre les types (une ligne `href`, un drapeau `rdv`). Ils ne partent jamais avec un déploiement Git.
- **Il reste un dossier `.git/worktrees/compyobuild`**, laissé par la vérification du build sur `master`. Il était verrouillé par OneDrive et n'a aucun effet. `git worktree prune` le retirera une fois débloqué.
