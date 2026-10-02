# Candidat A — Ne rien changer, mais dire vrai

**L'approche.** L'espace devis actuel (éditeur de lignes en place, score qui n'empêche rien, brouillon gardé sur le téléphone, PDF vivant à côté sur ordinateur) est le fruit de passes datées du 06/09 au 27/09 et il marche. On n'y touche pas. On corrige seulement les mots qui promettent autre chose que ce que le code fait, en premier « Envoyer au client ». A est le plancher du duel : toute autre proposition doit gagner plus en charge mentale et en gestes qu'elle ne perd en risque et en coût.

**La douleur traitée : la confiance, pas la vérification.** La recherche : « les devis dictés doivent être vérifiés point par point, donc [...] aucun gain de temps ». **A n'y répond pas** (voir faiblesses). Il traite un mensonge vérifié dans le code : `marquerDevisEnvoye` ne fait rien partir. Il fige les mentions légales, ouvre le lien de signature (`obtenir_devis_public` ne sert que `envoye` et `refuse`), passe le projet en `devis_envoye` et arme la relance J+5. Gérard peut croire que c'est parti.

**Libellés corrigés (le seul changement, 6 chaînes)**
| Avant | Après |
|---|---|
| « Envoyer au client » (`SuiviDevis.tsx:163`) | « Passer à l'envoi » |
| « …En l'envoyant, le devis est figé… » (`:143`) | « Relisez l'aperçu. Le lien de signature s'ouvre ; vous le partagez ensuite par SMS ou WhatsApp. » |
| « Envoyé le … » (`:252`) | « Noté envoyé le … » |
| « Rien n'est envoyé au client avant que vous validiez » (`ValiderDevis.tsx:494`) | « Rien ne part chez le client sans vous. » |
| événement « Devis envoyé au client » (`actions.ts:89`, `demandes/[id]/page.tsx:1310`) | « Devis noté envoyé » |
| « Télécharger le PDF » en brouillon (`EspaceDevis.tsx:321`) | « Télécharger le brouillon (PDF) » |

Ce que l'artisan perd : rien. Ajouté : rien. Supprimé : rien.

**Gestes, de « devis généré » à « parti chez le client » (cas sans correction).** Avant : Valider · Envoyer au client · Partager · WhatsApp · contact · Envoyer = **6 appuis + 1 glissement** (le bouton est sous la carte du score), +2 pour regarder l'aperçu. Après : **identique**. Corriger un prix : 2 appuis après 2 à 3 glissements pour atteindre la ligne. Compléter la décennale : 3 appuis, le score passe de 48 à 78 aussitôt. Aucun de ces chiffres ne bouge.

**Impact technique.** Six chaînes dans cinq fichiers (`SuiviDevis`, `ValiderDevis`, `EspaceDevis`, `lib/devis/actions.ts`, fiche projet), plus `lib/guide/contenu.ts:123` et sa capture d'écran, qui montrent l'ancien bouton. Aucune migration, aucune règle de base, aucun test de logique. Risque de régression : nul. Compatible tel quel avec les duels voisins : duel A (aucune limite de rôle dans ces écrans, tout membre valide déjà), duel B (le devis reste atteignable depuis « Argent »), duel D (« ← Projet » et « Autres versions » restent).

**Lot unique**, une demi-journée. Rien à découper.

**Auto-évaluation (sur 100) : 52.**
- Charge mentale 10/30 : le mot est juste, l'écran reste lourd (15 groupes de champs, score avant les lignes).
- Gestes 8/20 : inchangés.
- Lisibilité à 360 px 7/20 : textes de 10 à 11 px à 40 % d'opacité, aucune ligne visible sans défiler.
- Risque technique 15/15. Coût de migration 10/10.
- Cohérence 2/5 : l'écran reste hors de `docs/langage-interface.md`.

**Les deux vraies faiblesses.**
1. **Il ne répond pas à la question du duel.** Les lignes restent sous le pli (même score replié), rien ne dit lesquelles vérifier : le badge « IA » est sur toutes les lignes générées, donc il ne signale rien. Le coût de vérification, reproche n°1 fait au devis vocal, est intact.
2. **Les mots ne réparent pas le modèle.** Deux statuts (`a_valider`, `envoye`) pour un seul geste pensé par l'artisan : l'accueil, la liste, la relance J+5 continuent d'affirmer « envoyé » sans preuve d'envoi. « Noté envoyé » n'existe que sur un écran ; changer la pastille partout ferait passer à tort un devis réellement parti pour « à transmettre ». Seul un parcours unique, où le statut change après le partage, règle cela (candidats B et D).
