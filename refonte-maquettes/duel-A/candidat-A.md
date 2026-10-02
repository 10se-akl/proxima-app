# Candidat A — Un seul bureau partagé : on répare la serrure, pas la maison

**Approche.** On garde `organisations` + `memberships` (propriétaire / employé), `mes_organisations()` et la règle « tout le monde voit tout » : les 49 fichiers qui appellent `getOrganisationId`/`getMembership` ne bougent pas. On ferme les failles d'isolation et d'intégrité légale encore ouvertes (F3-F7, F9, F10, F12 ; F1-F2 faites au commit 1995ce2), **sans nouvelle table ni colonne**. On fusionne les deux écrans d'équipe en un seul (Paramètres › Équipe) et `window.confirm` devient une feuille.

**Douleur.** « Ce n'est pas un problème de permissions, c'est un problème de transmission » (recherche, douleur ★★★☆☆). Dans A la transmission existe déjà : ce que Gérard dicte, photographie ou note arrive dans l'espace que Sophie ouvre le soir, sans réglage. A ne traite **pas** « qui a noté quoi », que la recherche nomme comme manque.

**Supprimé / ajouté / perdu.** Supprimé : `GestionEquipe.tsx` (la route `/dashboard/equipe` reste et redirige ; sa jointure `memberships→profils` n'a aucune FK, liste probablement vide) et le DELETE sur demandes/devis (aucun écran ne l'utilise). Ajouté : feuille de retrait, « Voit tout, comme vous » sous l'invitation, bouton « Prévenir par WhatsApp ». Perdu : rien de visible, sauf qu'un membre ne **modifie** plus un IBAN/BIC déjà saisi (la conjointe le demande au propriétaire).

## Les 8 questions

