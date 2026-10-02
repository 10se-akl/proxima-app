# Candidat B — « Quelqu'un avec vous » (le plus soustractif)

**Approche.** Une entreprise = le propriétaire + au plus **une** autre personne, sans rôle affiché, qui voit ce que le propriétaire voit. On ne remplace pas la confiance entre deux personnes par un menu de permissions : on la dit en une phrase à l'ajout (« Elle verra tout ce que vous voyez »). La base garde trois limites dures, pour l'argent et les documents légaux : inviter/retirer, changer l'IBAN, supprimer un projet ou un devis. L'invitation est un lien que Gérard envoie lui-même par WhatsApp ou SMS. Aucune idée écartée de `docs/idees-futures.md` n'est rouverte.

**Douleur.** « Ce n'est pas un problème de permissions, c'est un problème de transmission » (recherche, *Employés et conjoint* ; 60 % des conjoints travaillent dans l'entreprise, 91 % d'épouses). Dans un espace commun la transmission est déjà faite : ce que Gérard dicte à 14 h 12 est sur l'écran de Sandrine le soir. Il manque le prénom (« qui a noté ça ») et une sortie propre.

## Les 8 questions

1. **Modèle.** Espace unique partagé, plafonné à 2 personnes actives. Terrain/bureau, trois rôles, partage par projet : écartés. L'artisan seul ne voit rien de neuf : l'organisation existe déjà en coulisse ; une ligne « Quelqu'un avec vous » dans Paramètres ; le badge « Propriétaire » disparaît.
2. **Qui voit quoi.** Tout, pour les deux. Cacher les prix en base exige de séparer `devis_montants` et `parametres_tarifs` (refonte du générateur, de `obtenir_devis_public`, des verrous, des relances : inventaire 03 §6.a), pour un cas minoritaire. L'apprenti n'a pas de compte : il est avec Gérard, qui capte. `role` et `suis_proprietaire()` laissent la porte ouverte à un « terrain ».
3. **Attribution.** Prénom + heure sur note, dictée, photo, **seulement à deux**. « Créé par », pas « modifié par » (pas de journal). Aucune colonne : `artisan_id` existe, un trigger l'empêche d'être usurpé. Coût : 1 trigger, 4 composants.
4. **Coéquipier de terrain.** La même application, sans vue réduite : il dicte, photographie, note, valide un devis. Accroc assumé : un message au client part du téléphone de qui appuie sur envoyer.
5. **Invitation.** L'e-mail prouve l'identité de l'invitée ; ce n'est pas le bon canal pour inviter. Lien à usage unique, 3 jours, 128 bits, haché en base ; Compyo prépare, Gérard envoie. Elle tape son e-mail ; réponse toujours « Regardez votre boîte mail », compte connu ou non ; rattachement après preuve de la boîte. Déjà connectée et libre : « Rejoindre ». Déjà rattachée ailleurs : « Ce lien ne peut pas être utilisé », vu d'elle seule. Le 409 et le message Supabase brut disparaissent.
6. **Plusieurs organisations.** Écarté. `unique(user_id)` reste : une personne retirée est marquée `retire_le`, pas détachée, donc ne rejoint pas une autre entreprise (ferme F6b). Conjointe de deux entreprises : deux e-mails. Expert-comptable : toujours prématuré.
7. **Sortie propre.** `retire_le`, jamais de suppression. Notes, rendez-vous, projets, photos restent (ils appartiennent à l'organisation). Les photos restent lisibles : l'accès suit l'organisation de l'auteur du fichier (F6a, F6b). Abonnements push purgés, rappels de ses lignes redirigés vers le propriétaire (F7). Son nom reste lisible. « Rajouter » efface `retire_le`. Anciens retraits rattrapés depuis `artisan_id`, sauf ceux déjà réinvités ailleurs.
8. **Tarif (signalé, non décidé).** Le plafond fait de l'abonnement « vous + une personne » : second siège inclus ou payant ? Le plafond IA est par organisation (F1 corrigé) : un 2ᵉ compte ne double pas le quota.

## Données et RLS (pseudo-SQL)

```sql
-- TEMPS 1 : additif, neutre le premier jour (tous les retire_le sont null)
alter table memberships add column retire_le timestamptz;
alter table memberships add constraint role_ok check (role in ('proprietaire','employe')) not valid;
create or replace function mes_organisations() ... security definer stable as $$
  select organisation_id from memberships where user_id = auth.uid() and retire_le is null $$;
create function suis_proprietaire(o uuid) returns boolean ... as $$   -- même requête + role = 'proprietaire'
create function mon_statut() returns text ...;      -- 'actif' | 'retire' | 'aucun' (écran « plus d'accès »)
-- trigger plafond sur memberships : actifs de l'organisation hors new >= 2 -> raise 'equipe_pleine'
create table invitations (id uuid pk, organisation_id uuid not null references organisations on delete cascade,
  jeton_hash text unique not null, prenom text not null, expire_le timestamptz not null, utilise_le timestamptz);
alter table invitations enable row level security;  -- aucune policy : service_role seul
-- photos + logos : l'accès suit l'organisation de l'AUTEUR du fichier (1er segment du chemin), même retiré
create policy ... on storage.objects for all
  using (bucket_id in ('photos','logos') and exists (select 1 from memberships a
         where a.user_id = ((storage.foldername(name))[1])::uuid
           and a.organisation_id in (select mes_organisations())))
  with check (bucket_id in ('photos','logos') and (storage.foldername(name))[1] = auth.uid()::text
              and exists (select 1 from mes_organisations()));

-- TEMPS 2 : resserrement, un point à la fois
-- trigger parametres_entreprise : (iban,bic) changent, auth.uid() non nul, not suis_proprietaire(..) -> erreur
-- delete demandes : suis_proprietaire(organisation_id) ; delete devis : idem et statut = 'brouillon'
-- factures.demande_id, factures.artisan_id : on delete restrict (au lieu de cascade)
-- abonnements_push : using / with check (artisan_id = auth.uid())                          -- F10
-- trigger forcer_auteur (notes, notes_vocales, evenements_planning, evenements_projet, demandes) :
--   auth.uid() non nul : insert -> artisan_id := auth.uid() ; update -> artisan_id := old.artisan_id
-- alter table memberships validate constraint role_ok;
```

**Failles.** F1, F2 déjà corrigées. Communes à tous les candidats (lot 1) : F3, F4, F5, F11, F12. Dépendantes du modèle : F6, F7, F9, F10 traitées ci-dessus ; **F8 acceptée** (les deux voient et modifient tout) ; F13 réduite (sans organisation active, plus d'écriture dans `photos` ni `logos`).

## Gestes, avant → après

| Tâche | Avant | Après |
|---|---|---|
| Ajouter quelqu'un | Plus, Paramètres, Équipe, nom, adresse e-mail, Envoyer = **6** | Plus, Paramètres, Ajouter, prénom, WhatsApp = 5, plus 2 dans WhatsApp = **7**. Le gain est la saisie (un mot, aucune adresse), pas le nombre |
| Retirer | Plus, Paramètres, Équipe, lien 12 px, `window.confirm` = **5** | Plus, Paramètres, Retirer (48 px), feuille = **4** |
| Qui a noté / photographié | impossible | **0** : sur la ligne |
| Invitée avec compte | 409 ou erreur brute | ouvrir le lien, Rejoindre = **1** |

## Impact technique et lots

- **SQL** : une migration (colonne, 2 fonctions, 3 triggers, 1 table, ~8 policies). Aucune donnée déplacée, aucun chemin Storage migré, aucune table séparée.
- **Code** : `api/equipe/retirer` (marquage, purge push), `api/equipe/inviter` (messages neutres, gardée en secours), nouvelles `api/equipe/lien` et `api/equipe/rejoindre`, page publique `/rejoindre/[jeton]`, `lib/notifications/push.ts`, un composant d'équipe unique à la place de deux (`/dashboard/equipe` reste), `VueParametres`, 4 composants du carnet. `lib/organisation.ts` inchangé : la RLS filtre déjà les retirés.
- **Risques.** (1) `mes_organisations()` est le pivot de toutes les policies : essai sur une copie avec trois comptes ; retour arrière = supprimer d'abord les lignes `retire_le` non nulles. (2) Le plafond peut être déjà dépassé chez des testeurs : compter les membres par organisation avant. (3) Le lien est une porte publique : jeton fuité = accès complet, jusqu'à ce que Gérard voie un inconnu sur sa ligne.
- **Lots.** 1 : durcissements sans écran (F3, F4, F5, F10, F11, F12, IBAN, delete réservé). 2 : un écran et la sortie propre (`retire_le`, pivot, Storage, `retirer`, push, « plus d'accès », plafond). 3 : attribution. 4 : lien d'invitation, abandonnable (l'e-mail corrigé suffit). Le temps 1 ne change aucun comportement ; le temps 2 resserre un point à la fois, chacun avec son SQL inverse.

## Auto-évaluation (poids du duel)

| Critère | Note | Pourquoi |
|---|---|---|
| Charge mentale /25 | 22 | aucun rôle, une ligne, une phrase |
| Gestes /10 | 5 | 6→7 à l'invitation, 5→4 au retrait |
| Lisibilité /10 | 7 | cibles 48 à 56 px ; prénom d'auteur à 13 px |
| Risque, régression, sécurité /30 | 21 | isolation tenue par construction ; pivot RLS modifié, porte publique, F8 acceptée |
| Migration /15 | 11 | rien déplacé ; 3 routes ou pages, 1 migration |
| Cohérence /10 | 8 | prolonge « un compte = une entreprise » |
| **Total** | **74/100** | |

**Deux vraies faiblesses.** (1) Aucune limite de visibilité : un salarié ou un apprenti en deuxième personne voit prix, marges, factures, bilan ; et le plafond exclut le trio Gérard + apprenti + épouse (le compte va à qui fait l'administratif). Un vrai salarié se heurte à un mur. (2) Le lien d'invitation est la seule vraie nouveauté technique, une porte publique ; « une personne = une entreprise, pour toujours » est rigide. L'attribution ne dit pas qui a modifié.
