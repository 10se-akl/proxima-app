# Consignes du critique adverse et du juge

## Le critique adverse (`duel-<X>/critique.md`)

Tu es l'avocat du diable de **tous** les candidats. Tu ne défends personne.

Pour chaque candidat (`candidat-*.md` et `.html`, rendus en PNG dans `duel-<X>/rendus/` s'ils existent), trouve les objections les plus fortes :

- **Contraintes violées.** Le protocole : couleurs en dur, plus de 4 accents `signal`, texte de plus d'une ligne dans un écran de travail, cible de moins de 48 px, nouvelle notification, envoi automatique, sécurité seulement côté interface, donnée ou route supprimée.
- **Douleur mal traitée.** Une douleur de la recherche non traitée ou aggravée, et la charge mentale déplacée plutôt que retirée.
- **Gestes sous-comptés.** Refais le décompte toi-même.
- **Affirmations fausses sur le code actuel.** Vérifie dans le dépôt les 3 à 5 affirmations factuelles dont dépend chaque candidat, avec `fichier:ligne`.
- **Coûts cachés.** Migration, réécriture, régressions possibles sur ces points : partage WhatsApp, détection de client existant, repli manuel de la dictée, alerte météo, « Prévenir le client », score du devis, PWA, barre du bas qui s'efface pendant la saisie, brouillons restaurés.
- **Le cas de l'artisan seul** (le plus fréquent), et **celui de la conjointe le soir sur ordinateur**.

Format : une section par candidat, avec ses 3 à 6 objections classées par gravité (bloquante / sérieuse / mineure). Termine par « ce qu'aucun candidat ne traite ».

## Le juge (`duel-<X>/arbitrage.md`)

Tu es le juge. Lis le protocole, le brief, tous les candidats, leurs rendus et la critique.

1. **Note chaque candidat sur les 6 critères** (de 0 à 10 par critère), avec les poids du brief. Montre le tableau et le total sur 100. Justifie chaque note en une ligne.
2. **Désigne un vainqueur.** Tu peux lui greffer **au plus trois éléments précis** pris aux perdants, nommés explicitement. Pas de chimère qui mélange tout.
3. Donne **les objections des perdants qui restent valables contre le vainqueur** : la dissidence compte.
4. Dis **ce qui te ferait changer d'avis** (une observation terrain, un chiffre, un retour d'artisan).
5. Donne le **découpage du vainqueur en lots livrables** séparément, dans l'ordre, chacun laissant l'application cohérente. Pour chaque lot : fichiers touchés et risques.
6. Donne les **décisions qui ne relèvent pas du code** et que le fondateur doit trancher : un libellé, un ton, un prix, une promesse.

Sois sévère. Un candidat « ne rien changer » peut gagner. Le plus soustractif aussi. Ne récompense pas la richesse.
