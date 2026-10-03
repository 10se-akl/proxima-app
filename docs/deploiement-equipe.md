# Déployer le chantier Équipe et sécurité, pas à pas

*Pour Axel. Refonte du 03/10, duel A. Huit migrations (45 à 52), un banc de tests, du code. Aucune requête n'a été exécutée par Claude : c'est toi qui passes chaque migration, dans l'ordre ci-dessous.*

## En bref

| Étape | Quoi | Où | Quand |
|---|---|---|---|
| 0 | Vérifications G1 à G5, copie de test | Supabase | Une fois, avant tout |
| 1 | Migrations **45, 46, 47, 48, 49**, une à une | Copie, puis production | **Avant** de pousser la branche |
| 2 | Réglages d'authentification (adresses, e-mails, SMTP) | Supabase | Avant de pousser la branche |
| 3 | Pousser la branche, tester la prévisualisation | Vercel | Après l'étape 2 |
| 4 | Mise en production | Vercel | Quand la prévisualisation est bonne |
| 5 | Migration **50** | Copie, puis production | **Au moins 2 semaines** après l'étape 4 |
| 6 | Migration **51** | Copie, puis production | Après la 50, un autre jour |
| 7 | Migration **52** | Copie, puis production | Après la 51, un autre jour |

**Pourquoi deux temps.** La prévisualisation Vercel utilise la base de **production**. Les migrations 45 à 49 n'enlèvent rien : le code actuel (master) continue de marcher avec elles, et le nouveau code en a besoin. Elles passent donc **avant** de pousser. Les migrations 50 à 52 resserrent les droits : elles ne passent qu'**après** la mise en production du nouveau code, **une à la fois**, avec le banc de tests rejoué à chaque fois.

**La règle d'or.** Une migration ne passe en production que si `supabase/tests/isolation.sql` affiche **0 ÉCHEC** sur la copie, avec cette migration passée.

---

## 0. Avant tout (une seule fois)

Toutes les requêtes ci-dessous se collent dans **Supabase › SQL Editor › New query**, puis **Run**. Elles ne modifient rien.

### G1 — Une sauvegarde

1. Supabase › **Database › Backups**. Note l'heure de la dernière sauvegarde.
2. Si la page n'en montre aucune (offre gratuite), fais un export depuis un terminal, à la racine du projet. Le mot de passe de la base est dans **Project Settings › Database** (bouton « Reset » si tu l'as perdu ; ça ne coupe rien d'autre que les connexions directes) :
   ```
   npx supabase db dump --db-url "postgresql://postgres:MOT_DE_PASSE@db.XXXX.supabase.co:5432/postgres" -f sauvegarde-schema.sql
   npx supabase db dump --db-url "postgresql://postgres:MOT_DE_PASSE@db.XXXX.supabase.co:5432/postgres" --data-only -f sauvegarde-donnees.sql
   ```
   Garde ces deux fichiers **hors du dépôt** (ils contiennent les données des clients).

### G2 — La base correspond bien à `schema.sql` (jusqu'au Module 44)

```sql
select
  to_regclass('public.visites') is not null as module_44_visites,
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'organisations' and column_name = 'exclue_des_stats') as module_44_exclue_des_stats,
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'candidatures' and column_name = 'user_id') as module_43_candidatures_user_id,
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'devis' and column_name = 'lignes_vente') as module_42_lignes_vente;
```

**Attendu : quatre `true`.** Un `false` : le module correspondant n'a jamais été passé. On s'arrête et on le passe d'abord (sa section est dans `supabase/schema.sql`).

### G3 — Un instantané des règles d'accès

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by 1, 2, 3;
```

Clique sur **Export › Download CSV** et garde le fichier (`policies-avant-45.csv`). Tu referas la même requête après chaque migration : seules les lignes annoncées par la migration doivent changer.

Puis, pour repérer une clé ajoutée à la main :

```sql
select conname, conrelid::regclass as sur, confrelid::regclass as vers
from pg_constraint
where contype = 'f' and conrelid = 'public.memberships'::regclass;
```

**Attendu : deux lignes** (vers `organisations` et vers `auth.users`). Une troisième ligne vers `profils` : préviens Claude avant de continuer.

### G4 — Les vrais noms des clés étrangères

```sql
select c.conname as nom,
       c.conrelid::regclass as table_source,
       a.attname as colonne,
       c.confrelid::regclass as table_cible,
       case c.confdeltype when 'c' then 'CASCADE' when 'a' then 'NO ACTION'
                          when 'r' then 'RESTRICT' when 'n' then 'SET NULL' else c.confdeltype::text end as a_la_suppression
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f'
  and c.confrelid in ('public.profils'::regclass, 'public.demandes'::regclass, 'public.devis'::regclass)
