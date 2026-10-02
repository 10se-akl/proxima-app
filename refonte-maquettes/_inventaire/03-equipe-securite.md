# 03 — Équipe, organisations et sécurité (audit en lecture seule)

> Périmètre : `supabase/schema.sql` (2544 lignes, lu en entier), `lib/organisation.ts`, routes `app/api/equipe/*`, pages et composants équipe, `lib/candidatures/creerCompteCandidat.ts`, `middleware.ts`, les 36 routes `app/api/**`.
> Aucune requête n'a été exécutée sur une base : tout ce qui suit est déduit du code et du schéma versionné. Quand l'état réel de la base peut différer, c'est indiqué « à vérifier en base ».

---

## 0. Migrations 43a / 43b / 44 du dossier parent

| Fichier | Contenu | Dans `schema.sql` ? |
|---|---|---|
| `migration-43a-AVANT-deploiement.sql` | `candidatures.user_id` + index unique partiel `candidatures_user_id_unique` | **Oui**, mot pour mot (l. 2441-2446) |
| `migration-43b-APRES-deploiement.sql` | `drop policy "candidature ouverte à tous"` | **Oui** (l. 2456) |
| `migration-44-statistiques.sql` | table `visites`, fonction `enregistrer_visite()` + revoke/grant, `organisations.exclue_des_stats` | **Oui**, à l'identique (l. 2480-2544) |

Les trois fichiers sont donc des extraits « à coller » déjà repris dans `schema.sql`. Le dépôt ne permet pas de savoir s'ils ont été appliqués en production (à vérifier en base).

---

## 1. Le modèle actuel

### 1.1 Tables
- **`organisations`** (l. 397) : `id`, `nom`, `cree_par → auth.users ON DELETE RESTRICT`, `created_at`, `exclue_des_stats` (l. 2543).
  RLS : SELECT seulement (`id in mes_organisations()`). Pas d'INSERT, UPDATE ni DELETE pour `authenticated` : un propriétaire ne peut même pas renommer son organisation.
- **`memberships`** (l. 404) : `organisation_id → organisations ON DELETE CASCADE`, `user_id → auth.users ON DELETE CASCADE`, `role text default 'employe'` (valeurs attendues : `proprietaire | employe`, **sans contrainte CHECK**).
  Contraintes : **`unique (user_id)`** (un utilisateur appartient à une seule organisation) et `unique (organisation_id, user_id)` (redondante avec la précédente).
  RLS : SELECT des memberships de ses organisations. Aucune écriture côté navigateur : tout passe par le service_role.
- **Pas de FK `memberships.user_id → profils.id`** : les deux tables pointent chacune vers `auth.users`. C'est important pour le §4.

### 1.2 `mes_organisations()` (l. 430-438)
`language sql, security definer, stable, search_path=public` → `select organisation_id from memberships where user_id = auth.uid()`.
Elle sert de pivot à toutes les policies métier. Elle ignore le rôle : **aucune policy du schéma ne regarde `memberships.role`**. Le rôle n'est vérifié qu'en TypeScript, dans `/api/equipe/inviter` et `/api/equipe/retirer`.

### 1.3 Qui crée l'organisation, et quand
1. **Inscription publique** (`POST /api/candidatures` → `lib/candidatures/creerCompteCandidat.ts`) : un compte Auth est créé avec le service_role (`email_confirm: true`, `app_metadata.acces = "en_attente"`), plus une ligne `candidatures`. **Il n'y a ni profil, ni organisation, ni membership.** Le compte peut pourtant se connecter et obtenir un JWT valide. Seuls le middleware (l. 105) et `app/dashboard/layout.tsx` (l. 30) le redirigent, et uniquement pour les pages `/dashboard`.
2. **Acceptation par l'admin** (`PATCH /api/admin/candidatures/[id]`, `accepterCompteExistant`, l. 211-285) : dans l'ordre, création du profil, puis `creerOrganisationProprietaire()` (organisation + membership `proprietaire`, l. 180-200), puis `app_metadata.acces = "actif"`. L'ancien chemin, pour une candidature sans `user_id`, passe par `inviteUserByEmail`, puis profil, puis organisation.
3. **Invitation d'équipe** (`/api/equipe/inviter`) : `inviteUserByEmail`, puis profil (métier et entreprise copiés depuis le propriétaire), puis membership `employe`. L'invité n'a pas de `app_metadata.acces`, donc il n'est pas bloqué.
4. **Backfill historique** (l. 471-498) : chaque profil sans membership reçoit une organisation dont il est propriétaire.

