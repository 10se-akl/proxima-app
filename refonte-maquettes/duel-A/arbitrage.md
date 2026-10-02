# Duel A — Arbitrage : le modèle d'équipe et sa sécurité

> Juge. J'ai lu le protocole, les consignes, le brief (poids ajustés : risque et sécurité = 30), l'inventaire 03, les quatre candidats et leurs rendus, puis la critique. J'ai vérifié dans le dépôt ce qui est décisif (voir l'annexe, avec `fichier:ligne`), sans exécuter aucune requête SQL ni modifier d'autre fichier que celui-ci.
> Rappel : F1 et F2 sont corrigés (commit `1995ce2`). Le dernier module de `supabase/schema.sql` est le **Module 44** (l. 2459). Les migrations ci-dessous sont donc numérotées de **45 à 52**.

## La décision en bref

1. **Le vainqueur est A, « un seul espace partagé », avec 70/100.** Viennent ensuite B (59,5), D (44) et C (43).
2. **Trois greffes.** De B : l'auteur affiché sur le carnet, et une invitation que l'invité doit accepter. De C : la matrice de tests d'isolation, rejouée avant chaque migration.
3. **Quatre refus.** Le plafond à deux personnes (B), le rôle « terrain » (C), la porte anonyme (D) et le multi-organisation.
4. **Corrections imposées à A** (ce ne sont pas des greffes) :
   - aucun fichier n'est déplacé ;
   - F9 est vraiment fermée ;
   - F11 est ajoutée ;
   - F10 ne casse plus l'ordinateur partagé ;
   - la feuille de retrait ne promet rien que la base ne tienne déjà.
5. **Huit migrations, toutes réversibles.** Cinq sont additives (temps 1 : 45 à 49), trois resserrent les droits (temps 2 : 50 à 52).
6. **L'artisan seul ne voit rien de nouveau.** Pas de rôle, pas de prénom, pas d'écran en plus.

---

## 1. Les notes

| Critère (poids du brief) | A | B | C | D |
|---|---|---|---|---|
| Charge mentale (25) | 7 | 7 | 5 | 5 |
| Gestes (10) | 5 | 5 | 6 | 6 |
| Lisibilité à 360 px, soleil, gants (10) | 7 | 7 | 6 | 8 |
| **Risque, régression, sécurité (30)** | **7** | 5 | 3 | 2 |
| Coût de migration (15) | 7 | 6 | 3 | 5 |
| Cohérence (10) | 9 | 6 | 5 | 4 |
| **Total /100** | **70** | **59,5** | **43** | **44** |

**A — Un seul bureau partagé**
- Charge 7 : rien de neuf pour l'artisan seul, un seul écran, aucun choix. Mais « qui a noté quoi » reste sans réponse, alors que la recherche (l. 261) le nomme.
- Gestes 5 : aucun geste gagné. Il en faut 6 pour inviter, 9 si Gérard prévient par WhatsApp (recompté par la critique), et 5 pour retirer.
- Lisibilité 7 : « Retirer » passe d'un lien de 12 px à un bouton de 48 px, avec une vraie feuille. Le formulaire reste ouvert sur l'écran.
- Risque 7 : le pivot `mes_organisations()` et ses 49 appelants restent intacts, et aucune nouvelle porte publique n'est ouverte. En revanche :
  - F9 se contourne ;
  - F11 est oubliée ;
  - le déplacement des fichiers bute sur le verrou du devis.
- Migration 7 : ni table ni colonne. Le seul lot risqué est celui des fichiers, que je remplace.
- Cohérence 9 : A prolonge exactement la décision du 08/09 (`docs/idees-futures.md:66`) et la recherche (l. 328 : « permissions fines » écartées).

**B — « Quelqu'un avec vous »**
- Charge 7 : ni rôle ni réglage, et le prénom apparaît au carnet. En contrepartie, B introduit un état « équipe pleine » et une personne bloquée à vie, et l'invitée passe par WhatsApp, puis le web, puis sa boîte mail.
- Gestes 5 : 7 pour inviter, 4 pour retirer, 0 pour savoir qui a noté.
- Lisibilité 7 : cibles de 48 à 56 px, mais le prénom de l'auteur est en 13 px.
- Risque 5 : F6 est fermée élégamment, sans déplacer de fichier. Mais :
  - le pivot `mes_organisations()` change pour tout le monde, sans test ;
  - le lien d'invitation n'est lié à aucune adresse : un WhatsApp transféré fait entrer n'importe qui ;
  - le correctif F10 casse l'upsert `onConflict: "endpoint"` (`app/api/notifications/abonner/route.ts:47`) ;
  - six lecteurs de `memberships` ignorent `retire_le` ;
  - le plafond n'est protégé par aucun verrou.
- Migration 6 : rien n'est déplacé, mais B ajoute trois routes ou pages publiques et six lecteurs à corriger.
- Cohérence 6 : le plafond exclut le persona lui-même (Gérard, l'apprenti, l'épouse : `protocole.md:9`), et la règle « une personne = une entreprise, pour toujours » ne tient pas.

**C — Terrain / bureau**
- Charge 5 : l'artisan seul ne voit rien, mais Gérard classe chaque personne, et chaque écran existe en deux versions. C rouvre une idée écartée (`idees-futures.md:66`).
- Gestes 6 : le terrain gagne (12 cibles au lieu de 20 à 35), mais il faut 9 gestes pour inviter avec WhatsApp.
- Lisibilité 6 : au rendu 1, les liens « Retirer » soulignés font moins de 48 px.
- Risque 3 : C est le seul à poser une vraie limite en base et à proposer des tests. Mais il a deux défauts bloquants :
  - `/rejoindre` crée un compte sans preuve de la boîte mail, ce qui rouvre la classe de F2 ;
  - le stockage « par chantier » ignore les photos partagées (`app/api/partage/route.ts:83`) et les logos.

  S'y ajoutent la liste blanche du journal, qui avale ce que le terrain écrit, et une RLS qui renvoie `[]` en silence sur une quarantaine de fichiers, sans aucun test.
