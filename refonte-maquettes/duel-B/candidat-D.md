# Candidat D — « Argent » prend la place de « Plus »

**Approche.** Quatre destinations identiques sur téléphone et ordinateur : Aujourd'hui · Projets · Planning · **Argent**, plus la capture [+]. « Plus » disparaît : Argent prend sa 5e case (une seule case change, l'habitude du pouce est gardée) et le compte (Paramètres, Mon équipe, Guide, avis, thème, déconnexion) passe sous l'avatar en haut à droite. Devis, Factures et Bilan fusionnent en une page qui ne liste que des verbes (à relancer, à facturer, à envoyer). Notes devient un geste de capture plus une vue dans Aujourd'hui.

**Douleur.** « navigation cachée, trop de choix, et bouton hors de portée du pouce ». Mais aussi : 60 % des conjoints travaillent dans l'entreprise, la vraie équipe est « un terrain et un bureau ». La conjointe a besoin d'une vue **transversale** de l'argent (impayés ★★★★, silence du client), qu'un rangement « tout dans le projet » ne lui donne pas : elle devrait ouvrir les projets un par un.

**Supprimé, fusionné, ajouté.**
- Sortent de la navigation, routes intactes : Plus, Devis, Factures, Notes, Bilan, Guide, Paramètres, Équipe, Carte mentale. **10 destinations deviennent 4.**
- Fusionné : Devis + Factures + Bilan en `/dashboard/argent` (les listes complètes restent en pied de page). Notes : déjà dans Aujourd'hui et dans la cloche (« Voir toutes les notes », `CentreNotifications.tsx:180`). Équipe : un seul lien, qui rend enfin la page orpheline `/dashboard/equipe` atteignable.
- Ajouté : une page, une feuille Compte (qui remplace la feuille Plus), un avatar. Une règle nouvelle, « À facturer » (devis accepté, chantier terminé, solde restant), qui n'existe nulle part en liste.
- **L'artisan perd** : le tiroir « Plus » appris par cœur ; les listes Devis/Factures en première ligne (2 gestes) ; Paramètres passe de 1 à 2 clics sur ordinateur ; Notes n'est plus un onglet.

**Terrain / bureau.** La navigation ne dépend que d'un booléen `voitArgent`. Piège : `memberships.role = employe` ne veut pas dire « terrain » (la conjointe invitée par Gérard est `employe`). Et aucune policy ne lit le rôle (`_inventaire/03`) : masquer Argent est du confort, **pas de la confidentialité**. À ne livrer qu'après le duel A. Équipe garde la même place dans les deux issues.

**Gestes (avant → après).**

| Tâche | Avant | Après |
|---|---|---|
| Relancer une facture impayée, depuis le menu | 6 | **4** |
| … depuis Aujourd'hui (seuil atteint) | 3 | 3 |
| Voir les devis à finir ou envoyer | 4 | **2** |
| Ouvrir un devis ancien | 3 | 3 |
| Équipe | 3 + dépli | **2** |
| Paramètres, téléphone / ordinateur | 2 / 1 | 2 / 2 |
| Conjointe, 1440 px : tout ce qui est à facturer et à relancer | 4+ clics, 2 pages, « à facturer » introuvable | **1 clic, 1 page** |

**Impact technique.** `components/dashboard/Sidebar.tsx` (listes, feuille Plus remplacée par `components/navigation/MenuCompte.tsx`, onglet Argent actif sur argent, devis, factures, bilan) ; nouveau `app/dashboard/argent/page.tsx` + `loading.tsx` réutilisant `BlocAccueil` et `LigneAccueil` ; `VueAccueil.tsx:101` (« Voir les N » vers Argent) ; `CentreNotifications.tsx:180` (lien à 48 px). Aucune migration. Risques : Sidebar sert téléphone et ordinateur ; ne pas toucher `data-barre-bas`, `--barre-bas` (hauteur de barre inchangée), l'évènement `compyo:capture`, la règle e2a9972. Les seuils de relance (3 j, 5 j, échéance + 3 j) seraient dupliqués : les extraire dans `lib/` avec un test. Les requêtes devis et factures ne sont pas bornées dans le temps : les borner. Aucune idée écartée de `idees-futures.md` n'est rouverte.

**Lots, chacun laissant l'app cohérente.**
1. Menu Compte (avatar, menu à l'ordinateur) ; « Plus » ne garde que Devis, Factures, Notes, Bilan. Aucune donnée.
2. Page Argent (À relancer, À envoyer, total), atteinte par « Voir les N ». Additif.
3. Le basculement : 5e case = Argent, feuille Plus supprimée, archives en pied de page. Réversible en une constante.
4. « À facturer » et deux colonnes à l'ordinateur, après essai avec une vraie conjointe.
5. Vue réduite, seulement avec le duel A (RLS).

**Auto-évaluation** (poids du duel B) : charge mentale 7,5/10 · gestes 8 · lisibilité 7 · risque 7,5 · migration 7 · habitude 6 → **72,5 / 100**.

**Mes deux faiblesses.**
1. **Argent double deux blocs d'Aujourd'hui** (« À faire de votre côté », « En attente du client ») : même donnée à deux endroits, charge non retirée là. Sa place sur le téléphone n'est pas prouvée (la recherche n'a aucun entretien direct). Si Gérard seul ne l'ouvre jamais, repli : barre à 3 + [+] sur téléphone, Argent seulement dans la barre latérale (un drapeau par entrée).
2. **Rupture d'habitude et cachettes.** Notes, Paramètres, Équipe, Guide derrière un avatar en coin : la « navigation cachée » est déplacée, pas supprimée. Le libellé « Argent » n'a jamais été testé auprès d'artisans, et la règle « À facturer » (acomptes) peut être fausse.

**Au fondateur de trancher.** Le mot (« Argent » ou « Devis et factures »), le sort de la Carte mentale, et prévenir soi-même les bêta-testeurs : pas d'infobulle de tutoriel.
