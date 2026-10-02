# Candidat D — La porte de chantier

**Approche.** Deux portes, aucun rôle. Le *bureau* (la conjointe) reste membre complet, comme aujourd'hui. Le *coéquipier de chantier* n'est pas membre : Gérard lui envoie un lien par WhatsApp, sans compte ni mot de passe, qui ne sait que **déposer** photos, dictées et notes dans le carnet d'un chantier. Absent de `memberships`, il échappe à toutes les policies existantes (`mes_organisations()`) : la base ne lui ouvre rien, sans table à scinder ni rôle à restreindre.

**Douleur.** « Ce n'est pas un problème de permissions, c'est un problème de transmission. » (recherche, douleur employés et conjoint). Limite : la recherche ne documente ni apprenti à qui cacher les prix, ni sous-traitance, ni comptable. D ne traite que « le terrain capte, le bureau transforme », et ne rouvre aucune idée écartée.

## Les 8 questions

1. **Modèle.** Des rôles légers obligeraient à scinder `devis` et `parametres_entreprise` (la RLS filtre des lignes, pas des colonnes, inventaire 6.a). D garde un espace unique pour « la maison » et ajoute une porte de dépôt. Artisan seul : invisible, la ligne « Équipe » de Paramètres existe déjà.
2. **Qui voit quoi.** Le coéquipier de chantier ne voit jamais prix, marges, bilan ni factures, **par construction** : aucune table ne lui est lisible. Il ne reçoit que (nom du client, adresse, heure). Coût : 0 policy modifiée, 0 table scindée. Limite : le bureau et les employés avec compte voient toujours tout (F8, F9 inchangées).
3. **Attribution.** Oui pour le chantier : `acces_id` et `auteur_prenom` (copie, survit au retrait) sur deux tables ; photos : marqueur `c<8 hex>` dans le nom de fichier (compatible avec `datePhoto`). Prénom affiché sur ces seules entrées, jamais en solo. Pas d'attribution du bureau en V1 (`created_by` forcé par trigger, inventaire 6.b).
4. **Coéquipier en pratique.** « Chantiers d'aujourd'hui » (planning du jour et chantiers en cours), puis Photo, Dicter, Note. Ni valider un devis, ni écrire au client, ni corriger, ni relire le carnet : aucune fonction ne le permet. Sa dictée va dans `notes_vocales`, déjà lue par les trois routes IA : aucun nouveau canal.
5. **Invitation.** Terrain : lien préparé par Compyo, envoyé par Gérard (`wa.me` ou `sms:`, comme `FeuilleMessageClient`) ; ni e-mail ni compte, donc aucun oracle. Bureau : l'e-mail reste le bon canal (vrai compte requis, et `creerCompteCandidat` interdit d'élargir la création de comptes), avec une réponse unique et neutre quelle que soit l'adresse ; « Renvoyer » remplace le 409 et les erreurs Supabase brutes.
6. **Plusieurs organisations : écartée.** `unique(user_id)` reste. Le partage projet par projet (évalué) ajouterait un `OR … partages` à 8 policies au moins, réécrirait le Storage et exposerait les clients d'une entreprise à une autre ; une seconde appartenance fait renvoyer `null` à `getOrganisationId` dans 49 fichiers. Sous-traitant : un lien « chantier ». Expert-comptable : toujours prématuré, l'export CSV existe (`/api/factures/export-comptable`). Conjointe de deux entreprises : deux adresses.
7. **Sortie propre.** Terrain : « Retirer » pose `retire_le` (la ligne reste), le lien meurt aussitôt, les dépôts restent (`artisan_id` = propriétaire, prénom copié). Photos sous `{organisation_id}/…`, indépendantes de toute personne. Bureau : inchangé, plus le lot 0 (F3, F7).
8. **Tarif.** Le terrain n'est pas un compte et ne peut pas appeler l'IA (pas de JWT) : il ne coûte que du stockage. Le compter comme siège ? Au fondateur de décider ; un lien partagé à trois contournerait le comptage.