order by 2, 3;
```

Garde le résultat (CSV). La migration 51 retrouve elle-même ces clés par leur table et leur colonne : tu n'as rien à recopier. Ce relevé sert à comparer après la 51 (les lignes `artisan_id → profils` et `demande_id → demandes` des factures et des devis passent de `CASCADE` à `NO ACTION`).

### G5 — Qui peut appeler les fonctions sensibles

```sql
select f.fonction, r.role, has_function_privilege(r.role, f.fonction, 'execute') as peut_appeler
from (values ('anon'), ('authenticated'), ('service_role')) as r(role),
     (values ('public.prochain_numero_facture(uuid, integer)'),
             ('public.creer_theme_produit_libre(text, text, text, text)'),
             ('public.repondre_devis_public(uuid, text, text, text, text, text)')) as f(fonction)
order by 1, 2;
```

**Avant 45 : neuf `true`** (c'est précisément le problème). Après 45 : `prochain_numero_facture` est `false` pour `anon` ; `creer_theme_produit_libre` est `false` pour `anon` et `authenticated`. Après 52 : `repondre_devis_public` est `false` pour `anon` et `authenticated`, `true` pour `service_role`.

### La copie de test

Le banc de tests crée ses propres données : la copie n'a besoin que de la **structure** de la base, pas des données des clients.

1. Supabase › **New project**, offre gratuite, nom `compyo-essai`, même région.
2. Dans le SQL Editor **de ce projet**, colle le contenu de `supabase/schema.sql` **jusqu'à la ligne** `-- Module 45 (refonte, duel A, 03/10) — Fonctions exposées et rôle.` (non comprise), puis **Run**. Tu as la base telle qu'elle est aujourd'hui en production.
3. Refais G3 sur la copie et compare avec le CSV de la production. Une policy présente en production et absente de la copie (ajoutée à la main un jour) : recrée-la sur la copie avant d'aller plus loin.

*(Plus fidèle, si tu es à l'aise avec le terminal : `npx supabase db dump --db-url "…production…" -f structure.sql`, puis colle `structure.sql` dans le SQL Editor de la copie.)*

**Ne lance jamais `isolation.sql` sur la production.** Il annule tout ce qu'il crée, mais il écrit dans `auth.users` le temps de son exécution.

---

## Comment lancer le banc de tests et lire son résultat

1. Sur la **copie** : SQL Editor › New query, colle tout `supabase/tests/isolation.sql`, **Run**.
2. Le tableau affiché commence par la ligne **BILAN** : « *N* OK, *M* ÉCHEC, *K* ignorés — modules détectés : 45 oui, 46 non… ». Vérifie que les modules détectés sont bien ceux que tu as passés sur la copie.
3. **0 ÉCHEC** : c'est bon. Les lignes « ignoré » visent une table qui n'existe pas encore (module pas encore passé) : c'est normal.
4. **Au moins un ÉCHEC** : les lignes en échec sont en haut. Lis les colonnes `profil` (qui), `objet` et `action` (sur quoi), `attendu` et `obtenu`, et `detail` (le message d'erreur exact). **On ne passe pas la migration en production.** Envoie ces lignes à Claude.
5. Les lignes dont la note dit « faille connue … fermée par 5x » sont des failles qui existent aujourd'hui en production et qu'une migration à venir fermera : elles sont « OK » tant que leur module n'est pas passé, parce qu'elles décrivent l'état réel.
6. Le **canari** (en fin de tableau) : « aucune ligne » = toutes les tables ont leur RLS et une règle qui filtre par entreprise ou par personne. Une ligne en échec = une table à protéger avant toute mise en production.

Si l'éditeur affiche seulement « Success. No rows returned », supprime la dernière ligne du script (`rollback;`) et relance : le script annule déjà lui-même tout ce qu'il crée avant d'afficher le rapport. Si l'erreur parle de `auth.users` ou de `set role`, le SQL Editor n'a pas les droits attendus : préviens Claude.

---

## 1. Temps 1 : migrations 45 à 49 (avant de pousser la branche)

Pour **chaque** migration, dans l'ordre 45, 46, 47, 48, 49 :

1. **Copie** : colle `supabase/migrations/4X-….sql`, Run. Puis lance `isolation.sql`. **0 ÉCHEC** obligatoire.
2. **Production** : fais les vérifications « Avant » de la migration (ci-dessous), puis colle le même fichier, Run.
3. **Production** : vérifications « Après », puis refais G3 et garde le CSV (`policies-apres-4X.csv`).

Tu peux passer les cinq le même soir. Le site continue de tourner pendant ce temps.

### Migration 45 — `45-fonctions-exposees.sql`

- **Avant** :
  ```sql
  select role, count(*) from memberships group by role;
  ```
  Attendu : seulement `proprietaire` et `employe`. Une autre valeur : préviens Claude (la contrainte refuserait les nouvelles lignes de ce rôle).
- **Après** : G5 (voir plus haut). Dans l'application : crée une facture, un acompte, puis un avoir sur un projet de test. Les trois reçoivent leur numéro.

### Migration 46 — `46-documents-intouchables.sql`

- **Avant** : rien à faire (aucun écran ne remet un devis en brouillon ni n'écrit de signature : vérifié dans le code).
- **Après**, dans l'application, sur un projet de test :
  1. valide un devis, envoie-le (« Envoyer par WhatsApp » ou « Noté envoyé ») ;
  2. ouvre le lien de signature dans un autre navigateur et **signe** ;
  3. sur un autre devis envoyé, **refuse** depuis le lien ;
  4. crée une facture : son IBAN est celui de Paramètres.

### Migration 47 — `47-fichiers-par-entreprise.sql`

- **Avant** :
  ```sql
  -- 1. Les photos sont bien des chemins (attendu : une seule ligne, « string »)
  select jsonb_typeof(e) as type, count(*)
  from (select jsonb_array_elements(case when jsonb_typeof(photos) = 'array' then photos else '[]' end) e from demandes
        union all
        select jsonb_array_elements(case when jsonb_typeof(photos_incluses) = 'array' then photos_incluses else '[]' end) from devis) x
  group by 1;

  -- 2. Aucun chemin référencé par deux entreprises (attendu : aucune ligne)
  with r as (
    select e #>> '{}' as chemin, organisation_id from demandes, jsonb_array_elements(case when jsonb_typeof(photos) = 'array' then photos else '[]' end) e
    union all
    select e #>> '{}', organisation_id from devis, jsonb_array_elements(case when jsonb_typeof(photos_incluses) = 'array' then photos_incluses else '[]' end) e
  )
  select chemin, count(distinct organisation_id) from r group by 1 having count(distinct organisation_id) > 1;

  -- 3. Les victimes actuelles de F6a : fichiers dont l'auteur n'est plus dans aucune équipe
  select count(*) from storage.objects o
  where o.bucket_id in ('photos', 'logos')
    and not exists (select 1 from memberships m where m.user_id::text = (storage.foldername(o.name))[1]);

  -- 4. Les victimes de F6b : personnes dont des projets sont dans une autre entreprise que la leur
  select distinct d.artisan_id from demandes d
  join memberships m on m.user_id = d.artisan_id
  where m.organisation_id <> d.organisation_id;
  ```
  Note les nombres 3 et 4 : la migration 47 rend visibles à leur équipe les fichiers comptés en 3.
- **Après** :
  ```sql
  -- Combien d'anciens fichiers ont été rattachés à leur entreprise
  select bucket_id, count(*) from fichiers_historiques group by 1;

  -- Chaque chemin référencé est bien rattaché (attendu : 0)
  with r as (
    select e #>> '{}' as chemin from demandes, jsonb_array_elements(case when jsonb_typeof(photos) = 'array' then photos else '[]' end) e
    union all
    select e #>> '{}' from devis, jsonb_array_elements(case when jsonb_typeof(photos_incluses) = 'array' then photos_incluses else '[]' end) e
  )
  select count(*) from r
  where not exists (select 1 from fichiers_historiques f where f.chemin = r.chemin);
  ```
  Dans l'application : ouvre un vieux projet avec photos, un devis avec logo. Tout s'affiche.

### Migration 48 — `48-depart-propre-et-auteur.sql`

- **Avant** : rien à faire.
- **Après** :
  1. Dans l'application, crée une note : elle s'enregistre normalement.
  2. Sur la **copie** seulement (le banc de tests le fait déjà, c'est pour voir de tes yeux) : retire un membre de test, puis
     ```sql
     select * from anciens_membres order by retire_le desc limit 5;
     ```
     Son nom y est, et ses abonnements push ont disparu.

### Migration 49 — `49-invitations.sql`

- **Avant** : rien à faire.
- **Après** :
  ```sql
  select count(*) from invitations; -- attendu : 0, la table existe
  ```

---

## 2. Réglages d'authentification (avant de pousser la branche)

Le nouveau parcours d'invitation envoie deux sortes d'e-mails par Supabase : l'**invitation** (adresse sans compte) et un **lien de connexion** (adresse qui a déjà un compte). Sans ces réglages, les e-mails ne partent pas ou mènent à une erreur.

1. **Authentication › URL Configuration › Redirect URLs** : ajoute, si elles n'y sont pas déjà,
   - `https://compyo.fr/rejoindre`
   - `https://compyo.fr/definir-mot-de-passe`

   (remplace `compyo.fr` par ton domaine de production, celui de `NEXT_PUBLIC_SITE_URL` dans Vercel).