- Migration 3 : environ 40 fichiers, 14 policies, et une `devis_terrain()` à maintenir en parallèle du générateur.
- Cohérence 5 : deux fiches pour un même chantier, et le terrain perd « Prévenir le client » et l'alerte météo.

**D — La porte de chantier**
- Charge 5 : l'apprenti n'a rien à apprendre, mais Gérard choisit entre deux portes, donc deux modèles.
- Gestes 6 : Gérard fait 2 gestes de plus, l'apprenti en fait 4 à 7 de moins.
- Lisibilité 8 : l'écran de chantier est exemplaire (trois gros boutons, une main).
- Risque 2 : D accumule les surfaces exposées.
  - Cinq fonctions `security definer` sont ouvertes à `anon`, plus une signature d'envoi en service_role derrière un simple cookie.
  - Le lien n'expire plus une fois ouvert, et son jeton reste dans l'URL.
  - Les pages `/c` restent en cache dans `sw.js` après le retrait.
  - F6 reste ouverte pour les membres.
  - Une dictée anonyme entre dans les prompts de l'IA.
- Migration 5 : rien d'existant n'est réécrit, mais D ajoute 2 tables, 7 fonctions, 3 pages et une boîte d'envoi IndexedDB.
- Cohérence 4 : c'est une deuxième application à côté du tableau de bord.

C et D sont à égalité de fait. Ni l'un ni l'autre n'est assez sûr pour qu'on lui greffe son cœur.

---

## 2. Le vainqueur, ses greffes et ses corrections

### Pourquoi A

- **La sécurité pèse 30.** A est le seul qui ne touche ni au pivot de toutes les policies, ni aux 49 fichiers qui appellent `getOrganisationId` ou `getMembership`, et qui n'ouvre aucune nouvelle porte publique. B, C et D en ouvrent une chacun (un lien porteur ou des fonctions anonymes).
- **La recherche.** Elle dit : « ce n'est pas un problème de permissions, c'est un problème de transmission » (l. 189). Dans un espace partagé, la transmission est déjà faite : ce que Gérard dicte à 14 h, Sophie le voit le soir. Le seul manque que nomme la recherche, c'est « qui a noté quoi » (l. 261) : c'est la greffe 1.
- **C'est le plus soustractif qui tienne.** On ne crée ni rôle, ni plafond, ni second écran. On ferme des failles et on supprime une interface en double.

### Les trois greffes

1. **De B : l'auteur sur le carnet (« créé par », jamais « modifié par »).**
   - En base, un trigger force `artisan_id = auth.uid()` sur `demandes`, `notes`, `notes_vocales`, `evenements_planning` et `evenements_projet`, et l'empêche d'être réécrit.
   - À l'écran, on affiche le prénom **seulement quand l'auteur n'est pas vous**. L'artisan seul n'en voit donc jamais.
   - Pour les photos, le chemin garde l'auteur en deuxième segment.
   - Le nom survit au départ grâce à une petite table `anciens_membres`. C'est **à la place** du `retire_le` de B, qui modifiait le pivot.
2. **De B : l'invitation qu'on accepte.**
   - Il n'y a plus jamais de rattachement direct : le chemin de « réactivation » (`app/api/equipe/inviter/route.ts:93`) disparaît.
   - La personne, connectée avec l'adresse invitée, appuie sur « Rejoindre ». C'est automatique pour un compte créé par l'invitation elle-même.
   - Gérard reçoit **toujours la même réponse**.
   - Je ne reprends **pas** le lien-jeton de B : l'e-mail reste la preuve d'identité.
3. **De C : la matrice d'isolation rejouée avant chaque migration**, sur une copie de la base (C, temps 2 et rendu 11).
   - Elle est réduite à trois profils : une autre organisation, un employé, un membre retiré.
   - Elle ajoute le test « canari » : toute nouvelle table doit y entrer.

### Les corrections imposées à A par la critique

- **Aucun fichier n'est déplacé.** Le temps 2 de A réécrivait `devis.photos_incluses`, que le verrou du devis refuse (`schema.sql:2219`). Il oubliait `partages_entrants.image_path` et effaçait l'auteur.
  - Les nouveaux fichiers vont sous `{organisation}/{auteur}/…`.
  - Les anciens restent où ils sont, rattachés à leur entreprise par une table figée (Module 47).
- **F9 est vraiment fermée.** La règle de A sur l'IBAN se contourne de deux façons :
  - par un `DELETE` puis un `INSERT` sur `parametres_entreprise` (policy `for all`, l. 582) ;
  - par des `mentions_legales` forgées à l'insertion d'une facture (`app/api/factures/creer/route.ts:266`).

  La parade : plus de suppression des paramètres, et la base recopie elle-même l'IBAN et le BIC dans les documents.
- **F11 est ajoutée.** `repondre_devis_public` est appelable en direct avec une adresse IP inventée (l. 1612). `signature_user_agent` entre dans le verrou.
- **F10 sans casser l'ordinateur partagé.** C'est la route serveur qui écrit l'abonnement, et chacun ne lit ou ne supprime que les siens.
- **L'ordre des lots.** Les fichiers rangés par entreprise (temps 1, additif) passent **avant** la feuille de retrait, pour que « ses photos restent » soit vrai le jour où l'écran le dit.

Note indicative de A une fois greffé et corrigé : environ 74/100 (charge 8, risque 8, migration 6).

---

## 3. Les 8 questions du brief : réponses tranchées

1. **Le modèle.** Un espace unique partagé. En interne, deux rôles :
   - `proprietaire` : inviter, retirer, changer un IBAN déjà saisi ;
   - `employe` : tout le reste.

   **Aucun rôle n'est affiché.** L'artisan seul ne voit rien de nouveau : son organisation existe déjà en coulisse, créée à l'acceptation. Sa seule trace est le groupe « Équipe » de Paramètres (son nom et un formulaire).
