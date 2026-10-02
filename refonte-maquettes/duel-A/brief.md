# Duel A — Le modèle d'équipe (le plus important, et le plus risqué)

**Le problème en une phrase.** Aujourd'hui, l'équipe est un organigramme minimal où tout le monde voit tout, sans trace de qui a fait quoi. La réalité d'une TPE du bâtiment, c'est un terrain qui capte et un bureau qui transforme.

**La douleur.** La recherche dit : « Le vrai "travail en équipe" d'une TPE du bâtiment, c'est très souvent un terrain et un bureau : l'artisan qui capte l'information sur le chantier, la conjointe qui la transforme en devis et en factures le soir ou le lendemain. Ce n'est pas un problème de permissions, c'est un problème de transmission. » Mais aussi : le public ne veut pas d'un organigramme, et chaque ligne de configuration est un mur.

**L'état actuel.** Lis `_inventaire/03-equipe-securite.md` **en entier**, et vérifie dans `supabase/schema.sql` (Module 14), `lib/organisation.ts`, `app/api/equipe/*`, `components/dashboard/GestionEquipe.tsx` et `EquipeSection.tsx`. Les points clés :
- une organisation, deux rôles (`proprietaire`, `employe`), et tout le monde voit tout ;
- l'invitation se fait par e-mail ; un utilisateur appartient à une seule organisation (`unique(user_id)`) ;
- il y a deux interfaces d'équipe ;
- les photos et le logo sont stockés par utilisateur (`{uid}/…`) ;
- l'audit a relevé des failles (F1 à F13) : tiens-en compte.

**Questions que le duel DOIT trancher, une réponse argumentée par question :**
1. **Le modèle.** Faut-il un espace unique partagé (l'actuel), un modèle terrain / bureau (deux vues d'un même espace selon la personne), des rôles légers (propriétaire, bureau, terrain), ou du partage projet par projet entre comptes ? Quelle est la configuration par défaut d'un artisan seul (le cas le plus courant) : doit-elle rester invisible ?
2. **Qui voit quoi.** Un apprenti sur le chantier doit-il voir les prix, les marges, le bilan, les factures ? Si non, c'est une règle de **sécurité (RLS)**, pas un masquage d'interface. Dis précisément comment l'appliquer en base, et ce que cela coûte (tables séparées ? vues ? colonnes ?).
3. **L'attribution.** Le carnet doit-il afficher « qui a noté / photographié / dicté / modifié ça » ? À quel coût de complexité ?
4. **Le coéquipier de terrain en pratique.** Une vue réduite « mes chantiers du jour » ? Peut-il capter (dictée, photo, note) ? Valider un devis ? Écrire au client ?
5. **L'invitation.** L'e-mail est-il le bon canal pour ce public ? Un lien d'invitation que l'artisan envoie lui-même par WhatsApp ou SMS (Compyo prépare, c'est lui qui envoie) est-il plus simple ? Que se passe-t-il quand la personne invitée a déjà un compte ? Ne jamais révéler si une adresse a un compte.
6. **Plusieurs organisations.** La conjointe qui aide deux entreprises, l'expert-comptable, l'artisan qui sous-traite : on l'autorise ou on l'écarte explicitement ? L'accès gratuit pour l'expert-comptable a été jugé prématuré : est-ce toujours vrai ?
7. **La sortie propre d'un membre.** Que deviennent ses notes, ses rendez-vous, ses projets, ses photos ? Rien ne doit être perdu ni orphelin.
8. **Le tarif.** Facturer par siège changerait l'économie du produit : signale-le, ne le décide pas.

**Interdits.** Pas de permissions à la carte, pas d'équipes imbriquées, pas de messagerie entre membres. Pas d'assignation fine de tâches à des personnes, sauf si tu démontres qu'elle retire plus de charge qu'elle n'en ajoute à un artisan avec un apprenti.

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer au modèle.** On garde l'espace unique partagé, on corrige seulement les failles et on supprime le doublon d'interface.
- **B — Le plus soustractif.** Par exemple, une seule personne de plus possible (« votre bureau » ou « votre compagnon »), sans rôle visible.
- **C — Terrain / bureau.** Deux vues d'un même espace selon la personne, avec une restriction en base pour le terrain.
- **D — Une logique différente.** Partage projet par projet entre comptes indépendants (multi-organisation), ou autre modèle que tu juges meilleur.

**Chaque candidat livre aussi :**
- les écrans d'invitation au téléphone et de retrait (une feuille de confirmation, pas `window.confirm`), et la vue du coéquipier ;
- l'esquisse du modèle de données et des politiques RLS, en pseudo-SQL dans le `.md` ;
- le plan de migration réversible en deux temps (compatibilité d'abord, resserrement ensuite) ;
- ce que voit un artisan seul (rien de nouveau, idéalement).

**Les poids sont ajustés pour ce duel.** Charge mentale 25 · Gestes 10 · Lisibilité 10 · **Risque technique, régression et sécurité 30** · Coût de migration 15 · Cohérence 10. Ce duel touche au modèle de données et à l'isolation entre clients.