2. **Authentication › Emails › SMTP Settings** : vérifie que **Custom SMTP** est activé. Le service d'e-mail intégré de Supabase n'envoie qu'aux membres de ton équipe Supabase, et quelques e-mails par heure : sans SMTP, les invitations n'arrivent jamais. Avec Resend (déjà utilisé par Compyo) : hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = ta clé d'API Resend, expéditeur = l'adresse de `RESEND_FROM_EMAIL`.
3. **Authentication › Rate Limits** : « Emails sent per hour » à 30 au moins.
4. **Authentication › Emails › Templates** (textes proposés, à ajuster) :
   - **Invite user** — sujet : `{{ .Data.invite_par }} vous ajoute sur Compyo` ; corps :
     ```html
     <p>Bonjour,</p>
     <p>{{ .Data.invite_par }} vous ajoute à l'équipe {{ .Data.entreprise }} sur Compyo.</p>
     <p><a href="{{ .ConfirmationURL }}">Choisir mon mot de passe</a></p>
     <p>Ce lien expire au bout de 24 heures. Passé ce délai, demandez à {{ .Data.invite_par }} de vous le renvoyer.</p>
     ```
   - **Magic Link** — sujet : `Votre équipe vous attend sur Compyo` ; corps :
     ```html
     <p>Bonjour,</p>
     <p>Une équipe vous attend sur Compyo. Ouvrez ce lien pour la rejoindre :</p>
     <p><a href="{{ .ConfirmationURL }}">Rejoindre l'équipe</a></p>
     <p>Ce lien expire au bout d'une heure.</p>
     ```
   Le lien d'un e-mail expire vite ; l'invitation, elle, reste valable **14 jours** : « Renvoyer » envoie un lien neuf, et la personne peut aussi se connecter puis ouvrir `compyo.fr/rejoindre`, qui lui propose « Recevoir le lien ».