2. **Qui voit quoi.** Tout le monde voit tout, y compris un apprenti s'il a un compte. **L'invitation le dit en une ligne.** Aucune interface ne masque les prix : un masque serait une fausse promesse.
   - **Pourquoi pas une vraie restriction.** La seule restriction honnête se ferait en base. Il faudrait scinder :
     - `devis` en `devis` et `devis_montants` (`lignes`, `lignes_vente`, totaux, marge, acompte, `suggestions_oublis`, `mentions_legales`) ;
     - `parametres_entreprise` en `parametres_entreprise` et `parametres_tarifs`.

     Il faudrait aussi filtrer `evenements_projet.detail`, qui contient des montants, et les notes des crons. Il faudrait enfin réécrire le générateur, `obtenir_devis_public`, les deux verrous, le rattrapage 42c, les relances, l'activité et le bilan : environ 40 fichiers, sans un seul test.
   - **Décision.** Pas maintenant (voir § 9).
   - **Les trois limites que la base tient dès maintenant :**
     - seul le propriétaire change un IBAN ou un BIC déjà saisi ;
     - personne ne supprime un projet, un devis ou une facture ;
     - la gestion d'équipe reste réservée aux routes serveur.
3. **L'attribution.** Oui, sous la forme « créé par », avec le prénom sur la dictée, la photo et la note, et seulement quand ce n'est pas vous. Pas de « modifié par » : il faudrait un journal de versions. Le coût : 1 trigger, 1 petite table, 1 chemin de photo, 4 composants.
4. **Le coéquipier de terrain.** C'est la même application, avec les mêmes droits :
   - il dicte, photographie, note et crée un chantier ;
   - il peut valider un devis ;
   - il écrit au client depuis **son** WhatsApp, quand il appuie lui-même.

   Pas de vue « mes chantiers du jour » : Aujourd'hui montre déjà le planning partagé. Pas d'assignation de tâches.
5. **L'invitation.** L'e-mail reste le canal d'identité : la personne du bureau est celle qui gère les mails, et l'adresse sert de toute façon au mot de passe oublié. WhatsApp sert à prévenir : Compyo prépare un texte **sans lien**, et Gérard l'envoie.
   - **Nouvelle adresse :** Supabase envoie l'e-mail d'invitation, et l'acceptation est automatique quand la personne choisit son mot de passe.
   - **Compte existant :** e-mail de connexion, puis « Rejoindre ».
   - **Compte déjà rattaché ailleurs :** seule l'invitée le voit.
   - **Côté Gérard :** il voit toujours « C'est prêt ». On ne révèle jamais si une adresse a un compte. Il dispose de « Renvoyer » et « Annuler », avec un plafond de 10 invitations par jour.
6. **Plusieurs organisations : écarté explicitement.**
   - `unique(user_id)` reste : `.maybeSingle()` renvoie `null` dès qu'il y a deux lignes, dans 49 fichiers.
   - La conjointe qui aide deux entreprises utilise deux adresses (un alias `+` suffit).
   - L'expert-comptable n'a **toujours pas besoin d'un accès** : l'export existe (`app/api/factures/export-comptable`).
   - Le sous-traitant reste hors de Compyo.
7. **La sortie propre.** On retire la ligne `memberships`, comme aujourd'hui. La base fait le reste :
   - elle garde le nom du membre dans `anciens_membres` et purge ses abonnements push ;
   - notes, rendez-vous, projets, devis et factures restent à l'entreprise ;
   - les clés `artisan_id` passent en `NO ACTION` : supprimer le compte ne peut plus rien effacer ;
   - les photos restent visibles, puisque le stockage ne dépend plus de l'auteur ;
   - ses rappels partent au propriétaire.

   Lui voit l'écran « Votre accès a été retiré ». Il reste deux fuites résiduelles : les URL signées déjà émises (1 h), et les brouillons déjà sur son téléphone.
8. **Le tarif.** Je le signale sans le décider : rien ne change, une organisation égale un abonnement. Facturer par siège doublerait le prix d'un couple. Le plafond IA est par organisation, donc un deuxième compte ne le double pas.

---

## 4. Les migrations SQL, dans l'ordre

Chaque migration a son fichier (`migration-45-….sql`, comme les 43a/43b/44 du dossier parent) et sa copie en Module 45 à 52 dans `schema.sql`. **Chacune n'est appliquée qu'après la matrice du § 5, rejouée sur une copie de la base.** Le SQL ci-dessous est du pseudo-SQL, à écrire et relire au lot concerné.

### À vérifier une seule fois dans Supabase, avant tout

- **G1 — Une sauvegarde** (Database › Backups) et **une copie** pour rejouer la matrice (une branche, ou un projet de test).
- **G2 — La base correspond bien à `schema.sql`.** On contrôle `to_regclass('public.visites')`, la colonne `organisations.exclue_des_stats` et `candidatures.user_id`.
- **G3 — Un instantané de `pg_policies`** (schémas `public` et `storage`), à comparer après chaque migration. Cherche toute policy ou clé étrangère ajoutée à la main, par exemple une FK `memberships → profils`.
- **G4 — Les noms réels des clés étrangères** qui visent `profils`, `demandes` et `devis` : `pg_constraint` où `contype = 'f'`.
- **G5 — Les droits d'exécution.** Teste `has_function_privilege` pour `anon`, `authenticated` et `service_role` sur `prochain_numero_facture`, `creer_theme_produit_libre` et `repondre_devis_public`. Supabase accorde par défaut `EXECUTE` à `anon` et `authenticated` : un `revoke … from public` seul ne suffit pas.

### Temps 1 — compatibilité (additif : l'application actuelle continue de marcher)

