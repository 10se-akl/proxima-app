# Consignes communes d'implémentation (refonte, 03/10)

Le fondateur a validé toutes les décisions des duels (`docs/decisions-refonte.md`), avec les recommandations des juges comme choix par défaut :
- bouton principal en encre ;
- 5e case « Argent » ;
- aucun mot de rôle dans l'équipe ;
- Carnet replié ;
- pas de « pour qui » au planning ;
- IBAN réservé au propriétaire ;
- invitations valables 14 jours, qui passent devant la liste d'attente ;
- titres « À régler » et « À suivre » ;
- règle « À facturer » : chantier terminé, devis accepté, solde > 0 après acomptes et avoirs ;
- pas de file d'écriture hors ligne (on assume « Pas enregistré. Réessayer. ») ;
- pas de « Rouvrir le chantier » ;
- le bilan chiffré du soir quitte l'accueil.

## Avant de coder

1. Tu travailles dans une **copie isolée du dépôt** (git worktree). Les `node_modules` n'y sont pas. Crée une jonction avant toute vérification :
   `cmd /c mklink /J node_modules "C:\Users\thfoi\OneDrive\Desktop\claude cowork os\compyo\compyo-app\compyo-app\node_modules"`
   (depuis la racine de ta copie). Ne la commite jamais : elle est ignorée par `.gitignore`.
2. Lis `docs/langage-interface.md` (règles d'écran), l'arbitrage de ton duel (`refonte-maquettes/duel-X/arbitrage.md`), et les fichiers que tu touches, en entier.

## Règles non négociables

- **Pile technique.** Next 14 App Router, TypeScript, Tailwind 3.4 (syntaxe v3). **Aucune dépendance nouvelle.** Pas de shadcn ni de framer-motion. `components/ui/Button.tsx` existe déjà ; ne crée jamais un `button.tsx`.
- **Couleurs.** Tokens seulement (`paper`, `paper-warm`, `ink`, `steel`, `signal`, `signal-clair`, `signal-fonce`, `anthracite`, `surface`, `succes`, `alerte-orange`, `gris-clair`), jamais de hex. Le terracotta plein ne sert qu'au « + » de la barre du bas.
- **Écran.** Un seul bouton plein par écran, en encre (`bg-ink text-paper`). Cibles d'au moins 48 px. `motion-safe:` pour toute animation. Mode clair et sombre par les tokens.
- **Envois.** L'IA propose, l'artisan valide. Aucun envoi automatique. Tout message au client s'ouvre dans les SMS ou WhatsApp de l'artisan (`lib/messagesClient.ts`, `components/projet/FeuilleMessageClient.tsx`).
- **Rien ne se perd.** Toute saisie de plus de 10 s a un brouillon local (`lib/brouillonLocal.ts`). Rien ne s'affiche comme réussi avant d'avoir lu le résultat de l'écriture.
- **Base de données.** Aucune requête ni migration exécutée sur une base, jamais. `.env.local` pointe sur la production. Les migrations s'écrivent dans des fichiers, c'est le fondateur qui les passe.
- **Suppressions.** On ne supprime aucune route ni aucune donnée. On retire de la navigation ou de l'affichage, et une route conservée peut rediriger.
- **Périmètre.** Reste dans **ton périmètre de fichiers** (donné dans ta mission). Si tu dois toucher un fichier hors périmètre, fais le plus petit changement possible et dis-le dans ton rapport.
- **Commentaires.** Mêmes conventions que le code existant : commentaires en français, datés « Refonte (03/10) », qui expliquent le *pourquoi*.

## Commits

- **Un commit par lot logique**, dès que le lot passe `npx tsc --noEmit`. Message en français, à l'impératif descriptif comme l'historique (« Planning (duel G, lot 2) : … »), corps qui dit ce qui change pour l'artisan.
- Chaque message se termine par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commite tôt et souvent** : une coupure (limite d'utilisation) peut t'arrêter à tout moment. Ce qui n'est pas commité est perdu.
- `npx tsc --noEmit` doit passer avant chaque commit. `npm run build` n'est pas demandé : il échoue en local sur `/icon` pour une raison d'environnement.
- Ne pousse rien. Ne touche pas à `master`.

## Ton rapport final (15 lignes maximum)

- La liste de tes commits (hash et titre).
- Ce qui est fait et ce qui ne l'est pas.
- Les fichiers hors périmètre touchés.
- Ce qui doit être testé sur un vrai téléphone.
- Pour le chantier Équipe seulement : l'ordre exact des migrations et des déploiements.