## Supprimé, fusionné, ajouté, perdu
Fusionné : `EquipeSection` et `GestionEquipe` ; `/dashboard/equipe` redirige (rien n'est supprimé). Retiré de l'écran : `window.confirm`, l'e-mail tapé pour le terrain, les erreurs brutes. Ajouté : 2 tables, 7 fonctions, 3 pages, une boîte d'envoi locale. L'artisan ne perd rien ; le terrain ne relit ni ne corrige.

## Gestes (estimés sur les écrans actuels ; Plus, Paramètres, Équipe = 3)
| Tâche | Avant | Après |
|---|---|---|
| Ajouter l'apprenti, côté Gérard | 6 (3 + nom, e-mail, Inviter) | **8** (3 + Chantier, prénom, WhatsApp, contact, envoyer) |
| …côté apprenti | ≈ 5 (mail, lien, mot de passe, connexion) | 1 (ouvrir le lien) |
| Photo ou dictée de l'apprenti | ≈ 8 | 5 (ouvrir, chantier, Photo, déclencher, valider) |
| Retirer quelqu'un | 5 (avec `window.confirm`) | 5 (feuille de confirmation) |

Honnêtement : Gérard fait 2 gestes de plus ; le gain est du côté de l'apprenti.

## Modèle de données et RLS (pseudo-SQL)
```sql
create table acces_chantier (               -- le coéquipier de chantier : PAS un membre
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations on delete cascade,
  prenom text not null check (char_length(prenom) between 1 and 40),
  jeton_hash bytea not null unique,         -- sha256 ; jamais le jeton en clair
  jeton_expire_le timestamptz,              -- lien jamais ouvert : 7 jours
  retire_le timestamptz, vu_le timestamptz, cree_le timestamptz default now());
alter table acces_chantier enable row level security;
create policy lire on acces_chantier for select
  using (organisation_id in (select mes_organisations()));   -- aucune policy d'écriture
revoke select (jeton_hash) on acces_chantier from anon, authenticated;
alter table notes_vocales add column acces_id uuid references acces_chantier on delete set null,
  add column auteur_prenom text, add column cle_client uuid unique;   -- cle_client : renvoi sans doublon
alter table evenements_projet add column acces_id uuid references acces_chantier on delete set null,
  add column auteur_prenom text;
-- Storage : branche ADDITIVE ; les chemins {uid}/… gardent leurs policies
create policy photos_org on storage.objects for select using (bucket_id = 'photos'
  and ((storage.foldername(name))[1])::uuid in (select mes_organisations()));
-- Fonctions security definer, search_path = public, revoke all from public :
creer_acces_chantier(prenom) -> jeton      -- rôle 'proprietaire' vérifié DANS la fonction
retirer_acces_chantier(id) ; renouveler_acces_chantier(id) -> jeton
-- grant execute to anon (le jeton EST l'identité). Chacune commence par :
--   select … into a from acces_chantier where jeton_hash = sha256(convert_to(p_jeton,'UTF8'))
--     and retire_le is null and coalesce(jeton_expire_le,'infinity') > now();  not found -> raise
chantiers_actifs(jeton) -> (demande_id, nom_client, adresse_client, debut, aujourdhui)
deposer_note(jeton, demande_id, texte, cle)     -- notes_vocales, artisan_id = organisations.cree_par
deposer_photos(jeton, demande_id, chemins)      -- chemins préfixés '<org>/<demande>/' ; demandes.photos || …
valider_acces(jeton, demande_id) -> organisation_id   -- pour signer l'envoi (service_role borné)
-- Audit : colonnes nommées (jamais demandes.*), tout filtré par a.organisation_id, 60 dépôts/h/accès.
```

## Impact technique, migration, lots
- **Nouveaux** : migration SQL additive ; `app/c/[jeton]/route.ts` (cookie HttpOnly), `app/c/page.tsx`, `app/c/chantier/[id]/page.tsx`, `app/api/chantier/{signer,deposer}/route.ts`, `lib/boiteDepot.ts` (IndexedDB, photos). **Modifiés** : `EquipeSection.tsx`, `app/dashboard/equipe/page.tsx`, `Carnet.tsx`, `entreesCarnet.ts`, `demandes/[id]/page.tsx`, `inviter/route.ts`, `middleware.ts` (`/dashboard` sans session mais avec cookie chantier renvoie vers `/c`, car le `start_url` de la PWA est le tableau de bord). **Intouchés** : `lib/organisation.ts` et ses 49 appelants, les 7 routes IA, toutes les policies existantes. Aucune migration de données.
- **Risques** : surface anonyme nouvelle (déjà trois dans le dépôt : F5, F11, F12) ; la dictée du terrain entre dans les prompts IA comme toute note (l'artisan valide) ; IndexedDB purgeable.
- **Lot 0** (utile à tous, d'abord) : F3 (`RESTRICT` sur les documents légaux), F5 et F12 (`revoke`), F7 (purger le push au retrait). Il pose le standard « revoke public + grant explicite » avant toute fonction anonyme.
- **Temps 1, compatibilité** (additif, derrière un drapeau, réversible par `drop`) : lot 1 SQL, fonctions et policy Storage, testés avec deux jetons de deux organisations ; lot 2 pages `/c`, boîte d'envoi, feuille « Ajouter quelqu'un » ; lot 3 prénom au carnet, fusion des deux écrans, réponse neutre.
- **Temps 2, resserrement** (après 2 à 3 semaines d'usage) : `CHECK` sur `memberships.role`, taille et type du bucket `photos`, e-mail relégué sous « Mon bureau ». Aucune suppression de route ni de donnée. Retour arrière : drapeau coupé, `drop` ; les notes déposées restent valides.

## Auto-évaluation (poids du duel)
Charge mentale **18/25** · Gestes **7/10** · Lisibilité **8/10** · Risque, régression, sécurité **20/30** · Migration **12/15** · Cohérence **6/10** = **71/100**.

**Faiblesse 1 : un lien est une clé qui se transmet.** Un WhatsApp transféré ou un téléphone prêté donnent noms, adresses du jour et droit de dépôt, jusqu'au retrait, sans second facteur. Chaque fonction anonyme est à auditer, dans la classe de F5, F11 et F12.

**Faiblesse 2 : plus de code qu'il n'en retire, pour la moitié du problème.** Le bureau et les employés avec compte voient tout ; le terrain ne relit pas ce que le patron a noté ; `/c` est une seconde surface à tester. Si la complexité du code pèse plus que celle de l'usage, le repli est B plus le lot 0.