**Module 45 — Fonctions exposées et rôle (F5, F12)**
```sql
-- prochain_numero_facture : en tête du corps actuel (l. 1382)
if not exists (select 1 from memberships where user_id = auth.uid() and organisation_id = p_organisation_id)
  then raise exception 'Organisation non autorisée'; end if;
revoke execute on function prochain_numero_facture(uuid, integer) from public, anon;
revoke execute on function creer_theme_produit_libre(text, text, text, text) from public, anon, authenticated;
create function est_proprietaire(p_org uuid) returns boolean language sql stable security definer
  set search_path = public as $$ select exists (select 1 from memberships
  where user_id = auth.uid() and organisation_id = p_org and role = 'proprietaire') $$;
revoke execute on function est_proprietaire(uuid) from public, anon;
alter table memberships add constraint memberships_role_valide
  check (role in ('proprietaire','employe')) not valid;
```
- **Retour arrière :** remettre le corps d'origine (l. 1382-1398), `grant execute … to anon, authenticated`, supprimer `est_proprietaire` et la contrainte.
- **Avant :** `select role, count(*) from memberships group by role`, qui ne doit contenir que les deux valeurs. Vérifier aussi qu'aucun appel à `prochain_numero_facture` ne passe par le service_role (aujourd'hui : `factures/creer` et `factures/[id]/avoir`, tous deux avec le client utilisateur).
- **Après :** créer une facture, un acompte et un avoir. L'appel en `anon` doit répondre « refus ».

**Module 46 — Documents intouchables (F4, et F9 côté documents)**
```sql
-- verrouiller_devis_valide (version 42c, l. 2184) : AVANT le « if old.statut = 'brouillon' »
if old.statut <> 'brouillon' and new.statut = 'brouillon' then raise exception '…dupliquez-le'; end if;
if current_user in ('authenticated','anon') and
   (new.signature_nom, new.signature_data, new.signature_ip, new.signature_user_agent, new.signe_le)
   is distinct from (old.signature_nom, …, old.signe_le) then raise exception '…'; end if;
-- IBAN et BIC recopiés par la base dans le document figé. Fonction SANS security definer :
-- sinon current_user vaut le propriétaire de la fonction, et le contrôle tombe.
create function imposer_coordonnees_bancaires() returns trigger language plpgsql as $$
begin
  if current_user <> 'authenticated' or new.mentions_legales is null then return new; end if;
  if tg_table_name = 'devis' and old.mentions_legales is not null then return new; end if;
  new.mentions_legales := new.mentions_legales || (select jsonb_build_object('iban', iban, 'bic', bic)
    from parametres_entreprise where organisation_id = new.organisation_id);
  return new; end $$;
create trigger … before insert on factures for each row when (new.type in ('facture','acompte')) …;
create trigger … before update of mentions_legales on devis for each row …;
```
- **Retour arrière :** remettre le corps 42c de `verrouiller_devis_valide`, puis supprimer les deux triggers et la fonction.
- **Avant :** vérifier qu'aucun code ne remet un devis en brouillon ni n'écrit `signature_*`. C'est vrai aujourd'hui : seuls `devis/creer-vide` et `devis/dupliquer` créent des brouillons, par insertion.
- **Après :**
  - valider, envoyer, signer en ligne, puis refuser un autre devis ;
  - lancer la relance des devis ;
  - essayer en REST de repasser un devis envoyé en brouillon : « refus ».

**Module 47 — Fichiers rangés par entreprise : ouverture (F6, F13)**
```sql
create policy "fichiers de l'organisation" on storage.objects for all to authenticated
  using (bucket_id in ('photos','logos')
         and (storage.foldername(name))[1] in (select o::text from mes_organisations() o))
  with check (bucket_id in ('photos','logos')
         and (storage.foldername(name))[1] in (select o::text from mes_organisations() o)
         and (bucket_id = 'logos' or (storage.foldername(name))[2] = auth.uid()::text));
create table fichiers_historiques (bucket_id text, chemin text,
  organisation_id uuid not null references organisations on delete cascade, primary key (bucket_id, chemin));
alter table fichiers_historiques enable row level security;
create policy "lecture" on fichiers_historiques for select using (organisation_id in (select mes_organisations()));
create policy "anciens fichiers : lire"      on storage.objects for select to authenticated using (EXISTE);
create policy "anciens fichiers : supprimer" on storage.objects for delete to authenticated using (EXISTE);
--   EXISTE = bucket_id in ('photos','logos') and exists (select 1 from fichiers_historiques f
--            where f.bucket_id = objects.bucket_id and f.chemin = objects.name)
-- Remplissage, rejouable (on conflict do nothing), sans toucher aux fichiers :
--   chemins de demandes.photos, devis.photos_incluses, partages_entrants.image_path   -> 'photos'
--   parametres_entreprise.logo_url (hors URL http)                                   -> 'logos'
```
- **Ce que change le code dans le même lot** (3 lignes) :
  - `PhotosProjet.tsx:96` : `${organisationId}/${user.id}/${demandeId}/…` ;
  - `app/api/partage/route.ts:83` : `${organisationId}/${user.id}/partage-…` ;
  - `VueParametres.tsx:119` : `${organisationId}/logo-…`.

  `datePhoto` (`entreesCarnet.ts:69`) lit l'horodatage n'importe où dans le chemin : rien ne change pour lui.
- **Retour arrière :** avant le déploiement du code, on peut tout supprimer (3 policies et la table). Après, on garde « fichiers de l'organisation », sans quoi les nouveaux fichiers deviennent illisibles. Les anciennes policies restent en place pendant tout le temps 1.
- **Avant :**
  - les types : `jsonb_typeof` des éléments de `demandes.photos` et de `devis.photos_incluses`, qui doivent être des chaînes ;
  - aucun chemin référencé par deux organisations ;
  - le nombre d'objets dont l'auteur n'est plus membre : ce sont les victimes actuelles de F6a ;
  - la liste des utilisateurs dont les lignes sont dans une autre organisation que la leur : ce sont les victimes de F6b.
