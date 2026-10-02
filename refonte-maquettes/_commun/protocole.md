# Protocole commun des duels — refonte de l'application Compyo

Ce fichier est identique pour tous les agents de l'arène. Lis-le en entier avant ton brief de duel.

## Le produit et la personne

Compyo doit être **le compagnon administratif le plus simple, le plus agréable et le plus intelligent pour un artisan du bâtiment**. Le fondateur préfère 30 fonctionnalités parfaitement pensées à 150. **Supprimer, fusionner et simplifier comptent autant que construire.** Une idée qui ajoute plus de complexité qu'elle n'en retire est rejetée.

**Gérard, 57 ans, plaquiste**, travaille seul ou avec un apprenti. Sa femme fait les factures le soir.
- Il a un Android d'entrée de gamme, souvent en 4G, au soleil, avec des gants ou les mains pleines de plâtre.
- On l'interrompt toutes les dix minutes. Il ne lit pas : il regarde, il appuie, il repart.
- **Le téléphone est la version réelle de Compyo ; l'ordinateur est le bureau du soir** (souvent celui de la conjointe).

Test de chaque écran : **est-ce que Gérard comprend quoi faire en deux secondes, d'une main ?**

Les huit règles : simplicité avant richesse · moins de charge mentale · moins de texte · moins de clics · plus de clarté · plus de rapidité · plus de confiance · plus de plaisir à l'utiliser. Chaque évolution doit être justifiée par une douleur réelle observée chez les artisans.

## Sources à lire (en lecture seule)

- Recherche sur les douleurs réelles : `C:\Users\thfoi\OneDrive\Desktop\claude cowork os\compyo\recherche-douleurs-artisans.md`. C'est la source de vérité sur le « pourquoi ».
  - Le devis n'est **pas** la douleur n°1. Les douleurs n°1 sont l'administratif du soir, l'information éparpillée, la journée qui ne se ferme jamais, le silence avec le client et la gêne d'écrire une relance.
  - 60 % des conjoints travaillent dans l'entreprise, à 91 % des épouses. La vraie équipe d'une TPE, c'est souvent **un terrain et un bureau**.
- Décisions déjà prises et idées écartées : `docs/idees-futures.md` (dans le dépôt). Si tu proposes de rouvrir une idée écartée, dis-le explicitement et justifie.
- Inventaires de l'état actuel, produits par d'autres agents : `refonte-maquettes/_inventaire/` (01 écrans et mesures, 02 statut des prompts précédents, 03 équipe et sécurité, 04 langage visuel, 05 écrans cœur). **Vérifie dans le code ce qui compte pour ta décision** : ne te fie pas aveuglément aux inventaires.
- Captures de l'état actuel (360/390/1440 px, clair/sombre) : `refonte-maquettes/captures/avant/` (PNG, lisibles avec l'outil Read).
- Le code : dépôt `C:\Users\thfoi\OneDrive\Desktop\claude cowork os\compyo\compyo-app\compyo-app` (Next 14 App Router, TypeScript, Tailwind 3.4, Supabase).

## Contraintes non négociables

- **L'IA propose, l'artisan valide, toujours.** Aucun prix fixé par l'IA. Aucun message, devis ou facture envoyé sans geste explicite. Tout message au client part du téléphone de l'artisan, par son application SMS ou WhatsApp, quand il appuie lui-même sur envoyer.
- **Aucune dépendance nouvelle.** Pas de shadcn. Pas de framer-motion. Animations en CSS uniquement.
- **Couleurs par tokens uniquement** : `paper`, `paper-warm`, `ink`, `steel`, `signal`, `signal-clair`, `signal-fonce`, `anthracite`, `surface` (et `succes`, `alerte-orange`, `gris-clair` qui existent déjà). L'accent `signal` reste rare : **trois ou quatre apparitions par écran au plus**.
- Zones tactiles d'au moins 48 px. Actions principales à portée du pouce. `prefers-reduced-motion` respecté. Mode clair et mode sombre.
- **Aucun nouveau canal de communication.** Pas de messagerie interne, pas de portail client.
- **Rien ne se perd, jamais** : toute saisie de plus de dix secondes survit à une coupure réseau, à un changement d'application et à un rechargement.
- Le tarif gelé et la lecture conservée (`lib/confiance.ts`) restent des engagements tenables.
- **Sécurité des équipes** : l'isolation et toute limite de rôle se jouent en base (RLS / fonctions `security definer` auditées), jamais seulement dans l'interface. Les routes API et IA contournent l'interface.
- **On ne supprime aucune donnée ni aucune route.** On retire de la navigation et de l'affichage, mais le contenu et les liens existants restent accessibles.

## Ce qui est refusé d'office

- Des écrans plus riches ou des options de configuration.
- Des « assistants » supplémentaires.
- Des onglets pour cacher un écran trop chargé.
- Des infobulles de tutoriel.
- Des badges, des scores de jeu, de la gamification.
- Du texte de plus d'une ligne dans un écran de travail.
- De nouvelles notifications.
- L'envoi automatique de quoi que ce soit au client.

## Les critères de jugement (pondérés, sur 100)

| Critère | Poids |
|---|---|
| Charge mentale | 30 |
| Nombre de gestes pour les tâches fréquentes | 20 |
| Lisibilité et accessibilité à 360 px, au soleil, avec des gants | 20 |
| Risque technique et de régression | 15 |
| Coût de migration et de réécriture | 10 |
| Cohérence avec le reste de l'application | 5 |

Un brief de duel peut ajuster les poids s'il le justifie, mais ne supprime jamais un critère.

## Format attendu d'un candidat (agents « solveurs »)

Écris deux fichiers dans le dossier de ton duel (`refonte-maquettes/duel-<X>/`) :

1. **`candidat-<lettre>.html`** : une maquette basse fidélité, statique et jetable.
   - Elle utilise `<link rel="stylesheet" href="../_commun/maquette.css">`.
   - Chaque écran de téléphone est un `<div class="tel">` de 360 px, avec de vrais textes en français et des données réalistes (Gérard, plaquiste, ses clients).
   - Montre au moins l'écran principal et les états ou feuilles qui comptent pour la décision. Ajoute une vue ordinateur `.ordi` si le parcours du soir est en jeu.
   - **Aucune couleur en dur** : utilise seulement les variables `rgb(var(--c-…))`, sauf du blanc `#fff` sur un fond signal.
   - Une ligne de légende sous chaque écran (`.note-maquette`), pas plus.
2. **`candidat-<lettre>.md`** : l'argumentaire, une page maximum.
   - L'approche en 3 phrases.
   - La douleur traitée, avec une citation de la recherche.
   - Ce qui est supprimé, fusionné ou ajouté, et ce que l'artisan perd.
   - Le décompte de gestes des tâches fréquentes du duel, avant et après.
   - L'impact technique : fichiers touchés, migration de données éventuelle, risques de régression.
   - Le découpage en lots livrables si c'est risqué (jamais de « big bang »).
   - Ta propre auto-évaluation sur les 6 critères, avec tes deux faiblesses principales.

**Tu ne modifies AUCUN fichier du dépôt en dehors de ces deux fichiers. Tu ne lances aucun serveur, aucune migration, aucune écriture en base.** Le serveur de développement tourne déjà sur http://localhost:3000. Le banc d'aperçu à données simulées est `/apercu-moins?ecran=…` (voir `app/apercu-moins/Apercu.tsx`). Tu peux le lire, pas le modifier.

Termine en renvoyant un résumé de 10 lignes maximum.