Le seul moyen d'avoir deux propriétaires dans une organisation est une écriture SQL manuelle. Aucune route ne change un rôle.

### 1.4 Colonnes `artisan_id`
Elles sont conservées partout pour dire « qui a créé la ligne » (l. 386-390). **Rien ne les contrôle** : les policies ne vérifient que `organisation_id`, et aucune colonne n'a de `default auth.uid()`. N'importe quel membre peut donc écrire `artisan_id = <un coéquipier>`. La plupart de ces colonnes ont aussi **`references profils(id) ON DELETE CASCADE`** (demandes l. 18, devis l. 31, factures l. 1406, notes, evenements_*, etc.) : supprimer le compte Auth d'un ancien employé supprime en cascade ses projets, ses devis et **ses factures**.

---

## 2. Tables × politiques

Légende : `MO` = `organisation_id in (select mes_organisations())`. Toutes les tables ont RLS activée : **aucune table sans RLS**.

| Table | organisation_id | user/artisan_id | SELECT | INSERT | UPDATE | DELETE | Remarques |
|---|---|---|---|---|---|---|---|
| profils | — | `id` = user | `id=auth.uid()` OU membre d'une org commune (l. 651) | `auth.uid()=id` (l. 63) | `auth.uid()=id` (l. 58) | — | `email` en texte libre, **non unique, modifiable par l'utilisateur** (voir F2) |
| organisations | (id) | cree_par | `id in MO` | — | — | — | |
| memberships | oui | user_id | MO | — | — | — | écritures : service_role uniquement |
| demandes | NOT NULL | artisan_id | MO (FOR ALL) | MO | MO | **MO** | delete → cascade devis, factures, notes… |
| devis | NOT NULL | artisan_id | MO | MO | MO + trigger `verrouiller_devis_valide` | **MO** | trigger contournable (F4) |
| factures | NOT NULL | artisan_id | MO | MO | MO et `statut != 'annulee'` + 2 triggers | **aucune policy** | mais suppression possible par cascade (F3) |
| compteurs_facturation | PK | — | aucune | aucune | aucune | aucune | accès via `prochain_numero_facture()` (F5) |
| parametres_entreprise | NOT NULL, unique | artisan_id | MO (FOR ALL) | MO | MO | MO | tout membre modifie tarifs et IBAN (F9) |
| clients | NOT NULL | — | MO (FOR ALL) | MO | MO | MO | |
| notes | NOT NULL | artisan_id | MO (FOR ALL) | MO | MO | MO | |
| notes_vocales | NOT NULL | artisan_id | MO (FOR ALL) | MO | MO | MO | |
| evenements_planning | NOT NULL | artisan_id | MO (FOR ALL) | MO | MO | MO | contrainte d'exclusion sur les créneaux |
| evenements_projet | NOT NULL | artisan_id | MO (FOR ALL) | MO | MO | MO | journal **modifiable et supprimable** par tout membre ; `detail` contient des montants |
| abonnements_push | NOT NULL | artisan_id | MO (FOR ALL) | MO | MO | MO | un membre lit ou détourne l'abonnement d'un autre (F10) |
| partages_entrants | NOT NULL | artisan_id | `artisan_id=auth.uid()` | idem, **org non vérifiée** | idem | idem | |
| logs | nullable | artisan_id | **aucune** | MO | — | — | lecture en service_role seulement → F1 |
| retours_produits | NOT NULL | user_id | `user_id=auth.uid()` | user + MO | user | user | |
| problemes_produits | — | — | `to authenticated using(true)` sauf colonne `propositions_ia` (revoke l. 992) | — | — | — | |
| ameliorations_produit | — | — | aucune | aucune | aucune | aucune | service_role |
| candidatures | — | user_id | aucune | **aucune** depuis 43b | aucune | aucune | service_role |
| parametres_systeme | — | — | aucune | aucune | aucune | aucune | lu par le middleware en service_role |
| visites | — | — | aucune | aucune | aucune | aucune | écriture via `enregistrer_visite()` |

