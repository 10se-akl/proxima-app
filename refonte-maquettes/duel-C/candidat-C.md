# Candidat C — L'écran suit la journée

**Variante choisie : les moments** (matin, journée, soir). Écartée : « une seule chose à la fois ». Son « Passer » n'écrirait rien de réel (le défaut de f8d263b) et elle cache la liste, alors que l'angoisse vient de ne pas savoir ce qu'il reste. Gardé d'elle : un seul héros par moment.

## L'approche
Mêmes données, mêmes lignes ; on change ce qu'on montre selon l'heure à Paris. Avant 9 h, la route : le prochain rendez-vous et « Y aller ». De 9 h à 17 h, le chantier où l'on est et un seul bouton, « Ajouter une photo ou une note ». Dès 17 h, la fermeture : une liste « À régler », demain, « Au bureau ». Le titre de 30 px est la réponse du moment (« 2 rendez-vous », « Mme Bernard », « 5 à régler. »), et le reste tient en une ligne : « Ce soir · 3 à régler · 3 au bureau ».

## La douleur
« Le réveil à 3 heures du matin, c'est très souvent une liste non fermée. » Aujourd'hui la fermeture est éclatée (« À confirmer » sans plafond, puis « En suspens »), et à 10 h 30, sur le chantier, l'écran montre du travail de bureau qu'on ne peut pas faire. La capture sur place, qui évite le tri du soir, coûte quatre appuis.

## Supprimé, fusionné, ajouté
- **Fusionné** : « À confirmer » + « En suspens » + « Chantier terminé ? » en une liste de 5 lignes, la suivante montant quand on en règle une (plafond corrigé). « À faire de votre côté » + « En attente du client » en « Au bureau », par urgence.
- **Retiré de l'écran, pas des données** : le bureau en journée (sauf sans rendez-vous ni chantier, maquette 6), « À confirmer » en journée (la question est posée une fois, le soir), « Bonjour Gérard ».
- **Ajouté** : « Y aller » (l'itinéraire de `EnTeteProjet.tsx:225`), « Ajouter » sur le chantier, la ligne « Ce soir ». **Corrigé** : « Relire » ouvre `/dashboard/devis/[id]` ; bornes du jour en heure de Paris (`debutJourParis`, déjà calculées).
- **Perdu** : la vue d'ensemble permanente, le bureau sous les yeux à midi, le choix de l'écran. Pas de « C'est bon pour aujourd'hui » : « Tout est réglé. » est un état vrai, jamais un geste.

## Gestes (avant → après)
- Adresse du prochain rendez-vous, puis itinéraire : 2 à 3 → 1.
- Ajouter une photo au chantier où je suis : 4 (Projets, projet, +, type) → 2.
- Relire le devis du jour : 2 → 1. Cocher une note en retard : 1 → 1.
- Fermer 5 éléments : 5 appuis sur deux zones, avec défilement → 5 appuis, une liste.

## Impact technique
- `app/dashboard/page.tsx` : un `moment` (`heureParis` existe, ajouter la borne de 9 h) ; mêmes 12 requêtes ; « demain » passe à `limit(2)` ; le chantier vient de `listeProjets` (en cours, modifié le plus récemment) ; la « prochaine action » est extraite et testée.
- `VueAccueil.tsx` éclaté en trois composants sur `Blocs.tsx` ; `FermerJournee.tsx` absorbe `AConfirmer` (calendrier de replanification réutilisé). `VueProjet.tsx` : `?ajouter=1`, sur le modèle de `?message=` (l. 136), environ 6 lignes.
- Aucune migration, dépendance ni route retirée. Risques : la bascule d'heure (8 h 59/9 h 00, 16 h 59/17 h 00, heure d'été) et le choix du chantier.
- **Lots** : 1) corrections de A (plafond, lien devis, bornes Paris) ; 2) le soir fusionné ; 3) la journée (chantier + `?ajouter`) ; 4) la route + « Y aller » ; 5) « Ce soir », optionnel. Un moment non livré garde l'écran actuel.

## Auto-évaluation
Charge mentale 24/30 · Gestes 15/20 · Lisibilité 16/20 · Risque 9/15 · Migration 6/10 · Cohérence 3/5 = **73/100**.

**Faiblesses.**
1. **L'heure décide à la place de Gérard.** Bascule fixe et invisible : qui finit à 15 h 30 n'a la fermeture qu'à 17 h (« Ce soir » en est la seule porte), et « où est passé le devis ? » reste possible. Matin et journée se ressemblent : si l'usage le confirme, on les fusionne.
2. **« Le chantier en cours » est une devinette.** Le planning ne dit pas où il est ; avec trois chantiers ouverts on se trompe, pour le prix d'un appui sur « Projets ». Autres coûts : la dette de confirmation se concentre le soir (trois rendez-vous, trois appuis), et « Demain » sur un rendez-vous déplace celui du client sans le prévenir (défaut existant, non traité).