- **Après :**
  - chaque chemin référencé est bien dans `fichiers_historiques` ;
  - un membre B ne lit aucun fichier de A ;
  - une photo, un partage WhatsApp et un logo s'envoient, s'affichent et se suppriment.

**Module 48 — Départ propre et auteur (greffe 1, F7 en base)**
```sql
create table anciens_membres (organisation_id uuid references organisations on delete cascade,
  user_id uuid, nom text not null, retire_le timestamptz default now(), primary key (organisation_id, user_id));
alter table anciens_membres enable row level security;
create policy "lecture" on anciens_membres for select using (organisation_id in (select mes_organisations()));
-- after delete on memberships (security definer) :
--   garde : rien si l'organisation est en cours de suppression (sinon la cascade échoue sur la FK) ;
--   insert into anciens_membres (nom tiré de profils) on conflict do update ;
--   delete from abonnements_push where artisan_id = old.user_id and organisation_id = old.organisation_id;
-- forcer_auteur() (SANS security definer) : before insert or update on demandes, notes, notes_vocales,
--   evenements_planning, evenements_projet :
--   si current_user = 'authenticated' : insert -> new.artisan_id := auth.uid() ; update -> := old.artisan_id
--   (service_role des crons et security definer des RPC publiques : intouchés)
```
- **Retour arrière :** supprimer les deux triggers et les deux fonctions. La table `anciens_membres` peut rester : elle est inoffensive.
- **Avant :** chercher les insertions de ces cinq tables faites avec le client utilisateur et un `artisan_id` différent de `user.id`. Je n'en ai trouvé aucune, par exemple `planning/nouveau/page.tsx:302` met bien `user.id`.
- **Après :**
  - retirer un membre de test : sa ligne apparaît dans `anciens_membres`, et ses abonnements disparaissent ;
  - une note insérée en REST avec l'`artisan_id` du patron : elle est enregistrée au nom de l'appelant.

**Module 49 — Invitations à accepter (greffe 2)**
```sql
create table invitations (id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations on delete cascade,
  email text not null check (email = lower(trim(email))), prenom text not null check (char_length(prenom) between 1 and 60),
  invite_par uuid references auth.users on delete set null, cree_le timestamptz default now(),
  expire_le timestamptz default now() + interval '14 days', acceptee_le timestamptz, annulee_le timestamptz);
create unique index invitations_en_cours on invitations (organisation_id, email)
  where acceptee_le is null and annulee_le is null;
alter table invitations enable row level security;
create policy "lecture" on invitations for select using (organisation_id in (select mes_organisations()));
-- aucune écriture côté navigateur : routes serveur (service_role) seulement
```
- **Retour arrière :** `drop table invitations`, et l'ancienne route d'invitation reste servie.
- **Après :** un compte d'une autre organisation ne lit aucune invitation, et un `INSERT` REST est refusé.

### Temps 2 — resserrement (chaque migration exige son code déjà déployé, une à la fois, avec la matrice rejouée)

**Module 50 — Les fichiers ne dépendent plus de leur auteur (ferme F6a, F6b et F13)**
- **Contenu :**
  - rejouer le remplissage de `fichiers_historiques`, pour attraper les envois `{uid}/…` faits entre-temps ;
  - `drop policy` « un membre de l'organisation gère les photos de l'équipe » (l. 625) et « … le logo de l'équipe » (l. 663) ;
  - poser des limites de taille et de type sur les buckets `photos` et `logos`, **en excluant le SVG**.
- **Prérequis :** au moins deux semaines après le lot du Module 47, pour que les applications installées aient pris le nouveau code.
- **Retour arrière :** recréer les deux policies mot pour mot (l. 623-641 et 661-679), et remettre les limites à `null`.
- **Avant :**
  - aucun objet `{uid}/…` envoyé depuis le Module 47 (date de `created_at`) ;
  - zéro chemin référencé absent de `fichiers_historiques` ;
  - les tailles et types réels des objets (`metadata->>'size'`, `'mimetype'`), pour fixer les limites.
- **Après :** relancer la matrice, colonnes « Stockage », et ouvrir un vieux projet, un logo sur un devis et un partage WhatsApp.

**Module 51 — Rien ne s'efface (F3, et les cascades signalées par la critique)**
- **Les policies.** Celles de `demandes` et `parametres_entreprise`, en `for all`, sont scindées en `select`, `insert` et `update`. Plus personne ne supprime : aucun code ne le fait (vérifié). On supprime aussi la policy de suppression des devis (l. 1030). Le journal `evenements_projet` passe en ajout seul (`select` et `insert`) : aucun code ne le modifie.
- **Les clés étrangères.** `factures.demande_id`, `devis.demande_id` et tous les `artisan_id → profils` (`demandes`, `devis`, `factures`, `notes`, `notes_vocales`, `evenements_planning`, `evenements_projet`, `partages_entrants`, `parametres_entreprise`) passent de `CASCADE` à **`NO ACTION`**.
  - On n'utilise pas `RESTRICT` : `NO ACTION` ne vérifie qu'en fin d'instruction, donc supprimer **toute** une organisation de test reste possible par la cascade `organisation_id`.
  - On procède par `drop constraint` puis `add … not valid`, et enfin `validate constraint`.
  - `abonnements_push` garde sa cascade.
- **Retour arrière :** recréer les policies `for all` et la policy de suppression des devis, et remettre les clés en `cascade`.
- **Avant :** relever les noms exacts des contraintes (G4). Vérifier que refuser une candidature en attente (`deleteUser`, `admin/candidatures/[id]/route.ts:298`) touche un compte **sans** données.
- **Après :**
  - le `DELETE` REST sur une demande, un devis ou des paramètres répond « 0 ligne » ;
  - `deleteUser` d'un compte de test qui a des notes : « refus » ;
  - supprimer une organisation de test entière : « oui ».

