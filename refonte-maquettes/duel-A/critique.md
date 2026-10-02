# Duel A : critique adverse

> Les numéros de ligne renvoient à `supabase/schema.sql`, sauf mention contraire. Je n'ai exécuté aucune requête. Les affirmations des candidats que j'ai vérifiées et qui tiennent : 49 fichiers appellent `getOrganisationId`/`getMembership` ; `.maybeSingle()` renvoie `null` dès qu'il y a deux lignes (`lib/organisation.ts:18-22`) ; aucune FK ne relie `memberships` à `profils` ; aucun code n'efface de `demandes` ni de `devis` ; le plafond IA se compte par organisation (`lib/limiteIA.ts:39-61`) ; `notes_vocales` est lue par 3 routes IA ; le dépôt ne contient aucun test automatisé.

## Candidat A : ne rien changer au modèle

1. **Sérieuse : le seul lot risqué touche 100 % des artisans seuls, pour un gain qui ne concerne que les équipes.** La migration `{uid}/…` → `{org}/…` réécrit `devis.photos_incluses`. Or `verrouiller_devis_valide` refuse cette écriture sur tout devis validé ou envoyé (l. 2218) : il faudra désactiver le verrou légal pendant la migration, ce que A ne dit pas. A oublie aussi `partages_entrants.image_path` (l. 1115). Enfin, A efface la seule trace de l'auteur d'une photo (l'uid dans le chemin), ce qui interdit plus tard le « par Sophie » qu'A propose lui-même en option.
2. **Sérieuse : F9 est annoncée fermée, elle ne l'est pas.** Le trigger « before update » sur l'IBAN se contourne de deux façons :
   - par un `DELETE` puis un `INSERT` de `parametres_entreprise`, puisque la policy est `for all` (l. 583) ;
   - par un `INSERT` REST direct dans `factures` avec un `mentions_legales` forgé. Ce champ est écrit par le code client (`app/api/factures/creer/route.ts:266`) et la policy ne vérifie que l'organisation.

   Dans le même temps, la conjointe qui tient la banque perd la main sur l'IBAN : la règle crée une friction réelle pour une protection fictive.
3. **Sérieuse : l'ordre des lots fait mentir l'écran.** La feuille de retrait (lot 3, rendu 4) promet « Ses notes, photos et projets restent ». Mais F6a n'est réparée qu'au lot 4 : dans l'intervalle, retirer quelqu'un rend ses photos invisibles à toute l'équipe. F6b, la fuite entre clients, reste ouverte jusqu'au temps 2. F11 (`repondre_devis_public`, l. 1612) n'apparaît nulle part. Le verrou F4 oublie `signature_user_agent` (l. 1534).
4. **Sérieuse : la question 5 est esquivée.** Quand l'invité a déjà un compte Auth sans profil (une candidature en attente), `inviteUserByEmail` échoue (`app/api/equipe/inviter/route.ts:115`). La « réponse identique » transforme alors cet échec en silence : Gérard attend une personne qui ne recevra jamais rien. Le chemin « réactivation » (l. 93 de la même route) rattache toujours un profil libre **sans son consentement**.
5. **Mineure : les gestes sont sous-comptés.** « Prévenir par WhatsApp » demande 3 gestes (bouton, choix du contact, envoyer), pas 1. Comme A dit lui-même que le mail finit dans les indésirables, cette étape devient obligatoire : le total passe à **9**, pas 6. Côté F10, la policy garde `USING MO` : chaque membre lit encore les clés push de ses coéquipiers.
6. **Mineure : la douleur n'est pas traitée.** Ni le « qui a noté ça », ni la confiance envers un salarié. A le reconnaît : son gain se limite à un espace partagé, que l'application offre déjà.

## Candidat B : « Quelqu'un avec vous »

1. **Sérieuse : « une personne = une entreprise, pour toujours ».** `retire_le` laisse la ligne en place et `unique(user_id)` empêche toute autre appartenance. Prenons l'apprenti qui s'installe à son compte, ou la conjointe après une séparation : à l'acceptation de sa candidature, `admin/candidatures/[id]/route.ts:236-241` trouve l'ancienne ligne, ne crée pas d'organisation, et la personne arrive sur « Vous n'avez plus accès ». Avec la même adresse, elle ne pourra jamais avoir son propre Compyo. S'y ajoute le plafond de deux personnes, qui exclut le trio Gérard, apprenti et épouse.
2. **Sérieuse : régression sur l'appareil partagé, c'est-à-dire le cas du bureau.** Le correctif F10 `using (artisan_id = auth.uid())` entre en conflit avec l'upsert `onConflict: "endpoint"` (`app/api/notifications/abonner/route.ts:47`, `endpoint unique` l. 1272). Sur l'ordinateur du soir, souvent celui de la conjointe, le second compte qui active les notifications tombe sur « Impossible d'enregistrer l'abonnement ».
3. **Sérieuse : même faille F9 qu'A** (`DELETE` puis `INSERT` de `parametres_entreprise`, ou facture forgée). Le rendu « Seul Gérard peut changer l'IBAN » bloque l'épouse, qui fait la banque dans 91 % des cas.
4. **Sérieuse : l'invitation garde l'e-mail et ajoute une étape.** Le rendu 3, « Regardez votre boîte mail », conserve le risque des indésirables qu'il prétendait fuir : l'invitée passe par WhatsApp, puis le web, puis sa boîte mail. Une invitée dont le compte est « en attente » qui appuie sur « Rejoindre » reste bloquée par `middleware.ts:105` et `app/dashboard/layout.tsx:30`, puisque rien ne bascule `app_metadata.acces`. Deux autres points :
   - le jeton du rendu (`compyo.fr/j/k7QxP2`, 6 caractères) contredit les « 128 bits » annoncés ;
   - un lien à usage unique ne doit pas être consommé par le GET, sinon les aperçus de lien le grillent avant l'invitée.
5. **Mineure : le coût est sous-estimé.** `lib/organisation.ts` reste bien inchangé. En revanche, six lecteurs de `memberships` ignoreront `retire_le` : `inviter/route.ts:74`, `admin/candidatures/[id]/route.ts:196`, `:236`, `calculerStatistiques.ts:229`, `:239`, `EquipeSection.tsx:57`, `:75`, `parametres/page.tsx:40`. Autres points :
   - le pivot `mes_organisations()` change pour tous, artisan seul compris, sans aucun test ;
   - le trigger de plafond, sans verrou, laisse passer deux arrivées simultanées ;
   - un ancien membre déjà réinvité ailleurs laisse F6b ouverte.
6. **Mineure : F8 est acceptée.** Le deuxième compte voit et supprime tout ce que la base permet.

## Candidat C : terrain et bureau

1. **Bloquante : `/rejoindre` crée un compte avec une adresse saisie et un mot de passe, sans preuve de la boîte mail** (rendu 4). Celui qui détient le lien peut attacher n'importe quelle adresse. Le vrai titulaire se heurte ensuite à `email_existant` en s'inscrivant, et ce compte échappe à la liste d'attente (pas d'`acces`). C'est exactement la classe de F2 (une identité fondée sur une adresse non vérifiée), que le commit 1995ce2 vient de fermer.
2. **Bloquante : le Storage « par chantier (2ᵉ segment) » ne couvre ni les photos reçues par WhatsApp ni les logos.** Les photos partagées sont rangées en `{uid}/partage-…`, avec un seul dossier (`app/api/partage/route.ts:83`), et sont versées telles quelles dans `demandes.photos` (`creer-depuis-brouillon/route.ts:122`). Les logos sont en `{uid}/…`. Deux issues seulement : garder la règle actuelle, et F6a/F6b restent ouvertes, ou la retirer, et ces photos disparaissent. L'argument « sans déplacer un fichier » est faux sur le partage WhatsApp.
3. **Sérieuse : la liste blanche du journal avale en silence ce que le terrain écrit.** `journal_chantier_interprete` (`demandes/[id]/page.tsx:405`) et `visite_effectuee` (l. 796) n'y figurent pas, et `enregistrerEvenement` ne fait que journaliser le refus (`lib/timeline.ts:29-44`). La détection « chantier probablement terminé » de l'Accueil (`dashboard/page.tsx:143`) cesse donc de fonctionner pour les chantiers que tient l'apprenti.
4. **Sérieuse : fermer `parametres_entreprise` coupe l'alerte météo à celui qui est dehors** (`planning/page.tsx:58` lit `adresse`) et prive la fiche projet de ses données (`demandes/[id]/page.tsx:250`, `select *`). Le terrain perd « Prévenir le client » : le silence avec le client, douleur n°1, revient dès que l'apprenti est seul sur place. Le pseudo-SQL est incomplet :
   - la colonne `notes.bureau_seul` n'a aucune policy, alors que le rendu 11 promet un filtre ;
   - F4, F11 et F12 sont absentes ;
   - le Bureau (`employe`) peut toujours changer l'IBAN.