### Fonctions `security definer`
| Fonction | Ligne | Contrôle d'accès interne | Droits EXECUTE |
|---|---|---|---|
| `mes_organisations()` | 430 | `auth.uid()` | défaut (public) : sans risque |
| `creer_theme_produit_libre(...)` | 1055 | **aucun** | défaut : **appelable par anon** (F12) |
| `prochain_numero_facture(org, annee)` | 1382 | **aucun** (n'importe quel `p_organisation_id`) | défaut : **anon et authenticated** (F5) |
| `obtenir_devis_public(uuid)` | 2327 | UUID non devinable + statut envoye/refuse | défaut : par conception |
| `repondre_devis_public(...)` | 1612 | UUID + validation d'état | défaut : **appelable en direct avec IP et user-agent falsifiés** (F11) |
| `enregistrer_visite(...)` | 2497 | validation des champs | revoke public, grant anon/authenticated |

Fonctions en `security invoker`, donc soumises à la RLS : `creer_avoir_et_annuler`, `ajouter_photos_projet`, `retours_agreges`, les fonctions de trigger.

### Buckets Storage (tous `public = false`, sans limite de taille ni de type MIME)
| Bucket | Chemin | USING (lecture, maj, suppression) | WITH CHECK (écriture) |
|---|---|---|---|
| photos (l. 623) | `{uid_uploader}/{demande_id}/…` | l'appelant partage une organisation avec **l'uploader** (premier segment) | premier segment = `auth.uid()` |
| logos (l. 661) | `{uid}/…` | idem | idem |
| retours (l. 838) | `{uid}/…` | premier segment = `auth.uid()` | idem |

L'accès aux fichiers dépend de l'appartenance **actuelle** de l'uploader, pas de l'organisation propriétaire du projet (voir F6). Un compte sans organisation (candidat en attente, membre retiré) peut toujours écrire dans son propre dossier des trois buckets (F13).

---

## 3. Revue de `/api/equipe/inviter` et `/api/equipe/retirer`

### 3.1 Qui peut faire quoi
| Action | Autorisation | Où |
|---|---|---|
| Inviter | session + `getMembership().role === 'proprietaire'` (client utilisateur, donc RLS) | inviter l. 13-31 |
| Retirer un membre | session + rôle `proprietaire` ; la suppression filtre sur `organisation_id` du propriétaire, ce qui empêche de toucher une autre organisation | retirer l. 22-48 |
| Se retirer soi-même | **impossible** pour tout le monde : refus explicite pour le propriétaire (l. 35), aucune route pour un employé | — |
| Changer un rôle | aucune route | — |

### 3.2 Cas limites
- **Dernier propriétaire qui se retire** : impossible, puisque l'auto-retrait est bloqué. En revanche, s'il existe deux propriétaires (posés en SQL), B peut retirer A, **y compris le créateur `cree_par`**. Rien ne le protège, et le bilan mensuel (`cron/bilan-mensuel` l. 81) continue de partir vers `cree_par` même après son retrait.
- **Adresse déjà membre ailleurs** : réponse 409 « Un compte Compyo existe déjà pour cet email » (l. 72-77). C'est la conséquence de `unique(user_id)`.
- **Adresse avec un compte Auth mais sans profil** (candidat en attente, compte orphelin) : la recherche dans `profils` ne trouve rien, `inviteUserByEmail` échoue, et le **message brut de Supabase** (« A user with this email address has already been registered ») revient en 500 (l. 105-111).
- **Casse de l'email** : `.eq("email", email)` est sensible à la casse (l. 43) et l'email saisi n'est pas normalisé (`creerCompteCandidat` le passe en minuscules, pas l'invitation). « Jean@X.fr » ne retrouve donc pas « jean@x.fr », et on retombe sur l'erreur Supabase ci-dessus.
- **Double invitation** : la seconde renvoie 409 « compte existe déjà », un message trompeur. On ne peut pas renvoyer le lien.
- **Invitation expirée** (24 h par défaut côté Supabase) : même blocage en 409. Le contournement existe : `/mot-de-passe-oublie`, qui ne révèle rien de l'adresse. Mais l'interface ne le propose pas.
- **Échecs partiels** (non transactionnel) : si l'invitation part mais que le profil échoue, il reste un compte Auth orphelin, et toute nouvelle invitation échouera avec « already registered ». Si le profil passe mais que le membership échoue, une nouvelle invitation passe par le chemin de « réactivation » et ça fonctionne.
- **Chemin « réactivation »** (l. 45-89) : un profil sans membership est rattaché **directement**, sans email ni consentement, avec le rôle `employe`. Le `nom` saisi est ignoré. Ce chemin est la porte d'entrée de F2.
- **Retrait d'un `userId` qui n'est pas membre** : 0 ligne supprimée, mais la réponse reste `ok: true`.
- **Aucune limitation de fréquence** sur l'invitation : chaque appel déclenche un email Supabase, ce qui peut servir à spammer des adresses tierces.
- **`nom` et `email`** : pas de limite de longueur, pas de validation de format.

