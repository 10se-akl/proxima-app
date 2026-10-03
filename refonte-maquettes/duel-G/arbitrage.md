# Duel G — Arbitrage : le planning sur téléphone

Lu : protocole, brief, `docs/langage-interface.md`, les quatre candidats, la critique, les rendus de C et D. Revérifié dans le code ce qui décide (références ci-dessous).

## 1. Les notes (poids standard)

| Critère (poids) | A — rien changer | B — liste à venir | C — sept lignes | D — liste, avertir |
|---|---|---|---|---|
| Charge mentale (30) | 5 — la semaine se lit jour par jour, feuille à 9 choix | 6 — plus de semaine, « Aujourd'hui » double l'Accueil, « Pour » visible chez le couple | **8** — « où je vais cette semaine » en un regard, jours libres visibles | 6 — liste de B, plus une phrase d'avertissement à lire |
| Gestes (20) | 4 — créer reste à 8-9 | 8 — 3 / 5 / 5 | **8** — 3 / 5 / 5, météo à 3, semaine à 0 | 8 — 2-3 / 5 / 5 |
| Lisibilité 360 px (20) | 6 — bande de 7 onglets en 11 px, `text-[15px]`, `ink/60` | **8** — lignes de l'Accueil | 7 — repères de jour en petites capitales | 7 — feuille « Planifier » à 4 champs |
| Risque (15) | 6 — code sûr, mais la clé « créateur » retire la protection du couple | 4 — `assigne_a` nullable : exclusion muette sur `NULL` ; banc cassé | 5 — 3 composants neufs, `FeuilleDeplacer` partagée avec l'Accueil, fuseau | 3 — l'artisan seul perd son seul obstacle dur en base |
| Migration (10) | **8** — une contrainte, quelques lignes | 5 — colonne, contrainte, réécriture | 5 — idem au lot 4 | 5 — idem |
| Cohérence (5) | 6 — dette de langage gardée | 6 — doublon de l'Accueil | 6 — jours glissants contre lundi-dimanche | 7 — puces dans la feuille livrée |
| **Total / 100** | **55** | **64** | **69,5** | **61** |

## 2. Le vainqueur : C, sans son lot 4

**Pourquoi C.** L'Accueil montre déjà la journée (`ListeAujourdhui`). Le seul travail propre au Planning est donc **la semaine**. B et D ouvrent sur « Aujourd'hui », un doublon, et cachent les jours libres dans une absence. C répond en un regard à la question que le client pose au téléphone : « vous passez quand ? ». Son sélecteur de jours montre ce qui est déjà pris **avant** de choisir. La protection contre le double rendez-vous se voit donc avant d'être une erreur.

**Trois greffes, pas une de plus :**
1. **De B : l'« Annuler » de la grille ordinateur passe par la même question et le même message.** Aujourd'hui, il annule en un clic, sans un mot (`GrilleAgenda.tsx:196,293`). C'est le geste de la conjointe, le soir.
2. **De D (lot 1) : `?projetId=` préremplit le formulaire existant** (titre « Chantier {client} », jour, heure, durée), en appelant au chargement la logique de `choisirProjet` (`nouveau/page.tsx:142-163`). Aujourd'hui, seul `demandeId` est rempli (`:67`). Trois portes y mènent encore : `AConfirmer.tsx:181`, `ConfirmerClotureProjet.tsx:123` et `ConfirmationRdv.tsx:163`.
3. **De B : « Supprimer » quitte la feuille du téléphone.** Sur le terrain, « Annuler » suffit : rien n'est effacé et le créneau est libéré. « Supprimer » reste au menu de la grille (`GrilleAgenda.tsx:300`).