5. **Sérieuse : environ 25 fichiers, c'est sous-estimé.** La RLS renvoie `[]` sans erreur. Chaque écran qui mêle projet, devis et factures doit donc être audité un par un :
   - `demandes/[id]/page.tsx` ;
   - `VueProjet` ;
   - `prochaineAction.ts` ;
   - `entreesCarnet.ts` ;
   - `FermerJournee` ;
   - `FacturesProjet` ;
   - `resume-journee` ;
   - les 5 pages d'argent.

   Le tout s'ajoute aux 49 appelants, sans aucun test : 40 fichiers est une estimation plus réaliste.
6. **Mineure : le rendu 1 garde des liens « Retirer » soulignés en ligne, sous 48 px**, c'est-à-dire le défaut que C dit corriger. L'invitation compte 9 gestes avec WhatsApp, pas 6.

## Candidat D : la porte de chantier

1. **Bloquante : la nouvelle surface ouverte à anon est large et durable.** D ajoute cinq fonctions `security definer` avec `grant execute to anon` (la classe de F5, F11 et F12) et une route de signature d'envoi en service_role, accessible avec un simple cookie. Les buckets restent sans limite de taille ni de type jusqu'au « temps 2 » (F13). Un lien WhatsApp transféré donne donc des envois illimités dans le bucket de l'artisan, plus les noms et adresses des clients du jour. Ce lien n'expire jamais une fois ouvert (`coalesce(jeton_expire_le,'infinity')`), et son jeton, placé dans le chemin `/c/[jeton]`, finit dans les journaux de l'hébergeur et l'historique du navigateur.
2. **Bloquante : le retrait ne coupe pas tout.** Le service worker met en cache toute page hors `/dashboard` et `/admin` (`public/sw.js:280-281`, `CACHE_PAGES` l. 431 et 472). `/c` et `/c/chantier/[id]`, avec noms et adresses de clients, restent donc lisibles hors ligne sur le téléphone de Kevin après son retrait, et D ne touche pas à `sw.js`. Les dépôts en attente sont perdus pour l'entreprise : le rendu 8 indique « Ce qui n'était pas encore parti reste sur ce téléphone », ce qui contredit « rien ne se perd ».
3. **Sérieuse : D ouvre une porte et laisse la fuite existante.** F6a et F6b restent ouvertes pour toutes les photos des membres : les policies l. 626 et 664 sont inchangées, et `photos_org` ne couvre que `{org}/…`. F4, F9, F10 et F11 ne figurent pas au lot 0. Le 20/30 que D s'accorde en sécurité est généreux.
4. **Sérieuse : du SQL faux et un retrait inopérant.**
   - `revoke select (jeton_hash) … from anon, authenticated` ne fait rien tant que le privilège SELECT existe au niveau de la table, ce qui est le cas par défaut dans Supabase. L'impact est faible (c'est un hachage), mais cela montre que le pseudo-SQL n'a pas été vérifié.
   - Les objets `{org}/…` n'ont qu'une policy SELECT : le bouton « supprimer la photo » (`PhotosProjet.tsx:164`) échoue sur une photo ratée de l'apprenti.