---

## 3. Pousser la branche et tester la prévisualisation

Une fois les migrations 45 à 49 passées en production et les réglages faits, la branche peut être poussée. Sur la prévisualisation Vercel (elle utilise la base de production : utilise un **projet de test** et des **adresses de test**) :

1. **Photos** : ajoute une photo à un projet. Elle s'affiche, se supprime. Dans le SQL Editor :
   ```sql
   select name, created_at from storage.objects where bucket_id = 'photos' order by created_at desc limit 3;
   ```
   Le chemin commence par l'identifiant de l'entreprise, puis le tien.
2. **Partage WhatsApp** (Android, application installée) : partage une photo vers Compyo, crée le projet. La photo s'affiche.
3. **Logo** : Paramètres › Entreprise › Changer le logo. Il s'affiche, et sur le PDF d'un devis.
4. **Équipe** : Paramètres › Équipe. Ta ligne « Ton nom, vous », le formulaire, la phrase « Elle verra tout, comme vous : devis, prix, factures. » (le prénom remplace « Elle » dès qu'il est tapé). `/dashboard/equipe` ramène ici.
5. **Retrait** (avec un compte de test déjà membre) : « Retirer » ouvre une feuille « Retirer Pierre ? ». Après le retrait, la personne qui recharge son application voit « Votre accès a été retiré. Rien n'a été supprimé. ».
6. **Paramètres d'un employé** : connecté avec un compte employé, l'IBAN déjà saisi est en lecture seule, avec « Seul … peut le changer ».

Les liens des e-mails d'invitation pointent vers `NEXT_PUBLIC_SITE_URL`, donc vers la **production** : le parcours complet d'invitation se teste après la mise en production (étape 4), avec une adresse de test :

- **adresse sans compte** : « Envoyer l'invitation » → « C'est prêt » → l'e-mail arrive → « Choisir mon mot de passe » → la page dit « … vous ajoute » → mot de passe → l'application s'ouvre dans l'équipe ;
- **adresse qui a déjà un compte** (par exemple un compte « en attente ») : l'e-mail « Votre équipe vous attend » arrive → le lien ouvre « Rejoindre l'équipe de … » → « Rejoindre » (et, pour un compte en attente, le choix d'un mot de passe) → l'application s'ouvre. La liste d'attente est passée ;
- **côté patron** : la réponse est la même dans les deux cas ; « Sophie, en attente » apparaît avec « Renvoyer » et « Annuler » ; « Prévenir Sophie par WhatsApp » ouvre WhatsApp avec un texte prêt, sans lien.

---

## 4. Mise en production

Fusion dans master, déploiement Vercel. **Note la date et l'heure** : la migration 50 attend au moins deux semaines après.

---

## 5. Temps 2 : migrations 50, 51, 52 (une à la fois)

Pour **chacune**, un jour différent :

1. **Copie** : passe la migration, lance `isolation.sql`, **0 ÉCHEC**.
2. **Production** : vérifications « Avant », la migration, vérifications « Après », G3.
3. Attends au moins une journée d'usage normal avant la suivante.

### Migration 50 — `50-fichiers-fin-ancien-acces.sql` (au moins 2 semaines après l'étape 4)

Ferme F6a, F6b et F13 : les anciennes règles « par auteur » disparaissent, et les dossiers reçoivent une taille et des types maximum.

- **Avant** :
  ```sql
  -- 1. Envois à l'ancienne depuis la mise en production (attendu : 0, ou très peu,
  --    venus d'une application pas encore mise à jour : la migration les rattache)
  select count(*), max(created_at) from storage.objects o
  where o.bucket_id in ('photos', 'logos')
    and o.created_at > 'DATE_DE_L_ETAPE_4'
    and (storage.foldername(o.name))[1] not in (select id::text from organisations);

  -- 2. Tailles et types réels (pour vérifier les limites de la migration :
  --    photos 25 Mo, jpeg/png/webp/heic/heif/gif ; logos 5 Mo, jpeg/png/webp)
  select bucket_id, metadata->>'mimetype' as type, count(*),
         pg_size_pretty(max((metadata->>'size')::bigint)) as plus_gros
  from storage.objects where bucket_id in ('photos', 'logos')
  group by 1, 2 order by 1, 3 desc;
  ```
  Un type courant absent de la liste (par exemple `image/svg+xml` pour un logo) : les fichiers déjà là restent lisibles, seuls les **nouveaux** envois de ce type seront refusés.
- **Après** : relance `isolation.sql` sur la copie (lignes « stockage »). Dans l'application : un vieux projet avec photos, un logo sur un devis, un partage WhatsApp, une photo neuve.

### Migration 51 — `51-rien-ne-s-efface.sql`

Ferme F3 : plus personne ne supprime un projet, un devis, des paramètres ou une ligne du journal depuis l'application, et supprimer un compte ne peut plus rien effacer.

- **Avant** :
  ```sql
  -- Aucun compte « en attente » n'a déjà des données (attendu : aucune ligne).
  -- Refuser une candidature supprime le compte : avec cette migration, ce
  -- serait refusé pour un compte qui a écrit quelque chose.
  select c.email from candidatures c
  where c.statut = 'pending' and c.user_id is not null
    and (exists (select 1 from notes where artisan_id = c.user_id)
      or exists (select 1 from demandes where artisan_id = c.user_id));
  ```
  Et, si du code a été ajouté depuis le 03/10 : `git grep -n "\.delete()"` à la racine du projet ne doit montrer aucune suppression sur `demandes`, `devis`, `parametres_entreprise` ni `evenements_projet`.
- **Après** : refais G4. Les lignes `artisan_id → profils`, `devis.demande_id` et `factures.demande_id` disent `NO ACTION`. Dans l'application : rien ne change (aucun écran ne supprimait ces lignes).

### Migration 52 — `52-argent-notifications-signature.sql`

Ferme F9 (IBAN), F10 (notifications) et F11 (signature appelée en direct). **Le code du lot 8 doit être en production** (il l'est depuis l'étape 4).

- **Avant** : G5 (`repondre_devis_public` encore `true` partout).
- **Après** :
  1. G5 : `repondre_devis_public` est `false` pour `anon` et `authenticated`.
  2. Une **vraie signature en ligne** sur un devis de test passe.
  3. Deux comptes de la même entreprise activent les notifications **sur le même ordinateur** (un rappel programmé chacun) : pas d'erreur.
  4. Un employé qui essaie de changer l'IBAN déjà saisi : refusé (l'écran ne le propose d'ailleurs plus). Un employé qui saisit un BIC encore vide : accepté.

---

## Revenir en arrière

Chaque migration a son fichier de retour : `supabase/migrations/4X-….retour.sql` et `5X-….retour.sql`. On le colle dans le SQL Editor, Run. **Toujours dans l'ordre inverse** : 52, puis 51, puis 50, puis 49… Chaque fichier dit en tête ce qu'il suppose.

Points d'attention :

- **52** : après son retour, l'IBAN n'est plus protégé ; rien d'autre ne casse.
- **51** : remet les suppressions en cascade (la faille F3 revient).
- **50** : recrée mot pour mot les deux anciennes règles de fichiers.
- **49** : seulement après être revenu au code de master (sinon l'écran Équipe affiche une erreur). Les invitations en cours sont perdues.
- **48** : garde la table `anciens_membres` (le nouveau code la lit).
- **47** : deux cas, expliqués dans le fichier. Si le nouveau code a tourné, même une heure, on **garde** la règle « un membre gère les fichiers de son organisation » : sans elle, les photos envoyées depuis deviennent illisibles.
- **45** : seulement après le retour de la 52 (qui s'en sert).

Pour revenir sur le **code** seulement (sans toucher à la base) : redéployer master dans Vercel (Deployments › le dernier déploiement de master › Promote to Production). Tant que 50 à 52 ne sont pas passées, master marche avec la base.

---

## À faire à la main, hors code

### Transférer la propriété d'une entreprise (support)

Seul le propriétaire invite, retire et change un IBAN déjà saisi. Si un couple veut que ce soit l'autre :

```sql
begin;
update memberships set role = 'employe'
 where organisation_id = 'ID_ENTREPRISE' and user_id = 'ID_ANCIEN_PROPRIETAIRE';
update memberships set role = 'proprietaire'
 where organisation_id = 'ID_ENTREPRISE' and user_id = 'ID_NOUVEAU_PROPRIETAIRE';
update organisations set cree_par = 'ID_NOUVEAU_PROPRIETAIRE' where id = 'ID_ENTREPRISE';
commit;
```

Les identifiants se lisent dans Authentication › Users (pour les personnes) et `select id, nom from organisations;`.

### Supprimer les données d'un ancien membre (RGPD) : on anonymise

Depuis la migration 51, la base refuse de supprimer un compte qui a écrit quelque chose (ses notes, devis et factures appartiennent à l'entreprise et doivent rester). On **anonymise** à la place. À écrire dans la politique de confidentialité : « À votre départ d'une équipe, votre nom est remplacé par « Ancien membre » et votre compte est fermé ; ce que vous avez écrit pour l'entreprise reste à l'entreprise. »

1. L'entreprise le retire de l'équipe (Paramètres › Équipe › Retirer), si ce n'est pas déjà fait.
2. Puis, dans le SQL Editor (remplace `ID` par son identifiant) :
   ```sql
   begin;
   update anciens_membres set nom = 'Ancien membre' where user_id = 'ID';
   update profils
      set nom = 'Ancien membre', entreprise = null,
          email = 'ancien-membre-' || left(id::text, 8) || '@compyo.invalid'
    where id = 'ID';
   update auth.users
      set email = 'ancien-membre-' || left(id::text, 8) || '@compyo.invalid',
          raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = 'infinity'
    where id = 'ID';
   update auth.identities
      set identity_data = jsonb_build_object('sub', user_id::text,
                                             'email', 'ancien-membre-' || left(user_id::text, 8) || '@compyo.invalid')
    where user_id = 'ID';
   update candidatures set nom = 'Ancien membre', prenom = '', telephone = '', email = 'ancien-membre@compyo.invalid'
    where user_id = 'ID';
   commit;
   ```
   Le compte ne peut plus se connecter (`banned_until`), et son adresse n'existe plus nulle part.