**Corrections imposées à C par la critique :**
- **Pas de huitième modèle** (`messagesClient.ts:19`). Après une annulation, on propose `decalage` sans date (`:83-85`). Ce texte est exact pour le cas fréquent : « je dois décaler, je reviens vers vous ». Si le client a annulé lui-même, Gérard touche « Pas maintenant ». Si le chantier est abandonné, il a « Appeler » dans la même feuille. Le libellé exact est la décision 2 du fondateur.
- **Pas de « Qui ? » ni de colonne `assigne_a`** : le lot 4 de C est retiré (voir § 3).
- **« Planifier » reçoit une quatrième puce, « À l'heure… »** (heure exacte, 1 h). Une visite de devis se fait à 12 h ou à 17 h 30. Or « Journée » (8 h–17 h) bloque toute la journée pour toute l'entreprise. Par défaut, on reprend l'heure et la durée du dernier rendez-vous du projet ; sinon, 8 h pour 1 h.
- **Pas de « Pluie 70 % »** : `resume` est un texte libre (`meteo.ts:35,112`). La ligne dit « Météo à risque », et « Prévenir » prend la colonne de fin (règle 7).
- **`AgendaMobile` garde son nom et ses props.** Seul son contenu change, pour que la page et le banc (`Apercu.tsx:193`) ne cassent pas.
- **La fenêtre de sept jours se calcule en heure de Paris**, côté serveur comme à l'affichage.

## 3. Ce qui est tranché

**Vue par défaut sur téléphone : sept jours glissants à partir d'aujourd'hui, une ligne par rendez-vous, regroupées par jour.** Un jour vide dit « Rien de prévu » avec un « + ». Un samedi et un dimanche tous deux vides se fondent en une ligne. Les flèches ‹ › avancent de sept jours. Il n'y a plus de bande, ni de « jour choisi ». L'ordinateur garde sa grille du lundi au dimanche.