**Module 52 — Argent, notifications, signature publique (F9, F10, F11)**
- **Le code d'abord :**
  - `abonner/route.ts` écrit l'abonnement avec le client admin (même upsert sur `endpoint`) ;
  - `devis-public/[id]/repondre/route.ts` appelle la fonction avec le client admin ;
  - `VueParametres` affiche l'IBAN et le BIC en lecture seule pour l'employé.
- **Le SQL ensuite :**
  - un trigger `proteger_iban` (sans `security definer`) : si un IBAN ou un BIC **déjà renseigné** change, que `current_user = 'authenticated'` et que `not est_proprietaire(organisation_id)`, alors refus ;
  - `abonnements_push` : on supprime la policy `for all` (l. 1281) et on crée `select` et `delete` avec `artisan_id = auth.uid()`, sans aucune écriture par le navigateur ;
  - `revoke execute on repondre_devis_public(…) from public, anon, authenticated` et `grant … to service_role` ;
  - `partages_entrants` : la condition `organisation_id in (select mes_organisations())` s'ajoute à `artisan_id = auth.uid()`, si bien qu'un ancien membre ne garde rien ;
  - `alter table memberships validate constraint memberships_role_valide`.
- **Retour arrière :** supprimer le trigger, recréer la policy `for all` du push et celle d'origine des partages, et `grant execute … to anon, authenticated`.
- **Avant :** G5 pour `repondre_devis_public`.
- **Après :**
  - deux comptes de la même organisation activent les notifications sur **le même ordinateur** : pas d'erreur ;
  - une signature en ligne réelle passe ;
  - un appel REST direct à la fonction : « refus » ;
  - un employé qui change l'IBAN : « refus » ;
  - l'employé saisit un IBAN encore vide : « oui ».

---

## 5. Matrice des tests d'isolation (greffe de C)

**Où et comment.** Un script SQL dans le dépôt (`supabase/tests/isolation.sql`), rejoué **sur la copie** avant et après chaque module.
- Il tourne dans une transaction annulée à la fin, avec `set local role authenticated` et `set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true)`.
- Il s'appuie sur deux organisations de test, A et B. A compte un propriétaire, un employé et un membre retiré (JWT encore valide, ligne `memberships` supprimée).
- Chaque ligne du script affirme le résultat attendu. Le stockage se teste par `select`, `insert` et `delete` sur `storage.objects` avec la même méthode.

**Légende.** « 0 » = aucune ligne renvoyée ou touchée ; « refus » = erreur RLS ou trigger ; « oui » = autorisé.
**Profils.** X = membre de l'organisation B qui vise A ; E = employé de A (le seul « membre limité » qui existe : IBAN et équipe) ; R = retiré de A.

| Objet visé dans A | X : lire / écrire / supprimer | E : lire / écrire / supprimer | R : lire / écrire / supprimer |
|---|---|---|---|
| demandes | 0 / refus / 0 | oui / oui, auteur forcé / 0 (51) | 0 / refus / 0 |
| devis | 0 / refus / 0 | oui / oui sauf retour en brouillon et `signature_*` : refus (46) / 0 (51) | 0 / refus / 0 |
| factures | 0 / refus / 0 | oui / création oui, contenu émis refus / 0 | 0 / refus / 0 |
| `prochain_numero_facture(A)` | refus (45) | oui | refus (45) |
| parametres_entreprise | 0 / refus / 0 | oui / oui sauf IBAN-BIC déjà saisis : refus (52) / 0 (51) | 0 / refus / 0 |
| clients, notes, notes_vocales, evenements_planning | 0 / refus / 0 | oui / oui, auteur forcé (48) / oui | 0 / refus / 0 |
| evenements_projet | 0 / refus / 0 | oui / ajout oui, modification refus (51) / 0 (51) | 0 / refus / 0 |
| abonnements_push | 0 / refus / 0 | les siens / refus, passe par la route (52) / les siens | 0 : purgés au retrait (48) |
| partages_entrants | 0 / refus / 0 | les siens | 0 (52) |
| profils | 0 | membres de A / le sien / — | le sien seulement |
| memberships, organisations | 0 / refus / refus | oui / refus / refus | 0 / refus / refus |
| invitations, anciens_membres, fichiers_historiques | 0 / refus / refus | oui / refus / refus | 0 / refus / refus |
| logs | 0 / refus pour A / — | 0 / oui / — | 0 / refus / — |
| Stockage `{A}/…` | 0 / refus / 0 | oui / oui, 2ᵉ segment = soi / oui | 0 / refus / 0 |
| Stockage ancien `{uid}/…` | 0 / refus / 0 | oui / refus (50) / oui | 0 / refus / 0 |
| `repondre_devis_public` en direct | refus en anon et authenticated (52) | refus (52) | refus (52) |
| `creer_theme_produit_libre` | refus (45) | refus (45) | refus (45) |

**Deux tests fixes en plus.**
- **Anon :** chaque table publique renvoie 0 ou refus, sauf `obtenir_devis_public`, qui est ouverte par conception.
- **Le « canari » :** une requête liste toute table de `public` sans RLS, ou dont une policy ne mentionne ni `mes_organisations()` ni `auth.uid()`. Toute nouvelle table doit y passer avant sa mise en production.

---

## 6. L'interface d'équipe unique et le geste de retrait

**La place : Paramètres › Équipe.** C'est le groupe « equipe » de `VueParametres.tsx:615`, aujourd'hui le seul accessible.
- On n'ajoute pas de page dédiée : une entrée de navigation pour un geste fait une fois l'an serait un mur de plus.
- `/dashboard/equipe` est conservée et redirige vers `/dashboard/parametres#equipe` : l'ancre est déjà gérée (`VueParametres.tsx:79`).
- `GestionEquipe.tsx` disparaît. Sa jointure `memberships → profils` n'a aucune clé étrangère, donc sa liste était probablement vide.