### 3.3 Fuites d'information
- **Oui, l'existence d'un compte est révélée** à tout propriétaire : 409 « existe déjà » si l'adresse est membre ailleurs, et message Supabase « already registered » si un compte existe sans profil. Les propriétaires ont un compte validé, donc le risque est limité, mais c'est un oracle.
- **Oracle public plus large** : `POST /api/candidatures` répond 409 `email_existant` « Un compte existe déjà avec cette adresse email » (route l. 34-38, lib l. 128-137). Aucune limitation de fréquence, seul un champ piège (honeypot) filtre. N'importe qui peut énumérer les adresses inscrites.

### 3.4 Données d'un membre retiré
- Seule sa ligne `memberships` est supprimée. Son compte Auth et son profil restent, tout comme toutes ses lignes métier (`artisan_id` = lui), qui restent visibles par l'équipe.
- Son nom disparaît des affichages « créé par » : la policy de lecture des profils ne le couvre plus.
- **Ses photos et le logo qu'il a envoyé deviennent inaccessibles à toute l'équipe** (F6).
- Ses `abonnements_push` restent, avec l'ancien `organisation_id`, et **les crons continuent de lui envoyer des notifications** pour les notes, devis et factures dont il est `artisan_id` (F7).
- Ses `partages_entrants` restent lisibles par lui.