**Les gestes finaux** (l'envoi dans la messagerie est compté) :

| Geste | Aujourd'hui | Après |
|---|---|---|
| Voir sa journée | 1 (ou l'Accueil) | 1 : aujourd'hui en tête (l'Accueil reste à 0) |
| Voir sa semaine | 1 + un appui par jour (jusqu'à 7) | **1** |
| Créer depuis une fiche | ≈ 8 | **3** : Planifier, jour, Planifier (2 si « demain » convient, +1 avec « À l'heure… ») |
| Reporter à demain en prévenant | 11 (7 + 4, texte sans date) | **5** : ligne, Déplacer, « Déplacer à demain », SMS, envoyer |
| Annuler en prévenant | 2 sans un mot ; 6 avec un texte inadapté | **5** : ligne, Annuler, « Oui, annuler », SMS, envoyer (4 sans prévenir) |
| Prévenir pour la météo | 4 | **3** |

Le message est toujours préparé, jamais envoyé : il s'ouvre dans le SMS ou le WhatsApp de Gérard (`ouvrirMessage`), après une écriture dont on a lu le résultat, comme dans `FermerJournee.tsx:129-139`. Pas de glisser-déposer : avec des gants, dans une liste qui défile, le lâcher est raté, et il n'a pas d'alternative accessible.

**Chevauchement et équipe : la contrainte reste celle de toute l'organisation (`schema.sql:1834-1841`). Aucune migration.**
- **Elle protège déjà les deux cas fréquents.** L'artisan seul, et le couple « un terrain, un bureau », où Sophie saisit le soir les rendez-vous de Gérard. Gérard et son apprenti travaillent ensemble : un seul rendez-vous suffit.
- **A corrige le mauvais cas.** Sa clé `artisan_id` désigne l'auteur, forcé par le trigger du Module 48. Elle retire la protection du couple et bloque toujours Gérard quand il planifie pour Raph.
- **D ôte à l'artisan seul son seul obstacle dur.** Refusé : c'est le rappel non négociable.
- **Une règle juste par personne exige de savoir « qui y va » pour chaque rendez-vous.** C'est une assignation, que le duel A a refusée. Elle relève donc du fondateur (décision 1, Module 53 prêt mais non retenu).
- **La vue à deux** est le planning partagé, sans prénom. Le prénom de l'auteur (greffe 1 du duel A) **n'y figure pas** : « Sophie » sur un rendez-vous de Gérard se lirait « Sophie y va ».
- **Seul le message d'erreur change.** « …par quelqu'un d'autre de votre équipe » (`nouveau/page.tsx:313`, `ConfirmationRdv.tsx:136`) devient « Déjà pris à cette heure. », comme dans `FeuilleDeplacer.tsx:81`.

**Ce que devient « Modifier » :**
- **Un lien texte**, à côté de « Annuler le rendez-vous », et non plus une ligne.
- **Il ouvre le formulaire existant** (`/planning/nouveau?eventId=`, route intacte) pour le titre, la durée, les notes et le type.
- **Il ne décale plus en silence.** Si la date d'un rendez-vous lié à un projet change, l'enregistrement enchaîne sur « Message au client » (`decalage` avec la nouvelle date) avant le retour au planning (`:349`). Cette correction ferme aussi le lien de la fiche (`Blocs.tsx:267`) et le « Modifier » de la grille. Aucun candidat ne la proposait.
- **« Déplacer » remplace « Modifier ou déplacer »** dans la feuille. C'est le verbe déjà livré sur l'Accueil.

## 4. Les objections des perdants qui restent valables

- **A :** réécrire `AgendaMobile` coûte beaucoup pour un gain moindre que les lots 1 et 3. La bande montrait déjà des points. Le lot 2 doit se justifier seul.
- **B et D :** jours glissants sur téléphone, lundi-dimanche sur ordinateur. Gérard et Sophie ne cadrent pas la semaine de la même façon.
- **B :** au-delà de quatre rendez-vous par jour, les sept lignes deviennent sa liste, avec un en-tête de jour en plus.
- **D :** ses puces (« Demain · lun. 5 · mar. 6 · Autre… ») sont plus compactes que sept rangées radio. Dans une feuille à `92svh` (`Feuille.tsx:124`), « Planifier » peut passer sous la ligne de flottaison : **à mesurer à 360 × 640 avant le lot 3**.
- **La critique :** « Rien de prévu » n'est pas « libre ». Un chantier de trois jours reste trois rendez-vous, et déplacer le lundi ne déplace pas le mardi.
- **Personne ne traite deux points :** la météo de la ville du siège plutôt que celle du chantier (`meteo.ts:128`), et la grille ordinateur à deux, toujours sans « qui ».

## 5. Ce qui me ferait changer d'avis

- **Si les bêta-testeurs n'ouvrent presque jamais l'onglet Planning** (pages vues de `/dashboard/planning`, mesure d'audience du Module 44), l'Accueil suffit. On livre les lots 1 et 3 et on garde la bande.
- **Si l'on observe plus de quatre rendez-vous par jour** (dépanneurs, plutôt que plaquistes), la liste de B vaut C pour moins cher.
- **Si une équipe à deux poseurs autonomes bute sur le refus** (« Déjà pris » en `23P01` ou en contrôle client, dans une organisation de deux membres ou plus, plusieurs fois par mois), on passe au Module 53.
- **Si des artisans trouvent encore le texte faux après une annulation**, même en version (b), on passe au huitième modèle (décision 2, c).

## 6. Les lots, dans l'ordre (chacun laisse l'application cohérente)

1. **Prévenir après chaque changement.** Ni nouvelle vue, ni migration.
   - **Fichiers :**
     - `AgendaMobile.tsx` (`ActionsEvenement`) : « Déplacer » ouvre `FeuilleDeplacer`, puis `FeuilleMessageClient` avec `decalage` et la nouvelle date. « Annuler » pose la question (Oui, annuler / Non), puis propose le message. « Modifier » devient un lien. « Supprimer » sort.
     - `GrilleAgenda.tsx` : la même question et le même message (greffe 1).
     - `nouveau/page.tsx` : `?projetId=` prérempli (greffe 2), « Prévenir » après un changement de date, nouveau libellé du `23P01`.
     - `ConfirmationRdv.tsx` : le libellé.
     - Un test sur `decalage` et `premierePhrase` : `lib/messagesClient.ts` n'en a aucun.
   - **Risques :**
     - l'ordre écrire, lire, puis ouvrir le message (règle 13) ;
     - le lien `sms:` quitte la PWA : à la fermeture, il faut `router.refresh()` ;
     - un rendez-vous sans projet ni numéro : la question seule, sans message.
2. **La semaine en sept lignes** (téléphone seulement).
   - **Fichiers :**
     - `AgendaMobile.tsx`, dont seul le contenu est réécrit ;
     - `planning/page.tsx` : une seule requête couvre aujourd'hui → J+6 (téléphone) et lundi → dimanche (ordinateur), calculés à Paris ;
     - les règles 3, 4, 7, 17 et 18 du langage, appliquées aux lignes touchées.
   - **Risques :** le fuseau (le serveur calcule en UTC aujourd'hui) ; le décalage de `?semaine=` (7 jours glissants contre une semaine calendaire) ; les captures du banc.
3. **Planifier en trois appuis.**
   - **Fichiers :**
     - `ChoisirJour.tsx` (neuf) : sept rangées de 56 px, avec ce qui est déjà pris ;
     - `FeuillePlanifier.tsx` (neuf) : l'insertion et l'entrée du journal comme dans `nouveau/page.tsx:295-333`, le `23P01` géré ;
     - la tuile « Rendez-vous » de la fiche (`VueProjet.tsx:437`, `demandes/[id]/page.tsx:1015`) ;
     - le « + » d'un jour vide (cinq chantiers actifs, puis « Autre… » vers le formulaire) ;
     - `FeuilleDeplacer.tsx`, où `ChoisirJour` remplace le champ date.
   - **Risques :**
     - `FeuilleDeplacer` sert aussi à l'Accueil (`FermerJournee.tsx:143`, `AConfirmer.tsx:144`) : à repasser sur le banc ;
     - la hauteur de la feuille (§ 4) ;
     - « Journée » qui bloque toute l'entreprise.
4. **(Conditionnel) « Pour qui ».** Seulement si le fondateur dit oui à la décision 1.

## 7. Les décisions du fondateur (hors code)

1. **Rouvrir le duel A pour les rendez-vous (« Pour : Gérard · Raph ») ?** Je recommande **non** tant que le signal du § 5 n'est pas observé.
   - **Le coût :** le champ apparaît chez le couple, et Sophie doit choisir « Gérard ». Sinon, ses saisies ne protègent plus Gérard.
   - **Si oui, Module 53 (le SQL est à relire au lot, et la matrice du duel A est à rejouer avant) :**
   ```sql
   alter table evenements_planning add column pour_id uuid references profils(id);
   update evenements_planning set pour_id = artisan_id;          -- l'auteur, faute de mieux
   alter table evenements_planning alter column pour_id set not null;
   create function pour_par_defaut() returns trigger language plpgsql as $$ begin
     if new.pour_id is null then new.pour_id := new.artisan_id; end if;   -- après forcer_auteur (Module 48)
     if (tg_op = 'INSERT' or new.pour_id is distinct from old.pour_id) and not exists
        (select 1 from memberships where user_id = new.pour_id and organisation_id = new.organisation_id)
     then raise exception 'pour_id hors organisation' using errcode = '23514'; end if;
     return new; end $$;
   create trigger pour_par_defaut before insert or update on evenements_planning
     for each row execute function pour_par_defaut();
   alter table evenements_planning drop constraint evenements_planning_pas_de_chevauchement;
   alter table evenements_planning add constraint evenements_planning_pas_de_chevauchement
     exclude using gist (pour_id with =, periode with &&) where (type = 'rendez_vous' and statut != 'annule');
   ```
   - **La pose est sans risque :** la règle par personne est plus faible que la règle d'organisation, donc aucune ligne existante ne la viole.
   - **Le retour arrière, lui, peut échouer :** la règle d'organisation est plus forte. Il faut d'abord lister les rendez-vous de deux personnes qui se chevauchent depuis la pose, et en déplacer un.
   ```sql
   alter table evenements_planning drop constraint evenements_planning_pas_de_chevauchement;
   alter table evenements_planning add constraint evenements_planning_pas_de_chevauchement
     exclude using gist (organisation_id with =, periode with &&) where (type = 'rendez_vous' and statut != 'annule');
   drop trigger pour_par_defaut on evenements_planning;
   drop function pour_par_defaut();
   alter table evenements_planning drop column pour_id;
   ```
   - **L'ordre des triggers :** `pour_par_defaut` doit passer après le trigger d'auteur du Module 48. Postgres les exécute par ordre alphabétique : le nom est à vérifier au lot.
2. **Le texte après une annulation.**
   - (a) le `decalage` sans date actuel (« …je reviens vers vous rapidement avec une nouvelle date ») ;
   - (b) une phrase neutre dans ce même modèle (« …ne pourra pas avoir lieu. Je vous rappelle rapidement. ») ;
   - (c) un huitième modèle, « Annulation », qui casse la règle des sept.

   Je recommande (b) : le compte reste à sept.
3. **Le verbe :** « Déplacer » (déjà livré sur l'Accueil) ou « Reporter » (plus naturel), mais un seul partout.
4. **La promesse :** on ne promet pas « plus jamais de double rendez-vous » à une équipe de deux poseurs. La base protège l'entreprise entière, pas chaque personne.
