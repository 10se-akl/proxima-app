# Compyo, le compagnon des artisans : audit, vision, livraison

*06/10/2026. Branche `claude/compyo-workflow-repositioning-sxu0k8`, partie de `master` (`7356131`). Ce document fait suite à [`rapport-refonte.md`](rapport-refonte.md) et respecte [`langage-interface.md`](langage-interface.md).*

> Compyo ne doit pas être le logiciel qui fait le plus de choses. Il doit être celui qui enlève le plus de choses de la tête de l'artisan.

---

## 1. Audit : le parcours réel avant ce travail

Les huit parcours ont été suivis dans le code, écran par écran (téléphone, 390 px). Un « geste » est un appui dans Compyo ; on y ajoute ceux faits dans WhatsApp ou les SMS quand un message part.

| Parcours | Gestes | Ce qui ralentissait |
|---|---|---|
| **A.** Un client écrit sur WhatsApp (nouveau) | 3 dans WhatsApp, puis 1 (« Créer le projet »), puis 2 (« Bien reçu » par SMS) | Une roue « L'IA prépare le brouillon… » sans rien à regarder, puis **sept champs ouverts** à relire un par un, même quand tout avait été lu tel quel dans le message. |
| **B.** Un SMS | Identique à A | Identique à A. |
| **C.** Sur place, dicter un nouveau client | [+], Écrire moi-même, puis le nom au clavier | Inchangé ici (le grand micro a été retiré le 27/09, décision du fondateur). |
| **D.** Un client connu réécrit | 3 dans WhatsApp, puis 1, puis 2 | Le choix « ajouter au projet » était un paragraphe de deux lignes et un bouton gris ; le message lui-même n'était plus visible. |
| **E.** Une note sur un chantier existant | 3 (Note, écrire, Enregistrer) ; **≈ 10 avec un rappel** | Le formulaire : titre obligatoire, description, trois niveaux d'importance, une case, puis un sélecteur de date et un d'heure, le tout dans une carte posée dans la feuille. On répétait aussi le nom du projet (« Projet : Martin ») alors qu'on est dedans. |
| **F.** Quelques photos | 3 (Photo, prendre, valider) | Déjà bon (duel D). |
| **G.** Préparer et envoyer un devis | 3 jusqu'au message prêt dans WhatsApp | Déjà bon (duel F). Libellés centrés sur la technologie (« Préparer le devis avec l'IA »). |
| **H.** Que faire aujourd'hui | 1 | Déjà bon (duel C). |
| **Bonus.** Planifier un rendez-vous depuis la fiche, puis prévenir le client | 3 + **un changement d'écran** (on finit sur le Planning), puis ≈ 5 pour revenir et écrire au client | On **sortait du contexte** : la fiche disparaissait au profit du Planning. |

**Ce qui revenait partout**
- **L'IA se montrait** : étincelles, pastilles « IA », « avec l'IA » dans les boutons, « L'IA a repéré… », « Écrire avec l'IA ».
- **Des écrans de l'ancienne génération** sur les parcours les plus précieux : cartes à ombre (règle 8), texte à 60 % d'opacité, roue terracotta.
- **La fiche rechargeait tout** (dix requêtes et une URL signée de logo) après chaque petite action : photo, mémo, note dictée, priorité, infos du client.
- **La vitrine** disait « compagnon administratif » et parlait de fonctions (« Devis · Factures · Planning · Relances… ») plutôt que de continuité.

**Ce qui était déjà juste et qu'il ne fallait pas casser** : l'ordre fixe de la fiche (Maintenant, la bande Photo · Dicter · Note, À faire, À retenir, Argent, Carnet replié), un bouton plein par écran, « Bien reçu » après une capture, l'envoi du devis en un geste, l'accueil « devant / derrière ».

---

## 2. Vision

**Le produit, c'est le fil du chantier.** Une information captée une fois suit le chantier jusqu'à la facture. Concrètement, trois principes, appliqués là où ils enlèvent du travail :

1. **Rester dans le contexte.** Ce qu'on fait depuis une fiche se fait dans la fiche (une feuille qui monte du bas), et la fiche dit ce qui vient de se passer.
2. **Chaque action se termine par la suite logique, proposée, jamais faite à la place de l'artisan.** Un rendez-vous planifié propose « Prévenir Martin ? ». Un message reçu propose « Bien reçu ». Rien ne part tout seul.
3. **Le résultat devant, la technologie derrière.** « Projet prêt. 1 point à compléter. » plutôt que « L'IA a analysé votre demande ».

**Ce que je n'ai pas retenu de la demande, et pourquoi**
- *Un bouton « Ajouter » de plus sur la fiche* : il existe déjà deux portes (la bande Photo · Dicter · Note sous le pouce, et le [+] de la barre du bas, qui sur une fiche ajoute à ce projet). En ajouter une troisième aurait été la « bonne idée de plus » qui rend l'écran illisible. J'ai plutôt rendu chaque porte plus courte.
- *Fusionner note, mémo et note vocale en un seul objet* : séduisant sur le papier, mais cela touche trois tables, le carnet, l'analyse et le partage. Le gain ne justifie pas le risque aujourd'hui (voir § 5).
- *Remplacer le slogan* : « Vos soirées ne sont pas faites pour la paperasse » reste le titre ; l'identité « le compagnon des artisans » vient juste dessous. Le slogan accroche, l'identité explique.

---

## 3. Ce qui a été livré