### 3.5 Une session ouverte perd-elle l'accès tout de suite ?
- **Données en base : oui.** `mes_organisations()` est réévaluée à chaque requête (fonction `stable`, rien n'est mis en cache dans le JWT). La requête suivante ne renvoie plus rien.
- **Restent accessibles** :
  - les URL signées déjà générées (photos et logos, **3600 s**) ;
  - les pages déjà affichées dans le navigateur ;
  - un éventuel canal Realtime (aucun usage repéré).
- Le service worker ne met pas en cache les pages protégées.
- Le JWT reste valide : l'ancien membre peut encore appeler les RPC publiques (F5, F11, F12) et écrire dans les buckets (F13).

---

## 4. `GestionEquipe.tsx` (page `/dashboard/equipe`) et `EquipeSection.tsx` (Paramètres › Équipe)

| | `app/dashboard/equipe/page.tsx` + `GestionEquipe.tsx` | `EquipeSection.tsx` |
|---|---|---|
| Rendu | Server Component, puis props vers un composant client | entièrement client (`useEffect`) |
| Résolution du rôle | `getMembership()` (lib) | requête `memberships…maybeSingle()` écrite à la main |
| Liste des membres | **une requête avec jointure** `memberships.select("user_id, role, profils(nom,email,metier)")` (l. 36-40) | 3 requêtes : membership, memberships de l'org, puis `profils.in(ids)` avec un UUID factice si la liste est vide |
| Jointure | **Probablement cassée** : aucune FK `memberships → profils`, donc PostgREST devrait répondre `PGRST200` et la liste s'afficher vide. L'erreur est ignorée (à vérifier en base, si une FK a été ajoutée hors schéma) | fonctionne |
| Erreurs | aucune vérification d'`error` sur la lecture | `error` vérifié à chaque étape, message affiché |
| Tri | `created_at` croissant | propriétaire d'abord, puis ordre arbitraire (le commentaire dit « par ordre d'ajout », c'est faux) |
| Libellé du rôle | « Membre » | « Employé » |
| Réseau à l'invitation | `try/catch/finally` | **pas de try/catch** (l. 124-131) : en cas de panne réseau, `envoi` reste à `true` et le bouton reste bloqué |
| Après une action | `router.refresh()` | `charger()` |
| Accès | **page orpheline** : aucun lien vers `/dashboard/equipe` dans le code | onglet « Équipe » de `VueParametres` (l. 615), le seul accessible |

Deux implémentations de la même fonction, aux comportements différents. Il faut n'en garder qu'une, avec trois requêtes ou une vraie FK, plus une RPC dédiée.

---

## 5. Failles et fragilités, par gravité

### 🔴 Élevée
- **F1 — La limite d'appels IA ne bloque jamais.** `lib/limiteIA.ts:48-61` compte `logs` avec le client utilisateur. Or `logs` n'a **aucune policy SELECT** (`schema.sql:612-616`, insert seulement). Le compteur vaut donc toujours 0 et les plafonds 80/h et 300/j ne s'appliquent jamais. Toutes les routes `app/api/ai/*` sont concernées (`verifierLimiteIA(supabase, …)`). Une boucle de script ou un compte compromis consomme l'API Claude sans borne. Correctif : compter via le service_role, une RPC security definer, ou une policy SELECT `MO` sur `logs`.
- **F2 — Prise de place d'une invitation via `profils.email`.** `profils` accepte l'INSERT et l'UPDATE de son propre profil avec un `email` libre (`schema.sql:58-66`). La route d'invitation identifie la personne par `profils.email` (`inviter/route.ts:40-44`) et **rattache directement** tout profil sans membership (`l. 59-88`). Scénario d'attaque :
  1. l'attaquant crée un compte public via `/api/candidatures` (en attente, sans organisation) ;
  2. il se connecte et obtient un JWT ;
  3. il insère via REST un profil `{nom:"Jean Dupont", email:"jean@entreprise-cible.fr"}` ;
  4. le jour où le patron invite cette adresse, c'est **le compte de l'attaquant** qui reçoit le membership.

  L'interface affiche « Invitation envoyée ». L'attaquant lit ensuite toutes les données de l'organisation via REST : le middleware ne bloque que les pages. Correctif : identifier par `auth.users.email` (API admin), passer par une invitation à accepter (table `invitations` + jeton), et retirer la colonne `email` de ce que l'utilisateur peut écrire.
- **F3 — Des factures émises peuvent être supprimées par cascade.** `factures.demande_id → demandes ON DELETE CASCADE` (`schema.sql:1403`), et `demandes` se supprime par tout membre (FOR ALL, l. 566-571). De même, `factures.artisan_id → profils ON DELETE CASCADE` (l. 1406) et `profils → auth.users ON DELETE CASCADE` (l. 7). Un employé, par un appel REST direct, ou la suppression du compte Auth d'un ancien salarié, efface des factures. Cela contourne l'absence volontaire de policy DELETE sur `factures` (l. 1492-1495) et l'obligation de conserver les factures. Même problème pour les devis signés (policy DELETE `MO` à l. 1030 + cascades). Correctif : `ON DELETE RESTRICT` sur les FK des documents légaux, `artisan_id → SET NULL` (ou RESTRICT), et suppression des demandes réservée au propriétaire ou remplacée par un archivage.
- **F4 — Le verrou du devis validé se contourne.** `verrouiller_devis_valide` (`schema.sql:2184-2225`) ne bloque ni `statut` ni les colonnes de signature. Tout membre peut faire `UPDATE devis SET statut='brouillon'`, puis modifier librement lignes et prix, puisque `old.statut = 'brouillon'`. Il peut aussi écrire directement `signature_nom`, `signe_le`, `signature_ip`, etc. sur un devis envoyé. La valeur probante de la signature et l'immutabilité annoncée tombent. Correctif : interdire tout retour vers `brouillon` et verrouiller les colonnes `signature_*` et `signe_le` (seule `repondre_devis_public` peut les écrire).
- **F6 — Les photos dépendent de l'appartenance actuelle de l'uploader.** Policies Storage aux lignes 623-641 et 661-679.
  - (a) Membre retiré : **toute l'équipe perd l'accès** à ses photos et au logo qu'il avait envoyé. Le membre lui-même aussi.
  - (b) S'il est ensuite invité dans une **autre** organisation B, les membres de B peuvent **lister** (`storage.list(uid)`) et télécharger toutes les photos de chantier de A : fuite entre clients.

  Correctif : préfixer les chemins par `organisation_id` et écrire la policy sur ce préfixe, avec migration des objets existants.

### 🟠 Moyenne
- **F5 — `prochain_numero_facture()` est security definer, sans contrôle, et exécutable par anon** (`schema.sql:1382-1398`, aucun revoke). Quiconque connaît un `organisation_id` peut incrémenter le compteur et créer des trous dans la numérotation légale. C'est le cas d'un ancien membre, et de tout membre pour sa propre organisation. Correctif : vérifier `p_organisation_id in (select mes_organisations())` dans la fonction et `revoke … from anon`.
- **F7 — Les notifications push continuent après un retrait.** `cron/rappels/route.ts:112-117`, `cron/relance-devis`, `cron/relance-factures` et `lib/notifications/push.ts:71-74` envoient à `artisan_id` **sans vérifier qu'il est encore membre**. Les abonnements du membre retiré ne sont pas purgés (`retirer/route.ts` ne supprime que le membership). L'ancien salarié reçoit donc encore des titres de notes et des noms de clients.
- **F8 — Aucune séparation des rôles en base.** L'employé a exactement les mêmes droits que le propriétaire sur toutes les tables : supprimer projets, devis et clients, émettre ou annuler des factures, modifier le journal `evenements_projet`.
- **F9 — Un employé modifie `parametres_entreprise`** (tarifs, marge, **IBAN et BIC** imprimés sur les factures) : policy à `schema.sql:580-585`, aucun contrôle de rôle dans `VueParametres`. Cela ouvre un risque de fraude par changement d'IBAN.
- **F10 — `abonnements_push` est ouvert en FOR ALL `MO`** (`schema.sql:1280-1284`). Un membre lit les endpoints et clés de ses coéquipiers, et peut insérer un abonnement avec `artisan_id = patron` pour recevoir les notifications du patron.
- **F11 — `repondre_devis_public()` est appelable directement** via `/rest/v1/rpc` avec `p_ip` et `p_user_agent` arbitraires (`schema.sql:1612-1676`). La route (`devis-public/[id]/repondre`) ne protège rien, et la preuve de signature est falsifiable par quiconque a le lien.
- **F13 — Comptes sans organisation et création publique de comptes.** La création de comptes est publique, sans limite (`/api/candidatures`, honeypot seulement), et sert d'oracle d'existence d'adresse (§3.3). Chaque compte en attente a un JWT et peut écrire sans limite dans `photos/{uid}`, `logos/{uid}` et `retours/{uid}` : aucune limite de taille ni de type sur les buckets.
- **Fuite d'information à l'invitation** : réponse 409 et message Supabase brut (`inviter/route.ts:72-77, 105-111`).

### 🟡 Faible
- **F12** — `creer_theme_produit_libre()` est security definer et exécutable par anon (`schema.sql:1055-1076`) : on peut injecter des thèmes dans la carte publique sans passer par la route. Correctif : `revoke … from anon, authenticated` (la route l'appelle via le client admin).
- `partages_entrants` : le WITH CHECK ne vérifie pas `organisation_id` (`schema.sql:1126-1129`), sans impact actuel.
- Trigger `verrouiller_facture_emise` : `devis_id`, `client_id`, `demande_id`, `facture_liee_id` et `date_echeance` restent modifiables sur une facture émise (l. 1466-1485).
- `memberships.role` n'a pas de CHECK ; `unique(organisation_id,user_id)` est redondant.
- `retirer` répond `ok` même si rien n'a été supprimé, et rien ne protège `cree_par`.
- Page `/dashboard/equipe` : jointure probablement cassée et page orpheline (§4). `EquipeSection` : pas de try/catch à l'invitation (l. 124-131).
- `getOrganisationId` renvoie `null` sur une erreur réseau (`lib/organisation.ts:31-34`). C'est journalisé, mais l'interface affiche « aucune organisation ».

---

## 6. Évolutions envisagées

### 6.a Rôle « terrain » sans prix, factures ni bilan, appliqué en RLS

**Où sont les montants :**
| Table | Colonnes sensibles | Colonnes « terrain » utiles |
|---|---|---|
| devis | `lignes` (jsonb, prix de **revient** : `prix_unitaire`, `total`), `lignes_vente` (jsonb, prix de vente), `sous_total_ht`, `deplacement`, `marge_pct`, `tva_pct`, `montant_tva`, `total_estime`, `acompte_pct`, `suggestions_oublis` (postes chiffrés), `mentions_legales` (IBAN…) | `numero`, `statut`, `objet`, `adresse_chantier`, `date_debut_prevue`, `duree_estimee`, `lots` (noms), `commentaires`, `signe_le`, `photos_incluses` |
| factures | **toute la ligne** | — |
| compteurs_facturation | numéros | — |
| parametres_entreprise | `cout_horaire`, `cout_journalier`, `prix_km`, `forfait_deplacement`, `marge_defaut_pct`, `tva_pct`, `heures_min_facturables`, `iban`, `bic`, `capital_social`, `devis_acompte_pct` | coordonnées, logo, assurances |
| evenements_projet | `detail` = « 1 234,00 € TTC » pour les types `devis_valide`, `facture_creee`, `facture_payee`, `avoir_cree` (ValiderDevis l. 478, factures/* l. 312/132/59) | les autres types |
| notes | descriptions de relance (brouillons, sans montant d'après `lib/relances/templates.ts`) | |
| demandes | aucune colonne de prix (texte libre éventuel dans `description` et `questions_manquantes`) | tout |
| Bilan / Activité | pas de table : calculé à la volée (`lib/bilan-mensuel.ts`, `lib/activite.ts`) depuis factures et devis | |

**Faisabilité :**
- **Par table, c'est simple** pour `factures` et `compteurs_facturation` : une policy `organisation_id in mes_organisations_role('proprietaire','bureau')`. Le Bilan et les montants de l'Accueil se vident alors automatiquement, puisqu'ils lisent avec le client utilisateur.
- **Pour `devis` et `parametres_entreprise`, la RLS ne suffit pas** : elle filtre des lignes, pas des colonnes. Les privilèges de colonne (`revoke select(col)`) s'appliquent au rôle Postgres `authenticated`, **commun à tous les utilisateurs**, donc ils ne distinguent pas un « terrain » d'un « patron ». Deux options :
  1. **Tables séparées (recommandé)** : `devis_montants` (1:1 avec `devis_id`, contient `lignes`, `lignes_vente`, totaux, marge…) et `parametres_tarifs`, chacune avec une RLS limitée aux rôles financiers. La partie descriptive de `devis` reste visible du terrain. Gros refactoring : générateur de devis, `obtenir_devis_public`, triggers de verrou, rattrapage l. 2233, `postesFrequents`, `activite`, `relance-devis`.
  2. **Vue + RLS de base fermée** : RLS SELECT sur `devis` réservée aux rôles financiers, plus une vue `devis_terrain` (propriétaire `postgres`, filtre `MO` explicite, colonnes non financières). C'est moins invasif, mais toutes les lectures « terrain » doivent passer par la vue et les écritures restent à arbitrer.
- **Prérequis communs :**
  - une fonction `mes_organisations_role(variadic text[])` security definer (le rôle n'existe aujourd'hui que dans `memberships`) ;
  - un CHECK sur `memberships.role` ;
  - filtrer `evenements_projet` par type pour le terrain, ou ne plus écrire de montants dans `detail` ;
  - sur **`obtenir_devis_public`**, garder en tête qu'un terrain qui connaît l'UUID d'un devis envoyé obtient les prix de vente : c'est acceptable (c'est ce que voit le client), mais il faut le savoir ;
  - **`parametres_entreprise` en écriture** réservé au propriétaire (corrige aussi F9).
- **Facilite :** toutes les routes `app/api/ai/*`, `factures/*` et `devis/*` utilisent le client utilisateur, donc la RLS s'applique sans modifier le code. Les seuls clients service_role sont l'admin, les crons et l'équipe.
- **Complique :** les colonnes `lignes` et `lignes_vente` en jsonb, les fonctions `calculerDevis`/`genererFacture` qui lisent `parametres_entreprise` en entier, les composants « Projet » qui affichent devis et factures ensemble, et l'IA `generer-devis` qui a besoin des tarifs (un terrain ne doit pas pouvoir la lancer, ou alors via le service_role).

### 6.b Attribution d'auteur (`created_by`)
- **Ce qui existe :** `artisan_id` sur `notes`, `notes_vocales`, `evenements_projet`, `evenements_planning`, `demandes`, `devis`, `factures`, `partages_entrants`, `abonnements_push`. Pour les photos, l'auteur est déjà encodé dans le chemin (`{uid}/{demande_id}/…`), mais `demandes.photos` n'est qu'un tableau jsonb de chemins.
- **Ce qui manque :**
  - `artisan_id` n'est **ni forcé ni vérifié** (aucun `default auth.uid()`, aucun `with check (artisan_id = auth.uid())`), donc on peut l'usurper ;
  - il est réécrit par les crons, qui créent des notes avec `artisan_id = devis.artisan_id` ;
  - il est **cascadé à la suppression** du profil.
- **Plan simple :**
  - ajouter `created_by uuid default auth.uid() references auth.users on delete set null` ;
  - ajouter un trigger BEFORE INSERT qui force `new.created_by := coalesce(auth.uid(), new.created_by)` (null pour le service_role) et interdit sa modification ;
  - garder `artisan_id` comme « responsable » ;
  - pour les photos, préférer une table `photos_projet(id, demande_id, organisation_id, chemin, created_by, created_at)` au tableau jsonb (cela résout aussi F6 et le Carnet).
- **Point d'attention :** l'affichage du nom de l'auteur dépend de la policy `profils`, et un membre retiré n'est plus lisible. Il faut une RPC `noms_auteurs(ids)` qui renvoie les noms des anciens membres, ou une copie du nom (`created_by_nom`) à l'écriture.

### 6.c Un utilisateur dans plusieurs organisations
**Ce qui bloque, endroit par endroit :**
- `schema.sql:416` : `unique (user_id)`.
- `lib/organisation.ts:18-22, 44-48` : `.maybeSingle()`. **Avec deux lignes, la requête renvoie une erreur et `null`**, donc l'utilisateur perd l'accès partout. Elle est appelée par environ 45 fichiers :
  - **les 7 routes IA** ;
  - `devis/*`, `factures/*`, `notes/dicter`, `partage/*`, `demandes/*`, `notifications/abonner`, `retours`, `equipe/*`, `admin/retours/propositions` ;
  - les pages `dashboard/` : `layout`, `page`, `bilan`, `demandes`, `demandes/[id]`, `demandes/nouvelle`, `devis`, `factures`, `notes`, `notes/nouvelle`, `planning`, `planning/nouveau`, `equipe` ;
  - les composants `AConfirmer`, `ConfirmationRdv`, `ConfirmerClotureProjet`, `NotesVocales`, `PhotosProjet`, `ValiderDevis`, `EspaceDevis`, `FormulaireNote`, `PopupRappel`, `CentreNotifications`, `FeuilleMessageClient`.
- Requêtes `memberships…maybeSingle()` écrites à la main : `app/dashboard/parametres/page.tsx:39-43`, `components/dashboard/EquipeSection.tsx:56-60`, `api/admin/candidatures/[id]/route.ts:235-239`.
- `api/equipe/inviter/route.ts:72-77` refuse explicitement toute personne déjà membre ailleurs.
- **Composants qui comptent uniquement sur la RLS, sans filtre `organisation_id`.** Ils mélangeraient les organisations : `components/accueil/FermerJournee.tsx`, `components/dashboard/CaseEvenement.tsx`, `components/dashboard/FacturesProjet.tsx`, `components/planning/actionsEvenement.ts`, `lib/notifications/budget.ts` (par `artisan_id`).
- **Storage** (l. 623-679) : les chemins sont par utilisateur. Un utilisateur dans A et B rend ses photos de A visibles par B, et inversement : fuite automatique (même cause que F6).
- Données liées à l'utilisateur et non à l'organisation : `abonnements_push.organisation_id` est figé à l'abonnement ; les crons notifient par `artisan_id` sans organisation ; `partages_entrants` (l'organisation est choisie à la réception) ; `profils.entreprise`/`metier` sont par personne ; le bilan mensuel part vers `organisations.cree_par`.
- `lib/statistiques/calculerStatistiques.ts:229-239` suppose une organisation pour l'admin.

**Ce qui facilite :** `mes_organisations()` renvoie déjà un ensemble, donc **toutes les policies RLS fonctionnent telles quelles** en multi-organisation. La numérotation des devis et factures est déjà par organisation. La plupart des routes filtrent déjà explicitement par `organisation_id`.

**Ce qu'il faudrait :**
- une notion d'« organisation active » : cookie, ou claim dans `app_metadata` validé côté serveur contre `memberships` ;
- `getOrganisationId(supabase, userId, orgDemandee?)` qui vérifie l'appartenance ;
- un sélecteur d'organisation dans l'interface ;
- supprimer `unique(user_id)` ;
- Storage préfixé par organisation ;
- notifications filtrées par membership actif.
