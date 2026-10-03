# Candidat A — Ne rien changer, boucher trois trous

**L'approche.** Le planning du téléphone (bande de 7 jours, journée en liste, feuille d'actions) répond déjà à « où je vais, quand » : on garde tout. On ne corrige que ce qui est faux ou dangereux : le chevauchement qui bloque une équipe, l'annulation sans question, et le déplacement ou l'annulation qui laissent le client dans le silence. Pour prévenir, on réutilise deux feuilles déjà livrées (`FeuilleDeplacer`, `FeuilleMessageClient`), aucun écran neuf.

**La douleur.** Le silence avec le client. « Si prévenir un client devient un geste d'une seconde avec un texte déjà prêt, l'artisan le fait. Compyo a déjà ce mécanisme — mais uniquement pour la météo. » (`recherche-douleurs-artisans.md:98`) A étend ce mécanisme aux deux gestes qui l'oubliaient.

**Ce que A tranche.** Vue par défaut : le jour, en liste (inchangé). Pas de glisser-déposer (inchangé, un doigt ganté ne vise pas une heure). « Prévenir » : après le geste, jamais avant ni à la place. Plusieurs personnes : rien de visible (inchangé). Météo : inchangée, sur la ligne et dans le bouton « Prévenir ».

## Ce qui change
- **Chevauchement par personne.** La contrainte `evenements_planning_pas_de_chevauchement` passe de `organisation_id with =` à `artisan_id with =`. Deux compagnons peuvent enfin avoir deux chantiers à la même heure.
- **Annuler** pose la question (« Annuler le rendez-vous ? ») avec trois sorties : annuler et prévenir, annuler sans prévenir, garder. « Annuler et prévenir » ouvre le message prêt, l'artisan envoie lui-même.
- **Déplacer** devient une ligne de la feuille : demain même heure déjà rempli, puis le message « Je vous propose le… ». « Modifier » garde le formulaire.
- Supprimé : rien. Ajouté : une ligne « Déplacer », une question, un modèle de message « Annulation » (une phrase).
- Ce que l'artisan perd : un geste sur l'annulation (2 devient 3), et la rapidité d'annuler par mégarde.

## Gestes (téléphone)
| Tâche | Avant | Après |
|---|---|---|
| Voir ma journée | 1 | 1 |
| Appeler le client du jour | 2 | 2 |
| Marquer fait | 2 | 2 |
| Créer depuis la fiche / le planning | 8 / 9 | 8 / 9 |
| Déplacer à demain, client prévenu | 11 (7 + 4 à la main, sans date dans le texte) | 5 |
| Annuler, client prévenu | 6 (2 + 4, texte qui ne parle pas d'annulation) | 5 (3 sans prévenir) |
| Prévenir pour la météo | 4 | 4 |

## Impact technique
- `supabase/schema.sql` : un module qui retire puis recrée la contrainte. Elle ne fait qu'assouplir : aucune ligne existante ne peut la violer. À jouer sur la base (non fait ici).
- `app/dashboard/planning/nouveau/page.tsx` (contrôle côté client et message 23P01) et `components/dashboard/ConfirmationRdv.tsx:80,135` : même filtre `artisan_id`, et fin de la phrase « quelqu'un d'autre de votre équipe ».
- `components/planning/AgendaMobile.tsx` (`ActionsEvenement`) : ligne « Déplacer », question d'annulation. Écrire d'abord, lire le résultat, puis ouvrir le message (comme `FermerJournee.tsx:129-139`). `GrilleAgenda.tsx` : la question seule, son menu a déjà « Prévenir le client ».
- `lib/messagesClient.ts` : `annulation()`, une clé, un libellé, un `if` dans `suggererMessages`. Aucune donnée migrée, aucune route supprimée.
- Risque de régression : faible. Le plus délicat est l'ordre « écrire, lire, ouvrir le message ».
- **Lots, chacun livrable seul :** 1) contrainte et filtres ; 2) annulation avec question et message ; 3) « Déplacer ».

## Auto-évaluation (sur 10, pondérée)
Charge mentale 5 (×3) · gestes 5 (×2) · lisibilité 360 px 6 (×2) · risque 9 (×1,5) · migration 9 (×1) · cohérence 7 (×0,5) = **63 / 100**.

## Les vraies faiblesses
1. **« Par personne » veut dire « par créateur ».** `artisan_id` est celui qui a saisi, pas celui qui y va. Si la conjointe saisit au bureau les rendez-vous de Gérard, plus aucun garde-fou contre son double rendez-vous (l'organisation entière le protégeait). Et à deux, la liste du téléphone montre deux lignes à 9h30 sans dire qui : on y lit un doublon. A n'a aucune réponse à « qui fait quoi » ; c'est précisément le sujet du duel A.
2. **La création reste à 8-9 gestes** (titre, date, heure vides, sélecteur sans recherche), et la feuille d'actions grossit : neuf choix, avec Déplacer et Modifier côte à côte, Annuler et Supprimer côte à côte. On peut encore décaler une date par « Modifier » sans qu'on propose de prévenir.
3. Dette de langage non traitée : `AgendaMobile.tsx` écrit des tailles en pixels (`text-[15px]`, `text-[17px]`) et des textes à `ink/60-65` ; le document `docs/langage-interface.md` dit à tort que cet écran suit déjà les règles 3, 4 et 18. À corriger au fil de l'eau, dans les lignes touchées. La météo reste celle de la ville du siège.