**Ce que voit chacun :**
- **L'artisan seul :** sa ligne (« Gérard Martin, vous ») puis le formulaire. Prénom et nom, e-mail, une ligne « Elle verra tout, comme vous : devis, prix, factures. », et le bouton « Envoyer l'invitation ».
- **Le propriétaire avec une équipe :** des noms, **sans aucun mot de rôle** (recherche, l. 261).
  - En face de chaque autre personne, un bouton « Retirer » de 48 px.
  - Les invitations en attente s'affichent ainsi : « Sophie, en attente », avec « Renvoyer » et « Annuler ».
- **L'employé :** la liste seule, sans bouton ni formulaire.
- **Après l'envoi :** une feuille dit « C'est prêt » et propose « Prévenir Sophie par WhatsApp » ou « Terminé ». Le texte est préparé par une variante sans numéro de `lienMessage` (`lib/messagesClient.ts`), et c'est Gérard qui l'envoie.

**Le geste de retrait.** Gérard appuie sur « Retirer », ce qui ouvre une **feuille**. On réutilise le composant existant `components/projet/Feuille.tsx` : dialogue modal, focus géré, Échap.
- Titre : « Retirer Pierre ? ».
- Une ligne : « Il n'ouvre plus Compyo. Ses notes, photos et projets restent. »
- Deux boutons de 48 px : « Retirer Pierre » et « Annuler ».
- En cas d'erreur, le message reste dans la feuille et le bouton se réactive (`try/catch/finally`, ce qui manque aujourd'hui à `EquipeSection.tsx:124-131`).
- Plus aucun `window.confirm` (`EquipeSection.tsx:145`).

**Côté serveur, la route `retirer` :**
- refuse de retirer un propriétaire, ce qui protège `cree_par` ;
- répond « cette personne ne fait plus partie de l'équipe » si aucune ligne n'est supprimée ;
- laisse la base faire le reste (Module 48).

**Côté personne retirée.** Le layout du tableau de bord l'envoie vers `/rejoindre`, qui affiche soit « Rejoindre l'équipe de … », soit « Votre accès a été retiré. Rien n'a été supprimé. ».
- **Attention :** `getOrganisationId` renvoie `null` aussi en cas d'erreur réseau (`lib/organisation.ts:31-34`). La page doit donc revérifier côté serveur avant d'afficher « accès retiré ».

---

## 7. Les lots livrables, dans l'ordre

| Lot | Contenu | Fichiers | Risques |
|---|---|---|---|
| 0 | Banc d'isolation (greffe C) | `supabase/tests/isolation.sql` (nouveau) | Aucun pour l'application. Le dépôt n'a aujourd'hui aucun test |
| 1 | Modules 45 et 46, sans écran | `migration-45`, `migration-46`, `schema.sql` | Signature en ligne, facture, acompte, avoir, relance des devis : à tester à la main |
| 2 | Module 47 et chemins par entreprise | `PhotosProjet.tsx`, `api/partage/route.ts`, `VueParametres.tsx`, `migration-47` | Vraies photos (mais aucune déplacée). Partage WhatsApp, logo du devis PDF |
| 3 | Module 48, un seul écran d'équipe, sortie propre | `EquipeSection.tsx` (réécrit avec `Feuille`), `GestionEquipe.tsx` (supprimé), `app/dashboard/equipe/page.tsx` (redirection), `api/equipe/retirer`, `cron/rappels` et `lib/notifications/push.ts` (destinataire = membre actif, sinon propriétaire), `app/dashboard/layout.tsx`, page `/rejoindre` | L'écran « accès retiré » sur une simple panne réseau (voir § 6) |
| 4 | Le prénom au carnet | `components/projet/entreesCarnet.ts`, `VueProjet.tsx`, `app/dashboard/demandes/[id]/page.tsx` (noms des membres et `anciens_membres`) | Une requête de plus. Aucun changement pour l'artisan seul |
| 5 | Module 49 et invitation à accepter | `api/equipe/inviter` (réécrite : réponse identique, plafond, plus de rattachement direct), `api/equipe/rejoindre` (nouvelle), page `/rejoindre`, `(auth)/definir-mot-de-passe` (texte « Gérard vous ajoute », acceptation automatique), `middleware.ts` (laisser `/rejoindre` à un compte en attente), `EquipeSection.tsx` | Parcours d'authentification. On garde l'e-mail Supabase, et `/rejoindre` reste hors du cache de `sw.js` |
| 6 | Module 50 (au moins deux semaines après le lot 2) | `migration-50` | Fin de l'ancien accès aux fichiers. Repli : recréer deux policies |
| 7 | Module 51 | `migration-51` | Une suppression légitime oubliée (aucune trouvée dans le code) |
| 8 | Code, puis Module 52 | `abonner/route.ts`, `devis-public/[id]/repondre/route.ts`, `VueParametres.tsx`, `migration-52` | Notifications sur ordinateur partagé, signature publique |

Chaque lot laisse l'application cohérente. Les lots 0 à 5 n'enlèvent aucun droit existant.

---

## 8. La dissidence : ce qui reste valable contre le vainqueur

