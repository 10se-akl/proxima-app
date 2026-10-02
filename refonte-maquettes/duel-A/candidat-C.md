# Candidat C — Terrain / bureau : un espace, deux vues, une règle en base

**Approche.** Un seul espace partagé, comme aujourd'hui, mais chacun l'ouvre dans sa vue : le *bureau* (Sophie) voit tout ; le *terrain* (Léo, l'apprenti) voit chantiers, planning, notes et photos, jamais les prix. Le choix se fait une fois, quand Gérard prépare le lien d'invitation qu'il envoie lui-même par WhatsApp ou SMS. La limite est posée en base (RLS + une fonction auditée), l'interface la reflète. L'artisan seul ne voit rien de nouveau.

**Douleur.** « Le vrai "travail en équipe" d'une TPE du bâtiment, c'est très souvent un terrain et un bureau […] Ce n'est pas un problème de permissions, c'est un problème de transmission. » **Je rouvre une idée écartée** (rôles par employé, `idees-futures.md`, 08/09) pour un seul cas : la personne hors famille. L'audit (F8, F9) montre que tout membre peut changer l'IBAN et supprimer des projets, donc, par cascade, des factures. Pour le couple, C change peu (Sophie voit déjà tout) hormis le prénom dans le Carnet.

**Supprimé** : formulaire e-mail, `window.confirm`, doublon `GestionEquipe` (route gardée). **Fusionné** : les deux interfaces d'équipe en une. **Ajouté** : rôle terrain, lien d'invitation, prénom dans le Carnet (si ≥ 2 personnes), mêmes écrans avec moins de blocs pour le terrain. **Perdu** : Gérard ne « partage plus tout » ; il classe la personne ; plus d'invitation par e-mail.

## Les 8 questions

1. **Modèle.** Rôles légers : `proprietaire`, `employe` (affiché « Bureau »), `terrain`. Pas de case par écran. Écartés : espace unique (F8/F9 restent) ; partage par projet (un réglage par chantier, casse `unique(user_id)`). Artisan seul : un membre, aucune case.
2. **Qui voit quoi : RLS, pas masque.** `factures`, `parametres_entreprise` : bureau seul, lecture et écriture. `devis` mêle descriptif et prix, et la RLS filtre des lignes, pas des colonnes (`revoke select(col)` vise le rôle `authenticated`, commun à tous). Choix : table fermée au terrain + `devis_terrain()` (travaux sans prix, **sans `id`**, jeton du lien public). Tables séparées : plus propre, ~16 fichiers à réécrire ; vue `security_invoker` : ne renvoie rien. Journal : liste blanche de types (`detail` = « 1 234,00 € TTC »). Notes de relance des crons : `bureau_seul`. Texte libre (« il veut 8 000 € ») : non protégeable.
3. **Attribution.** Oui : prénom sur l'entrée du Carnet, s'il y a ≥ 2 membres. Aucune colonne neuve (`artisan_id` existe ; photos : uploader dans le chemin). Coût : un trigger forçant `artisan_id = auth.uid()` (falsifiable aujourd'hui), une policy gardant le nom d'un ancien membre.
4. **Terrain en pratique.** « Aujourd'hui » + fiche sans devis ni facturation. Il dicte, photographie, note, crée un chantier. Il ne valide pas de devis (acte financier) et n'écrit pas au client depuis Compyo.
5. **Invitation.** E-mail : mauvais canal (adresse au gant, lien expirant en 24 h sans renvoi). Lien à usage unique, 7 jours, préparé comme un « message au client » (`ouvrirMessage`) et envoyé par Gérard, qui ne tape aucune adresse et n'apprend rien sur l'existence d'un compte. Déjà inscrit : « J'ai déjà un compte » ; s'il a son propre espace, message neutre.
6. **Plusieurs organisations.** Écartées : 49 fichiers appellent `getOrganisationId` ou `getMembership` (une seule ligne attendue), Storage par utilisateur. Expert-comptable : toujours prématuré (l'export comptable existe) ; C en ferait un 4ᵉ rôle, mais il lui faut le multi-organisation.
7. **Sortie.** Notes, rendez-vous, projets restent (clés sur l'organisation). À corriger : photos lisibles (F6), push purgés (F7), rappels ouverts au propriétaire, jamais de suppression du compte Auth (F3).
8. **Tarif.** À signaler : un siège terrain moins cher devient pensable, mais le tarif par siège double l'abonnement d'un couple.

## Esquisse SQL (pseudo)

```sql
alter table memberships add check (role in ('proprietaire','employe','terrain'));  -- employe = Bureau
create function mes_organisations_role(variadic r text[]) returns setof uuid
  language sql stable security definer set search_path = public as
  $$ select organisation_id from memberships where user_id = auth.uid() and role = any(r) $$;
-- BUREAU = mes_organisations_role('proprietaire','employe')

-- argent : bureau seul. select/insert/update séparés, JAMAIS « for all » sur factures (pas de DELETE, voulu)
create policy factures_lire on factures for select using (organisation_id in (BUREAU));
-- idem devis (4 policies), parametres_entreprise (lecture + écriture)

-- journal : le terrain ne lit ni n'écrit que la liste blanche (nouveau type = invisible)
create policy evt_lire on evenements_projet for select using (organisation_id in (BUREAU)
  or (organisation_id in (select mes_organisations()) and type in ('projet_cree','note_ajoutee',
      'note_vocale_ajoutee','photo_ajoutee','rdv_planifie','chantier_demarre','chantier_termine')));

-- seule porte du terrain vers le devis : ni prix, ni id
create function devis_terrain(p_demande uuid) returns table(numero text, objet text,
  adresse_chantier text, date_debut_prevue date, duree_estimee text, travaux jsonb)
  security definer ... as $$ select d.numero, d.objet, d.adresse_chantier, d.date_debut_prevue,
  d.duree_estimee, (description, quantite, unite de chaque ligne de d.lignes)
  from devis d where d.demande_id = p_demande and d.organisation_id in (select mes_organisations()) $$;
revoke execute on function devis_terrain(uuid) from public, anon;

alter table notes add column bureau_seul boolean not null default false;  -- crons de relance : true
-- demandes, clients : delete = BUREAU.  prochain_numero_facture : contrôle de rôle (F5).
-- storage 'photos' : accès par chantier (2ᵉ segment du chemin), sans déplacer un fichier (F6).
-- invitations(organisation_id, role, prenom, jeton_hash unique, expire_le, utilise_le) : RLS sans policy.
```

## Gestes (téléphone)

| Tâche | Avant | Après |
|---|---|---|
| Inviter | 6 appuis, 2 saisies (nom, **e-mail**) ; invité : mail, lien, mot de passe, valider | 6 appuis, 1 saisie (prénom), envoi dans WhatsApp (hors Compyo) ; invité : lien, mot de passe, valider |
| Retirer | 5 (dont `confirm()`) | 5 (feuille qui dit ce qui reste) |
| Terrain : où aller | Accueil complet : 20 à 35 cibles | 12 cibles |
| Qui a noté | impossible | 0 appui : prénom au Carnet |

## Impact, lots, migration

**Technique.** SQL additif : ~14 policies, 2 fonctions, 1 table, 1 trigger, 1 colonne. TypeScript, **estimation ~25 fichiers** : `lib/organisation.ts`, layout et `Sidebar`, Accueil et fiche en mode terrain, 5 pages d'argent (redirection), ~8 routes (garde 403), 2 crons, `equipe/*`, `rejoindre`. Aucune donnée migrée (`employe` devient « Bureau »). Signature publique et crons inchangés. **Risques** : une fonction de rôle fautive verrouille devis et factures pour tous ; la RLS répond `[]` sans erreur, donc un écran terrain oublié paraît vide ; une future table d'argent est ouverte par défaut (test « canari » à écrire ; le dépôt n'a aucun test automatisé) ; `/rejoindre` est une route publique qui crée des comptes (jeton 256 bits, limite de débit).

**Temps 1, compatibilité** (additif ; retour = `drop`). L1 : fonction de rôle, CHECK, trigger, policy photos, correctifs F3/F5/F10/F7. L2 : lien d'invitation, feuille Équipe unique, prénoms. L3 : vue terrain derrière un drapeau, organisation d'essai. **Invariant : « Terrain » n'apparaît dans aucune interface tant que la base ne l'applique pas.** **Temps 2, resserrement** (L4) : policies d'argent par rôle, `devis_terrain()`, liste blanche, `bureau_seul` ; matrice 3 rôles × tables × 4 opérations + RPC sur une branche Supabase ; puis drapeau ouvert. Retour arrière : script inverse, après avoir retiré les membres « terrain » (jamais d'accès complet par défaut).

## Auto-évaluation (poids du duel A)

Charge mentale 20/25 (solo invisible, un seul choix) · Gestes 6/10 · Lisibilité 8/10 · Risque et sécurité 19/30 · Migration 8/15 · Cohérence 7/10 · **Total 68/100.**

**Faiblesse 1 : le coût réel de la restriction.** « Sans prix » traverse 5 tables, des notes générées, le journal, Storage et deux fonctions ; chaque oubli est une fuite ou un écran vide. **Faiblesse 2 : une valeur pour une minorité.** La douleur documentée est la transmission entre conjoints, qui n'ont pas besoin de restriction ; C ne vaut que pour l'artisan avec un salarié ou un apprenti qui utiliserait l'application, non mesuré (`candidatures.nb_employes` le permet). **Recommandation : L1 et L2 dans tous les cas ; L3 et L4 si ce besoin se confirme.**