| # | Réponse de A |
|---|---|
| 1 Modèle | Espace unique. Le solo reçoit déjà son organisation à l'acceptation (`creerOrganisationProprietaire`) : invisible. Son écran Équipe = 1 ligne + 2 champs. |
| 2 Qui voit quoi | Tout le monde, **apprenti compris** (faiblesse). En base, restreindre exigerait des tables séparées (`devis_montants`, `parametres_tarifs`) : la RLS filtre des lignes, pas des colonnes, et `revoke select(col)` vise le rôle commun `authenticated`. Coût : 24 fichiers lisent les montants, 11 `factures`, 9 `parametres_entreprise`. Refusé ; retenu : la règle IBAN/BIC et la ligne d'honnêteté à l'invitation. |
| 3 Attribution | Non dans A. `artisan_id` existe sur ~8 tables, ni affiché ni contrôlé (usurpable). Option hors A : trigger `artisan_id := auth.uid()` (0 colonne), puis « par Sophie » affiché à partir de 2 membres. |
| 4 Terrain | Même appli, mêmes droits : dicter, photographier, noter, valider un devis, préparer un message (il part de SON téléphone). Pas de « mes chantiers » : Aujourd'hui montre tout. |
| 5 Invitation | E-mail conservé : la boîte prouve l'identité, aucun lien-jeton ne circule sur WhatsApp. Compyo prépare un texte WhatsApp **sans lien** que Gérard envoie lui-même, contre la vraie panne (spam, 24 h). Réponse **identique** dans tous les cas, jamais le message brut de Supabase, plafond d'invitations via `logs` (comme `limiteIA`). Réinviter une adresse déjà membre renvoie le lien (`resetPasswordForEmail`). Limite : fermer l'oracle à 100 % exige une table `invitations` acceptée à la connexion, hors A. Même neutralité pour le 409 de `POST /api/candidatures`. |
| 6 Multi-organisation | Écarté : `.maybeSingle()` renvoie `null` dès 2 lignes (49 fichiers = perte d'accès), 5 composants sans filtre d'organisation (audit 03). Expert-comptable : toujours prématuré, aucun artisan ne le demande. Deux entreprises = deux comptes. |
| 7 Sortie propre | Tout appartient à l'organisation : notes, rendez-vous, projets, devis restent. Trous fermés : photos et logo (F6), push (F7 : purge, rappels redirigés vers le propriétaire), cascades (F3), `cree_par` non retirable. Reste : les URL signées déjà émises vivent 1 h. |
| 8 Tarif | Inchangé : 1 organisation = 1 abonnement. Facturer par siège changerait l'économie : décision du fondateur. |

## Esquisse SQL et migration réversible en deux temps (`mes_organisations()` inchangée)

```sql
-- TEMPS 1 : compatibilité (additif ; l'app actuelle continue de marcher)
-- F5 : prochain_numero_facture() ; en tête de fonction :
if p_organisation_id not in (select mes_organisations()) then raise exception 'interdit'; end if;
revoke execute on function prochain_numero_facture(uuid,int) from public, anon;
revoke execute on function creer_theme_produit_libre(...) from public, anon, authenticated; -- F12 (appelée via admin)
-- F10 : la policy FOR ALL existante gagne, dans WITH CHECK : artisan_id = auth.uid()
-- F4 : dans verrouiller_devis_valide()
if old.statut <> 'brouillon' and new.statut = 'brouillon' then raise exception '...'; end if;
if current_user in ('authenticated','anon') and (new.signe_le, new.signature_nom, new.signature_data, new.signature_ip)
   is distinct from (old.signe_le, old.signature_nom, old.signature_data, old.signature_ip) then raise exception '...'; end if;
-- F9 : trigger before update sur parametres_entreprise : iban/bic déjà renseignés → rôle 'proprietaire' requis
-- F6 : en plus de l'ancienne règle {uid}/… ; les nouveaux envois écrivent {organisation_id}/…
create policy photos_logos_org on storage.objects for all
  using      (bucket_id in ('photos','logos') and (storage.foldername(name))[1] in (select mes_organisations()::text))
  with check (bucket_id in ('photos','logos') and (storage.foldername(name))[1] in (select mes_organisations()::text));
alter table memberships add check (role in ('proprietaire','employe'));
-- TEMPS 2 : resserrement, après vérification
-- script : storage.move {uid}/… → {org}/… + réécriture des chemins (demandes.photos, partages_entrants.images, devis.photos_incluses, logo_url)
drop policy "…gère les photos de l'équipe", "…gère le logo de l'équipe";           -- F6 (a) et (b) clos
-- F3 : policies demandes/devis (FOR ALL) scindées en select/insert/update, plus de DELETE
alter table factures drop constraint factures_demande_id_fkey, add foreign key (demande_id) references demandes(id) on delete restrict;
-- idem factures.artisan_id, demandes.artisan_id, devis.artisan_id → restrict
```
Retour arrière : l'inverse de chaque bloc est écrit à côté ; le temps 1 peut rester seul. Le trigger F4 (`current_user` dans une fonction `security definer`) est à valider en préproduction d'abord.

## Gestes (tâches fréquentes du duel)

| Tâche | Avant | Après |
|---|---|---|
| Inviter le conjoint (Plus › Paramètres › Équipe › nom › e-mail › envoyer) | 6, impasse si le lien expire (409 « compte existe ») | 6 (+1 WhatsApp facultatif) ; lien perdu : 6 |
| Retirer un membre | 5 (lien de 12 px, `window.confirm`) | 5 (bouton 48 px, feuille) |
| Le bureau retrouve ce que le terrain a capté | 1 | 1 |
| Première connexion de l'invité | 4, texte « candidature acceptée » (faux) | 4, texte « équipe de Gérard » |

A **ne réduit aucun geste** ; il retire des impasses.

## Impact technique et lots (jamais de big bang)

| Lot | Contenu | Fichiers | Risque |
|---|---|---|---|
| 1 | SQL temps 1 hors Storage | `migration-45a.sql`, `schema.sql` | Faible ; tester signature en ligne, facture, avoir |
| 2 | Invitation neutre, retrait propre, push | `api/equipe/inviter`, `retirer`, `push.ts` + 3 crons, `definir-mot-de-passe`, `api/candidatures` | Faible |
| 3 | Une seule interface | `EquipeSection.tsx`, `equipe/page.tsx` (redirection), `GestionEquipe.tsx` | Faible ; ancre `#equipe` à vérifier |
| 4 | Storage par organisation | 3 envois (`PhotosProjet.tsx:97`, `api/partage/route.ts:83`, `VueParametres.tsx:119`) + script | **Seul lot risqué** : vraies données |
| 5 | SQL temps 2 (F3) | `migration-45b.sql` | Faible : aucun code n'efface demandes, devis ni factures |

Données migrées : les seuls chemins Storage. Environ 15 fichiers touchés.

## Auto-évaluation (poids du duel)

| Critère | Note | Pondéré | Pourquoi |
|---|---|---|---|
| Charge mentale (25) | 6 | 15 | Un seul modèle ; mais aucun « qui a noté quoi » |
| Gestes (10) | 5 | 5 | Aucun geste gagné |
| Lisibilité (10) | 7 | 7 | 48 px, feuille ; l'écran était déjà court |
| Risque, régression, sécurité (30) | 7 | 21 | Régression minimale, isolation entre clients réparée ; confiance interne non traitée |
| Migration (15) | 8 | 12 | Pas de refonte de table ; seul Storage migre |
| Cohérence (10) | 8 | 8 | Un modèle, une interface |
| **Total** | | **68/100** | |

**Deux faiblesses.** (1) A ne traite pas la douleur nommée par la recherche : pas d'auteur, pas de vue terrain ; son gain est celui d'un espace partagé, que l'app a déjà. (2) La confiance reste sociale : tout membre voit prix, marges, factures, bilan et modifie le journal ; insuffisant pour un salarié non familial. Ce qui me ferait basculer vers C : deux artisans sur cinq avec un salarié refusant qu'il voie les prix.