5. **Sérieuse : une entrée non authentifiée alimente l'IA.** La dictée d'un porteur de lien anonyme entre dans les prompts d'`analyser-demande`, de `generer-devis` et de `generer-reponse`, donc dans les brouillons de devis et de messages au client (injection de prompt possible, même si l'artisan valide). Côté F7, D purge seulement les notifications : les rappels du partant se perdent au lieu d'être redirigés.
6. **Mineure : rien ne change pour la conjointe** (F8 et F9 inchangées). Gérard fait 2 gestes de plus, et « Qui ajoutez-vous ? » introduit deux modèles mentaux à expliquer.

## Ce qu'aucun candidat ne traite

- **Les cascades de suppression non légales.** `artisan_id → profils ON DELETE CASCADE` subsiste sur `notes` (l. 1233), `notes_vocales` (l. 247), `evenements_planning` (l. 218), `evenements_projet` (l. 293) et `partages_entrants` (l. 1113). Supprimer le compte Auth d'un ancien membre (demande RGPD, nettoyage manuel) efface ses notes, dictées, rendez-vous et journal. Les candidats ne mettent `RESTRICT` que sur les documents légaux. Il faut `SET NULL`, avec des colonnes rendues nullables.
- **Les URL signées de 3600 s** (`PhotosProjet.tsx:41`, `demandes/[id]/page.tsx:277` et `305`, `EspaceDevis.tsx:108`, `VueParametres.tsx:97`). Personne ne propose de réduire cette durée (300 s suffit), alors que c'est trivial et que c'est la seule fuite qui survit au retrait.
- **`partages_entrants` reste lisible par l'ancien membre.** La policy repose sur `artisan_id = auth.uid()` sans organisation (l. 1126-1129), donc il garde les messages de clients qu'il avait partagés.
- **F9 par la facture.** Seule une fonction `security definer` de création de facture, ou un trigger qui recalcule `mentions_legales` depuis `parametres_entreprise`, ferme l'IBAN forgé.
- **Les comptes en attente invités dans une équipe** restent bloqués par `middleware.ts:105`.
- **Le transfert de propriété.** `cree_par` est en `RESTRICT` (l. 400) et aucune route ne change un rôle. Le couple où l'épouse tient l'administratif ne peut pas la nommer « propriétaire » sans SQL. Or A, B et C réservent justement l'IBAN, l'invitation ou la suppression au propriétaire.
- **Aucun test.** Le préalable à tout lot touchant la RLS est une matrice rôles × tables × opérations rejouable sur une branche Supabase. Seul C la propose.
- **Les brouillons locaux.** L'ancien membre garde les brouillons enregistrés sur son téléphone, hors de portée du serveur. La feuille de retrait devrait le dire.