| Commit | Changement | Problème résolu |
|---|---|---|
| Note : un seul champ | Un champ (la première ligne fait le titre), rappel en un appui (**Ce soir · Demain 8 h · Lundi 8 h · Autre date**), « Important » en une case, le micro dans le champ, plus de carte dans la feuille, plus de « Projet : Martin ». Même modèle de données, même brouillon local, même dictée. | « Penser à commander les robinets » + un rappel demandait ≈ 10 gestes et trois décisions inutiles. |
| Rendez-vous sans quitter le chantier | La feuille « Quand ? » s'ouvre sur la fiche (le [+], « … », « Planifier le démarrage »), déjà remplie. Après écriture : « Planifié : demain à 8 h » et **« Prévenir Martin ? SMS · WhatsApp · Plus tard »**, avec le message de confirmation existant. | On finissait sur le Planning, loin du chantier, et le client n'était pas prévenu. |
| Capture | Pendant la préparation : **le message lui-même** et la forme vide du projet. La revue devient un **récapitulatif « Projet prêt. »** : ce qui a été lu se lit, ce qui a été déduit dit « à vérifier », seul ce qui manque est ouvert. Client reconnu : **« C'est Martin. »**, le début du message, et « Ajouter au projet Martin » en bouton plein. | Relire sept champs pour un message déjà compris ; une attente sans repère. |
| L'IA en arrière-plan | « Préparer le devis », « Préparer une relance », « Mettre à jour le devis », « Résumer mes notes », « Un message sur mesure » ; « 3 tâches repérées dans vos notes » ; plus de pastille ni d'étincelle. **Gardé** : « Vous relisez avant l'envoi. » sous chaque bouton qui prépare quelque chose. Les pages de confiance et la FAQ gardent l'explication honnête du rôle de l'IA. | L'interface cherchait à prouver qu'il y a de l'IA. |
| Rafraîchissements légers | Après photo, mémo, note dictée, priorité, infos, rendez-vous : seulement le projet et son carnet (une vague de 2 à 4 requêtes au lieu de 10 et d'une URL signée). | La fiche « moulinait » sur un réseau de chantier après chaque geste. |
| « Prochain passage : demain 8 h » | La date courte dans la semaine. | La ligne de Maintenant était coupée à 390 px. |
| Vitrine | Hero : « Compyo, le compagnon des artisans. Du premier message du client à la facture, chaque chantier reste rangé. Rien à ressaisir. » Nouvelle section **« Vous le dites une fois. »** : huit étapes sur un même fil (Message → Projet → Visite → Devis → Signature → Planning → Chantier → Facture), avec sous chacune ce que Compyo garde du chantier de Mme Garnier. Bande de mots en parcours, métadonnées, manifest, image de partage, `llms.txt`. | Le visiteur comprenait « logiciel de devis », pas « compagnon du chantier ». |

---

## 4. Avant → après

| Parcours | Avant | Après |
|---|---|---|
| Note simple sur le chantier Martin | 3 gestes, 5 champs à l'écran | **3 gestes, 1 champ** |
| Note avec rappel « demain matin » | ≈ 10 gestes (case, date, heure) | **4** : Note, écrire, Demain 8 h, Enregistrer |
| Rendez-vous depuis la fiche, client prévenu | 3 + changement d'écran, puis ≈ 5 pour revenir et écrire | **5, sans quitter la fiche** : [+], Rendez-vous, Planifier, SMS, Envoyer |
| Message WhatsApp d'un nouveau client | 6 gestes, 7 champs à relire | **6 gestes, 0 à 2 points signalés** |
| Message d'un client connu | 6 gestes, un paragraphe à lire | **6 gestes, « C'est Martin. » et un bouton plein** |
| Devis, photo, journée | Déjà courts | Inchangés (libellés seulement) |

---

## 5. Volontairement pas changé

- **Le modèle de données et la sécurité** : aucune migration, aucune policy, aucune route API modifiée. Facturation, suppression, authentification : pas touchées.
- **Le Carnet replié, l'ordre de la fiche, un bouton plein par écran** : décisions du duel D, gardées.
- **Le grand micro « Parler »** : retiré par le fondateur le 27/09, pas remis.
- **« Bien reçu » sans numéro** : toujours bloqué par le test T1 sur un vrai Android (duel E).
- **Trois sortes de notes** (tâche, mémo « À retenir », note dictée) : à mesurer avant de fusionner. Si les artisans hésitent entre « Note » et « À retenir », la fusion mérite un duel.
- **L'éditeur de devis et la grille du planning** : déjà retravaillés (duels F et G), aucun gain évident sans test terrain.

---

## 6. Vérifications

- `npx tsc --noEmit` : sans erreur.
- `npm run build` : réussi (Node 22), y compris `/icon` et `/opengraph-image`.
- `node --test` (semaine du planning, prix Compyo) : 27/27.
- Captures sur un banc à données simulées (non versionné, aucune base touchée) : fiche (nouveau, devis envoyé, chantier), note et rappels, planifier, récapitulatif de capture, client reconnu, capture, hero et « le fil », à **360, 390, 412, 430, 768 et 1440 px, en clair et en sombre** : aucun débordement horizontal, aucune erreur de rendu.
- **Non vérifiable ici** (pas de base ni de téléphone dans cet environnement) : l'écriture réelle d'une note, d'un rendez-vous, d'un partage WhatsApp. La logique d'écriture n'a pas changé (mêmes fonctions, mêmes colonnes) ; seuls l'interface et l'ordre des rechargements ont bougé. À tester sur la prévisualisation (§ 7).

## 7. À faire par le fondateur

Voir le rapport final de la session ; en bref : prévisualisation sur le Samsung, une note avec « Demain 8 h », un rendez-vous depuis une fiche avec « Prévenir », un partage WhatsApp d'un nouveau client puis d'un client connu, puis deux artisans sans aide.