- **C et l'auto-critique de A.** Un salarié hors famille, ou un apprenti avec compte, voit les prix, les marges, les factures et le bilan. La confiance reste sociale (F8 acceptée, hormis l'IBAN et les suppressions).
- **D.** L'apprenti qui photographie a toute l'application entre les mains (20 à 35 cibles à l'Accueil), pas un écran de capture à trois boutons.
- **B, C et D.** L'e-mail reste un canal fragile pour ce public (indésirables, adresse tapée avec des gants, lien Supabase de 24 h). « Renvoyer » et le message WhatsApp atténuent le problème sans le supprimer.
- **La critique.** Aucun transfert de propriété n'est possible sans SQL. Si Gérard est propriétaire et que l'épouse tient la banque, elle doit lui demander de changer l'IBAN.
- **La critique.** Les URL signées de 3600 s survivent au retrait pendant une heure. Je n'abaisse pas cette durée : ce serait le risque d'images cassées sur un écran resté ouvert, pour un gain faible.
- **B.** « Une personne, une entreprise » oblige la conjointe de deux entreprises à utiliser deux adresses.

## 9. Ce qui me ferait changer d'avis

- **Les prix visibles.** Si, sur cinq artisans ayant un salarié non familial, deux disent refuser qu'il voie les prix (`candidatures.nb_employes` permet de les trouver), j'ouvrirais la restriction de C. Elle se ferait **par tables séparées**, jamais par masque, avec ce même banc de tests.
- **L'e-mail.** Si plus de 30 % des invitations restent en attente au-delà de 48 h, je passerais à un lien WhatsApp **lié à l'adresse invitée**, qui exige toujours la preuve de la boîte.
- **La capture.** Si les comptes « employé » font surtout de la capture (photos, dictées) et se plaignent de l'application complète, j'ajouterais une vue de capture **dans** l'application connectée. Jamais une porte anonyme.
- **La fraude.** Un cas réel de fraude à l'IBAN, ou plusieurs couples où l'épouse devrait être propriétaire : j'ajouterais un transfert de propriété dans l'interface.

## 10. Ce que le fondateur doit trancher (hors code)

1. **Le libellé.** « Équipe » ou « Quelqu'un avec vous » ? Je recommande de n'afficher **aucun** mot de rôle.
2. **La phrase d'honnêteté à l'invitation** : « Elle verra tout, comme vous : devis, prix, factures. » C'est une promesse.
3. **L'IBAN réservé au propriétaire** (je recommande oui). Le transfert de propriété se fait par le support, en SQL par Axel, à la demande.
4. **La liste d'attente.** Une personne invitée par un artisan déjà accepté passe-t-elle devant ? Je recommande oui : elle bascule en `acces = actif` au moment de « Rejoindre ».
5. **Le tarif.** Inchangé pour l'instant (une organisation, un abonnement). Le siège payant reste une décision ouverte, à prendre avant de vendre « l'équipe ».
6. **La suppression RGPD d'un ancien membre.** On anonymise (nom « Ancien membre », compte bloqué) au lieu de supprimer, puisque la base protège désormais les documents. C'est à écrire dans la politique de confidentialité.
7. **Les textes** du message WhatsApp préparé et de l'écran « Votre accès a été retiré ».
8. **Les brouillons locaux** d'une personne retirée : faut-il les effacer de son téléphone à l'écran « accès retiré » ? Je recommande oui : c'est la confidentialité du client contre « rien ne se perd ».
9. **L'expert-comptable** : confirmer « pas maintenant ».
10. **La durée de validité** d'une invitation : je propose 14 jours.

Hors du duel mais à ne pas oublier : la création publique de comptes et l'oracle `409 email_existant` de `POST /api/candidatures` (F13).

---

## Annexe : affirmations vérifiées dans le dépôt

- **Le dernier module de `schema.sql` est le 44** (l. 2459). Les fichiers `migration-43a`, `43b` et `44` sont dans le dossier parent.
- **Modèle d'équipe :**
  - `unique (user_id)` : `schema.sql:416` ;
  - `mes_organisations()` ignore le rôle : `schema.sql:430-438` ;
  - `memberships.user_id → auth.users`, sans clé vers `profils` : l. 407.
- **Le correctif F2** se lit dans `app/api/equipe/inviter/route.ts:41-58`. Le rattachement direct sans consentement existe toujours (l. 93-102), ainsi que l'erreur brute de Supabase en 500 (l. 119-124).
- **La policy `for all`** sur `parametres_entreprise` est à la l. 582, et l'IBAN est figé à partir des paramètres envoyés par la route (`lib/moteur-metier/genererFacture.ts:157-158`, `factures/creer/route.ts:266`).
- **Le verrou du devis** ignore `statut` et `signature_*` (`schema.sql:2184-2225`), et il fige `photos_incluses` (l. 2219).
- **`repondre_devis_public`** est `security definer`, sans aucun `revoke` (l. 1612). La route l'appelle avec le client utilisateur (`devis-public/[id]/repondre/route.ts:42`).
- **`prochain_numero_facture`** ne contrôle rien (l. 1382-1398).
- **Le push.** La policy `for all` sur `abonnements_push` est à la l. 1281, et l'abonnement s'écrit par un upsert sur `endpoint` (`abonner/route.ts:37-48`). Seul `cron/rappels` envoie des notifications push.
- **Le stockage** dépend de l'appartenance actuelle de l'auteur (`schema.sql:625-641`, `663-679`). Les chemins sont construits par `user.id` aux trois endroits suivants :
  - `PhotosProjet.tsx:96` ;
  - `api/partage/route.ts:83` ;
  - `VueParametres.tsx:119`.
- **Aucun code ne supprime** de `demandes`, `devis`, `factures`, `clients`, `parametres_entreprise` ni `evenements_projet`. Les seules suppressions portent sur `notes`, `evenements_planning`, `partages_entrants`, `abonnements_push` et `memberships`.
- **Les cascades `artisan_id → profils`** sont aux l. 18, 31, 121, 218, 247, 293, 1113, 1233, 1271 et 1406. Il y a aussi `factures.demande_id` en cascade (l. 1403).
- **Il existe deux interfaces d'équipe :** `EquipeSection.tsx` (onglet de `VueParametres.tsx:615`, avec `confirm()` à la l. 145) et `GestionEquipe.tsx` (page orpheline). La feuille réutilisable existe déjà : `components/projet/Feuille.tsx`.
