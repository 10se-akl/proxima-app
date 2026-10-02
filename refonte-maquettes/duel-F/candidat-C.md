# Candidat C — La pile de questions (duel F)

**Variante : vérification par exception, en cartes** (pas « l'aperçu éditable »). Le document réel (`ApercuPdf`) comme écran principal ne réduit pas ce qu'on relit : il le montre en entier (13 px, mentions en 10 px), pèse ~700 Ko sur un Android d'entrée de gamme, et des pages rasterisées n'ont pas de ligne à toucher. Il reste le dernier coup d'œil (une ligne du récapitulatif) et, sur ordinateur, la moitié droite de l'écran.

## L'approche
Le devis arrive et Compyo ne pose que les questions auxquelles il ne peut pas répondre : une carte à la fois, « Oui » ou « Corriger ». Les cartes viennent de contrôles **déterministes** (aucun prix de l'IA, aucune IA pour classer) : plus gros poste, ligne au prix de référence plutôt qu'à celui de Gérard, ligne incohérente, oubli probable, mention obligatoire absente. Pile vide : un écran, le total, puis « Envoyer par WhatsApp » (ou SMS) au numéro de la cliente, et au retour une question honnête : « Parti chez Mme Fabre ? ».

## La douleur
« Un peintre explique que les devis dictés doivent être vérifiés point par point, donc qu'il n'y a aucun gain de temps par rapport à la saisie classique. » Ici le coût de la vérification suit le **doute**, pas la longueur du devis. Une carte est une décision d'un pouce, sans taper : elle supporte l'interruption (réponses gardées dans le brouillon local existant).

## Supprimé, fusionné, ajouté
- **Fusionné** : suggestions d'oubli (en bas du formulaire), points « attention » du score et lignes incohérentes deviennent une seule grammaire « question, Oui / Corriger », celle de « Fait ? Oui / Non » de l'accueil.
- **Retiré du chemin principal** : l'anneau et le « % », les onglets Modifier / Aperçu, « Télécharger le PDF » du brouillon, « Envoyer au client » (qui n'envoyait rien). Conseils et formulaire complet restent derrière « Tout modifier » ; rien n'est supprimé.
- **Ajouté** : la pile, la feuille « Corriger » (quantité, prix, clavier numérique), « Parti chez… ? ».
- **Gérard perd** : la vue immédiate de toutes les lignes (à un appui), le score en chiffre, les lots et flèches au pouce (dans « Tout modifier »).

## Gestes, de « devis généré » à « parti chez le client »
| Cas | Avant | Après |
|---|---|---|
| Sans correction | ≈ 7 (9 avec l'aperçu), sans relecture guidée | **6**, relecture comprise (Oui ×3, WhatsApp, envoyer, « Parti ? » Oui) |
| Une correction de prix | ≈ 9 | **8** |
| Rien de douteux | ≈ 7 | **3** |

Gain en appuis modeste dès trois cartes. Le vrai gain : lire 3 phrases, pas 7 lignes, un score et ~15 champs.

## Impact technique
- Nouveaux `components/devis/VerifierParCartes.tsx` et `lib/devis/exceptions.ts` (pur, testable, plafonné à 5 cartes). `ValiderDevis.tsx` : état `confirmees` dans `EtatEdition` (déjà persisté par `brouillonLocal`), export de `validerDevis`. `EspaceDevis.tsx` : pile sur téléphone, `ScoreDevis` gardé sur ordinateur. `SuiviDevis.tsx` : boutons WhatsApp / SMS par `ouvrirMessage` et `numeroWhatsApp` (déjà dans `lib/messagesClient.ts`), question « Parti ? » (le `questionEnvoi` existant). `Feuille.tsx` réutilisée.
- **Pas de migration SQL** : champ optionnel `prix_source` sur la ligne (jsonb) posé par `calculerDevis.ts` ; `lignesDeVente` copie ses champs un à un, il ne fuit pas vers le client. Anciens devis : seules les cartes « gros poste » et « oubli » s'appliquent.
- Aucune dépendance. RLS inchangée : tout membre valide ; l'envoi reste un appui sur un téléphone ; à l'ordinateur, « Valider sans l'envoyer » laisse le devis dans « Devis à envoyer » de l'accueil (existant). Brouillons locaux à l'appareil : pas de pile partagée entre deux appareils.

## Lots
0. **Honnêteté** : WhatsApp / SMS + « Parti ? » dans `SuiviDevis`. Indépendant, rentable seul.
1. `exceptions.ts` + pile : gros poste, oubli, mention absente. Formulaire intact derrière « Tout modifier ».
2. `prix_source` : cartes « prix de référence ».
3. Prix de Gérard d'abord : correspondance floue avec `postesFrequents` (aujourd'hui texte identique, 2 usages), pour que les cartes s'éteignent avec l'usage.
Retour arrière : retirer la pile, l'éditeur actuel est intact.

## Auto-évaluation (sur 100)
Charge mentale 24/30 · Gestes 11/20 · Lisibilité 18/20 · Risque technique 8/15 · Migration 5/10 · Cohérence 4/5 = **70**.

**Faiblesse 1 : la sécurité repose sur le classement « sûr ».** Les signaux sont minces aujourd'hui : tableau de prix codé en dur (60 € par défaut), habitudes à texte identique, durées estimées par l'IA que seul « gros poste » rattrape. Un faux négatif part chez le client sans question, et trois « Oui » réflexes valent un tampon. Les petites lignes au prix de référence (< 15 %) ne sont pas posées : seuil arbitraire. Les candidats qui montrent tout ne prennent pas ce risque.

**Faiblesse 2 : peu de gain en appuis, deux chemins à maintenir.** Sans le lot 3, les cartes reviennent à chaque devis (fatigue du « Oui »). Pile sur téléphone, formulaire sur ordinateur : deux parcours. Hérité : Gérard valide des lignes avant marge, le client lit des lignes marge incluse ; « Voir le document » le rattrape.
