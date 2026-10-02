# Candidat D (libre) — « Le total, les doutes, un bouton »

**L'approche.** L'écran du devis s'ouvre sur le client et le total TTC (30 px), puis seulement sur les lignes que Compyo peut *prouver* inhabituelles par rapport aux postes que Gérard a déjà chiffrés (calcul sur le téléphone, zéro IA) ; les autres lignes sont repliées en une rangée. Toucher une ligne ouvre une feuille à gros boutons (quantité −/+, prix, « votre habitude : 22,00 € » en un appui). Un seul bouton plein, « Envoyer par WhatsApp », fige le devis, le note envoyé **puis** ouvre WhatsApp sur le numéro du client, message et lien de signature déjà écrits : Gérard appuie lui-même sur envoyer.

**La douleur.** Vérifier un devis dicté point par point annule le gain de temps (le peintre de la recherche). Et : « Le logiciel doit porter la conformité à la place de l'artisan, silencieusement, et ne parler que quand quelque chose manque vraiment. » D ne supprime pas la vérification : il la réduit à ce qui est démontrablement douteux, garde le total en tête et le vrai PDF à un appui.

**Supprimé / fusionné / ajouté.**
- Fusionné : « Valider ce devis », « Envoyer au client » (qui n'envoie rien), « Partager », le choix de l'appli et du contact → **un seul bouton**. Le statut `a_valider` n'est plus qu'un état de reprise (échec en cours de route, devis validé ailleurs).
- Retiré du premier écran : l'anneau et le « 53 % » de conformité, les onglets Modifier / Aperçu, le badge « IA » (il marque toutes les lignes, donc aucune), les 15 groupes de champs, le bouton PDF en brouillon.
- Déplacé, rien supprimé : ancien éditeur complet, score, conseils de lisibilité, lots, conditions → derrière « Modifier tout le devis ». Le PDF → « Voir le PDF » dans l'en-tête.
- Ajouté : une rangée « À vérifier », une feuille de ligne, une rangée « Il manque… » (mention légale obligatoire seulement, complétée sur place avec `CompletionMention` tel quel).
- Gérard perd : la vue « tout est éditable d'un coup » (un appui de plus) et le pourcentage de conformité.

**Gestes, de « devis généré » à « parti chez le client ».**
| Cas | Avant | D |
|---|---|---|
| Rien à corriger | 7 (9 en regardant le PDF) | **2** |
| Une ligne douteuse jugée juste (coche) | 7 | 3 |
| Une ligne corrigée (ex. prix ramené à l'habitude) | ≈ 10 | 5 |
| Par SMS plutôt que WhatsApp | — | +1 |
| Client sans numéro | 7 | 4 (partage système) |
| Mention manquante, une fois pour toutes | quitter l'écran ou 4 sur place | 4 sur place, avant le bouton |

**Impact technique.** Aucune migration, aucune RPC modifiée : la page publique ne lit qu'un devis `envoye` (`obtenir_devis_public`), donc on note l'envoi **avant** d'ouvrir WhatsApp. Briques existantes réutilisées : `marquerDevisEnvoye`, `ouvrirMessage` / `lienMessage` (`wa.me/{numéro}`), `messageClient`, `CompletionMention`, `ApercuPdf`, `Feuille.tsx`, `evaluerDevis`. Nouveau : `RevueDevis.tsx`, `FeuilleLigne.tsx`, `lignesADoute()` dans `lib/devis/qualite.ts` (réutilise les contrôles unité/prix et libellés déjà par ligne, plus « prix hors habitude » et « quantité absente »), prix typique dans `lib/postesFrequents.ts`, `enregistrerValidation()` extraite de `ValiderDevis.tsx`. Risques : extraire l'état de `ValiderDevis` (806 l.) sans casser le brouillon local ; deux écritures à la suite (si la 2e échoue, l'écran « Prêt à partir » existant reprend) ; `window.open` après un `await` peut être bloqué (repli : « Rouvrir WhatsApp »).

**Lots.**
1. *Honnêteté* : l'écran « Prêt à partir » actuel reçoit « Envoyer par WhatsApp » (`ouvrirMessage` + numéro) ; 7 → 3 gestes, zéro refonte.
2. Extraire l'état de `ValiderDevis` dans un hook, sans changement visuel.
3. `RevueDevis` + feuille de ligne ; ancien écran → « Modifier tout le devis » ; valider + envoyer fusionnés.
4. Rangée « Il manque… » ; score et conseils déplacés.
5. Lignes à vérifier (`lignesADoute`), **en dernier** : c'est le lot le plus incertain.

**Duels voisins.** A : tout membre peut valider et envoyer ; le message part du téléphone de celui qui appuie, la timeline garde son nom. Une restriction « seul le patron envoie » serait une règle en base, pas un bouton grisé. B : la barre du bas n'est pas touchée. D : route `/dashboard/devis/[id]` et « ← Projet » inchangés ; le seul bouton plein de l'écran final est « Retour au projet ».

**Auto-évaluation (100).** Charge mentale 24/30 · gestes 18/20 · lisibilité 17/20 · risque 9/15 · migration 6/10 · cohérence 5/5 = **79**.
**Deux vraies faiblesses.**
1. *Ce qui est replié n'est pas relu.* Une quantité plausible mais fausse (24 m² au lieu de 20) passe toutes les règles : c'est exactement l'erreur que redoutait le peintre, et D ne la voit pas. Les règles « prix hors habitude » exigent aussi un historique : au premier devis, rien n'est signalé (on montre alors cinq lignes puis « Voir les N »), et des libellés qui varient d'un devis à l'autre créeraient de fausses alertes qui apprennent à Gérard à les ignorer.
2. *« Envoyé » est écrit au toucher du bouton, pas à l'envoi réel* : WhatsApp ne dit pas si Gérard a appuyé sur envoyer. L'écran de retour dit donc « Message ouvert dans WhatsApp » avec « Pas parti ? Rouvrir », jamais « parti ». Et l'ancien éditeur, caché derrière un lien, n'est pas simplifié, seulement mis à distance.
