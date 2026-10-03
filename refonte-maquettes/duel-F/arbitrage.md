# Duel F — Arbitrage (devis sur téléphone)

**Vainqueur : D, « Le total, les doutes, un bouton », avec trois greffes et quatre corrections imposées.**
Faits revérifiés le 03/10/2026 :
- La page publique ne sert que `envoye` et `refuse` (`schema.sql:2405`). `repondre_devis_public` refuse tout autre statut (`:1638`).
- Le trigger laisse tout passer depuis `brouillon` (`:2188-2190`). Ensuite, il fige le contenu et les mentions une fois posées (`:2213`).
- `marquerDevisEnvoye` fige les mentions avec les `parametres` qu'on lui passe, sans les relire (`actions.ts:66-68`). L'événement s'appelle « Devis envoyé au client » (`:89`).
- La relance J+5 ne lit que `statut='envoye'` (`cron/relance-devis/route.ts:86`). Sa notification dit « envoyé il y a N jours » (`:193-194`).
- Les lignes sont saisies au prix de revient. Le récapitulatif qui ajoute la marge existe déjà (`ValiderDevis.tsx:707-741`).
- Les fournitures prennent le « Tarif de référence interne » (`calculerDevis.ts:221-230`). Le prix par défaut est de 60 € (`:150`).

## 1. Notes (poids standard)

| Critère (poids) | A | B | C | D |
|---|---|---|---|---|
| Charge mentale (30) | 3 | 7 | 6 | 7 |
| Gestes (20) | 3 | 7 | 4 | 9 |
| Lisibilité 360 px (20) | 3 | 7 | 8 | 8 |
| Risque technique (15) | 10 | 3 | 3 | 6 |
| Coût de migration (10) | 10 | 5 | 4 | 6 |
| Cohérence (5) | 4 | 7 | 6 | 8 |
| **Total /100** | **48** | **62** | **53,5** | **74** |

- **A.**
  - Charge 3 : les mots sont justes, mais les lignes restent sous le score et les 15 champs.
  - Gestes 3 : 6 appuis et un glissement, sans changement.
  - Lisibilité 3 : du texte en 10-11 px à 40 % d'opacité.
  - Risque 10 et coût 10 : rien ne change.
  - Cohérence 4 : l'écran reste hors de `langage-interface.md`.
- **B.**
  - Charge 7 : toutes les lignes sont visibles, celles à vérifier en tête. Mais « Rien à vérifier » rassure à tort, et le prix change entre la liste et la feuille.
  - Gestes 7 : 4, 6 et 8, en comptant le retour obligatoire dans Compyo.
  - Lisibilité 7.
  - Risque 3 : lien mort tant que Gérard n'a pas répondu « Oui, parti ». La question tient dans un `useState` et se perd au rechargement.
  - Coût 5 : il faudrait modifier deux fonctions `security definer`, et B ne le dit pas.
  - Cohérence 7.
- **C.**
  - Charge 6 : une question à la fois, mais les « Oui » deviennent des réflexes, et une mention légale se saute d'un « Passer ».
  - Gestes 4 : 7, 7 et 9.
  - Lisibilité 8 : grosses cartes.
  - Risque 3 : même lien mort que B, et l'empreinte du brouillon est cassée (`ValiderDevis.tsx:205`).
  - Coût 4 : deux parcours à maintenir.
  - Cohérence 6.
- **D.**
  - Charge 7 : le total et les doutes en tête. Mais les lignes repliées ne sont pas relues, et « Rien d'inhabituel » rassure sans rien vérifier.
  - Gestes 9 : 2, 4 et 6.
  - Lisibilité 8.
  - Risque 6 : le lien marche, sans migration. Restent le gel avec des paramètres périmés et `window.open` après plusieurs `await`.
  - Coût 6 : il faut extraire l'état d'un fichier de 806 lignes.
  - Cohérence 8.

**Pourquoi D.** C'est le seul modèle d'états qui soit sûr sans migration. Le statut `envoye` est écrit avant d'ouvrir WhatsApp, donc le lien de signature marche dès que le message part. Le statut vit en base, donc il survit au retour de WhatsApp et au rechargement. B et C livrent un lien mort dès leur premier lot.

**Greffes (trois, pas plus) :**
1. **De B : la liste entière au premier écran.** Elle remplace le repli « 4 autres lignes » de D. On montre 5 lignes au plus : les lignes signalées d'abord, puis les autres par montant décroissant. Chacune affiche sa quantité en clair, et « Voir les N autres » suit. C'est la réponse à « ce qui est replié n'est pas relu ». Une quantité fausse (24 m² au lieu de 20) n'est signalée par aucune règle : elle se voit seulement à l'œil.
2. **De C : le champ `prix_source` posé par `calculerDevis`.** Il vaut `artisan`, `reference` ou `defaut`, dans le jsonb de la ligne, sans SQL. Pour les anciens devis, on se replie sur le préfixe « Tarif de référence interne » de `detail_calcul`. C'est le seul signal prouvable aujourd'hui : « Prix Compyo ». Il remplace le « prix inhabituel » de D comme première règle.
3. **De A : la passe sur les libellés, étendue à tout le parcours.** « Envoyé » ne s'écrit plus nulle part sans preuve : `statut.ts:28-37`, `actions.ts:89`, `cron/relance-devis/route.ts:193-194`, `demandes/[id]/page.tsx:1310` et `guide/contenu.ts:123`.

**Corrections imposées (tirées de la critique) :**
- **Gel conditionnel.** Si un point « attention » de conformité manque (`qualite.ts` : décennale L243-3, identité et SIRET, coordonnées, TVA contradictoire), le bouton d'envoi pose d'abord une question.
- **Paramètres relus juste avant le gel.** On lit `parametres_entreprise` en base, jamais l'état React. La `mention_tva_reduite` vient de l'édition en cours.
- **Pas de rassurance par le vide.** « Rien d'inhabituel dans vos prix » est supprimé. Une liste sans signal est simplement une liste.
- **Un seul prix par ligne.** Les lignes restent à « vos prix », c'est-à-dire au prix de revient : c'est celui que Gérard tape et reconnaît. Une ligne touchable recompose le total. Le prix vu par le client n'apparaît que dans le PDF.

## 2. L'écran de validation à 360 × 740, de haut en bas

1. **La barre du haut.** « ‹ Mme Lefèvre » ramène au projet. « Voir le PDF » est un bouton texte de 48 px.
2. **Le total.** « Devis n° D-2026-051 » en `text-sm text-steel`. Puis **« 2 306,26 € TTC »** en `font-display text-3xl`, chiffres en mono.
3. **La recomposition.** Une ligne en `text-sm text-steel`, cible de 48 px : « Vos prix 1 866,00 € HT + marge, déplacement, TVA › ». Elle ouvre en feuille le récapitulatif actuel (`ValiderDevis.tsx:707-741`).
4. **La mention manquante, seulement si une mention obligatoire manque.** C'est une ligne de 64 px : « **Décennale manquante** » (mot d'alerte en `signal-fonce`), « Obligatoire sur un devis », puis ›. Elle ouvre `CompletionMention` tel quel, en feuille. Si plusieurs points manquent, on montre le premier, suivi de « +1 ». Pour la TVA contradictoire, le lien mène à `parametres#mentions` (lien existant). L'anneau et le pourcentage ne s'affichent plus sur téléphone ; l'ordinateur les garde.
5. **Le bloc « Les lignes 7 ».**
   - Il montre 5 rangées de 64 px.
   - Chaque rangée a une description tronquée (16 px, semi-gras), un détail « 18 m² × 22,00 € » en mono `text-steel`, et le montant à droite.
   - Une ligne signalée porte un mot d'alerte devant son détail : « Prix Compyo · 18 m² × 37,40 € », ou « Quantité à saisir ».
   - Ni badge « IA », ni case à cocher : un signal informe, il ne demande pas de tampon.
   - Le bloc se termine par « Voir les 2 autres », puis « Modifier tout le devis », qui ouvre l'éditeur actuel inchangé.
6. **Le bas de l'écran, collé au-dessus de la barre du bas.** Un bouton plein en encre, **« Envoyer par WhatsApp »** (`min-h-14`), et un bouton contour « SMS » de 80 px sur la même rangée. Si le téléphone est plus court, seules les lignes défilent : l'en-tête et le bouton restent visibles. L'accent `signal` apparaît trois fois au plus : le « + » et deux mots d'alerte.

**La feuille de ligne** reprend celle de D, sans « Votre habitude » (voir lot 5) :
- la quantité, avec − et + de 48 px et un champ au clavier numérique ;
- le prix, avec le même champ ;
- « Cette ligne 396,00 € » ;
- « Enregistrer » ;
- « Retirer cette ligne », en contour destructif, après la question « Retirer cette ligne ? ».

Toute modification passe par l'`EtatEdition` existant, donc par le brouillon local. **Aucun champ « vu » ou « confirmé » n'est ajouté**, pour ne pas casser l'empreinte, ce qui est le défaut de C.

## 3. Le parcours, de « devis généré » à « message prêt dans WhatsApp »

| Cas | Avant | Après |
|---|---|---|
| **Sans correction** | Valider · Envoyer au client · Partager · WhatsApp · contact = 5 appuis + 1 glissement | **1 appui** : « Envoyer par WhatsApp » |
| **Avec une correction** (24 → 20 m²) | 2-3 glissements + 3 appuis + les 5 appuis ci-dessus | **4 appuis + 1 saisie** : la ligne · le champ · taper 20 · Enregistrer · Envoyer par WhatsApp |
| Mention manquante, complétée une fois pour toutes | quitter l'écran | +3 appuis et 2 saisies, une seule fois dans la vie du compte |
| Mention manquante, envoi sans elle | — | +1 : « Envoyer sans la décennale » |
| Client sans numéro | — | partage système à la place de WhatsApp, +2 |

Ce que fait l'appui sur « Envoyer par WhatsApp », dans l'ordre :
1. Écrire la validation, puis `envoye`, avec des paramètres relus et des mentions figées.
2. Mettre le projet en `devis_envoye` et enregistrer l'événement.
3. Ouvrir `wa.me/33…` avec le message et le lien de signature (`ouvrirMessage`).

**Gérard appuie lui-même sur envoyer dans WhatsApp** : c'est le deuxième et dernier geste. Le retour dans Compyo n'est pas nécessaire. Si `window.open` est bloqué ou si l'enregistrement prend plus de 4 s en 4G, le bouton devient un lien « Ouvrir WhatsApp ». Si une écriture échoue, le devis reste « À envoyer » et rien n'est perdu.

**La question, quand une mention manque.** Elle se pose avant le gel : « Il manque votre décennale. Le devis sera figé sans elle. » Le bouton plein est « Compléter maintenant ». Le bouton contour est « Envoyer sans la décennale ».

## 4. Le modèle d'états retenu (aucune migration)

| En base | Quand | Liste et accueil | Écran du devis |
|---|---|---|---|
| `brouillon` | juste après la génération | « Brouillon » | la revue décrite au §2 |
| `a_valider` | validé sur ordinateur (« Valider sans l'envoyer »), ou parcours interrompu | « **À envoyer** ». L'accueil affiche « Devis à envoyer » (`dashboard/page.tsx:424`). | « Envoyer par WhatsApp » et « SMS » (lot 1) |
| `envoye` | au toucher de WhatsApp ou de SMS, ou avec « Le noter comme envoyé » | « **En attente** · depuis le 28/09 » | « Message ouvert dans WhatsApp le 28/09 à 14h32. », puis la ligne « Pas parti ? Rouvrir WhatsApp » |
| `envoye`, J+5 et J+10 | cron existant | « **Sans réponse** · 5 j ». C'est vrai, alors que « Relancé J+5 » ne l'est pas : la relance n'est que proposée. | inchangé |

Les événements de l'historique :
- « Devis préparé dans WhatsApp » ;
- « Devis préparé dans les SMS » ;
- « Devis noté envoyé ».

La notification J+5 devient : « Mme Lefèvre : pas de réponse au devis depuis 5 jours. Un brouillon de relance vous attend. » Le brouillon de relance garde « que je vous ai transmis » : c'est Gérard qui le relit et l'envoie, et il sait si le devis est parti.

**Le prix à payer est assumé.** `envoye_le` est l'heure de l'appui, pas une preuve que le message est parti. Rien à l'écran ne l'affirme.

L'option écartée consistait à servir `a_valider` sur la page publique, avec un « Oui, parti » au retour. Elle demandait de modifier deux fonctions `security definer`, d'ajouter un geste à chaque envoi, et de garder une question qui se perd au rechargement.

## 5. Les objections qui restent valables contre le vainqueur

- **B, C et la critique : « envoyé » est noté au toucher.** Si Gérard est interrompu, la relance J+5 se déclenche pour un message qui n'est jamais parti. Le libellé est désormais honnête ; le fait enregistré, lui, reste une approximation.
- **C : une quantité plausible mais fausse n'est signalée par aucune règle.** La vérification reste celle de l'œil de Gérard, aidée seulement par la quantité affichée en clair et par l'ordre des montants.
- **La critique : « Prix Compyo » signalera la plupart des fournitures à chaque devis**, jusqu'à ce que les prix de l'artisan soient appliqués dès la génération (lot 5). C'est le risque de lassitude.
- **A : extraire l'état de `ValiderDevis` (806 lignes) peut casser la restauration du brouillon.** A ne prenait aucun risque.
- **B : WhatsApp passe en premier**, alors qu'une cliente de 60 ans, ou un client avec une ligne fixe, n'a parfois que les SMS. Le dernier canal utilisé n'est pas mémorisé.

## 6. Ce qui me ferait changer d'avis

- **Plus de deux lignes « Prix Compyo » par devis** en moyenne, sur 20 vrais devis de plaquistes : le lot 5 passe avant le lot 4.
- **Plus d'un devis sur dix noté « en attente » alors qu'il n'est jamais parti**, mesuré par un retour d'artisan ou un lien jamais ouvert : je passe au modèle de B, avec sa migration.
- **Des corrections relevées surtout sur la durée de main-d'œuvre** : j'ajoute la seule question de C, « Plus gros poste : 3 jours, c'est juste ? ».
- **`window.open` bloqué sur un Android d'entrée de gamme en PWA** : le bouton passe en deux temps, « Enregistrer » puis le lien « Ouvrir WhatsApp ».

## 7. Lots livrables, dans l'ordre

Chaque lot laisse l'application cohérente.

1. **Envoi direct et mots vrais. Gain : de 7 à 3 gestes, sans refonte.**
   - `components/devis/SuiviDevis.tsx` : à l'étape `a_valider`, ajouter WhatsApp et SMS au numéro du projet, avec le partage système en repli. À l'étape `envoye`, afficher « Message ouvert… » et « Pas parti ? Rouvrir ».
   - `lib/devis/actions.ts` : relire les paramètres avant le gel, passer un titre d'événement en paramètre, ajouter la question du gel conditionnel.
   - Libellés : `lib/devis/statut.ts`, `app/api/cron/relance-devis/route.ts:193-194`, `demandes/[id]/page.tsx:1310` et `lib/guide/contenu.ts:123`.
   - Risques : le pop-up bloqué et le numéro invalide (`numeroWhatsApp` renvoie `null`). Les pastilles changent dans trois listes.
2. **Extraire l'état de l'édition, sans changement visible.**
   - Nouveau `components/devis/useEditionDevis.ts`, et `components/dashboard/ValiderDevis.tsx`.
   - Risques : l'empreinte (`:205`), « modifications retrouvées » (`:499-510`) et la restauration après rechargement. Ce sont les tests à écrire en premier.
3. **La revue sur téléphone.**
   - Nouveaux `components/devis/RevueDevis.tsx` et `FeuilleLigne.tsx`. On réutilise `components/projet/Feuille.tsx` et `CompletionMention`.
   - `components/devis/EspaceDevis.tsx` : sur téléphone, plus d'onglets ni d'anneau. L'ordinateur ne change pas et gagne « Valider sans l'envoyer ».
   - Risques : la barre du bas qui s'efface pendant la saisie, la PWA, le retour depuis WhatsApp et le parcours de la conjointe sur ordinateur.
4. **Le signal « Prix Compyo ».**
   - `prix_source` dans `lib/moteur-metier/calculerDevis.ts` et dans le type de ligne. `lignesADoute()` va dans `lib/devis/qualite.ts`, avec ses tests. `EditeurLignes` passe `prix_source` à `artisan` quand un prix est saisi à la main.
   - `lignesDeVente` recopie les champs un par un (`prixDeVente.ts:67-70`) : `prix_source` n'arrive pas chez le client. Un test le vérifie.
5. **Conditionnel, après la mesure du §6 : appliquer les prix de Gérard.**
   - Utiliser les postes de Gérard dès la génération (`calculerDevis` et `lib/postesFrequents.ts`, avec une clé normalisée), et afficher « Votre prix habituel » dans la feuille.
   - Risque : la correspondance entre libellés en texte libre.

**Aucune migration.** Aucune fonction en base ni aucune règle RLS ne change. Tout membre de l'équipe peut valider et envoyer, depuis son propre téléphone, et l'historique garde son nom.

## 8. À trancher par le fondateur

1. **Le libellé du bouton.** Je recommande « Envoyer par WhatsApp » : c'est bien par WhatsApp que Gérard envoie, et Compyo n'écrit jamais « envoyé » ensuite. L'autre possibilité est « Ouvrir WhatsApp ».
2. **Les mots des pastilles** : « À envoyer », « En attente » et « Sans réponse ».
3. **Une décennale manquante : question ou blocage ?** Je recommande la question. Gérard garde la main, et la responsabilité légale est la sienne.
4. **L'apprenti peut-il envoyer un devis chiffré ?** Si non, il faut une règle en base (duel A), pas un bouton grisé.
5. **Le canal par défaut** : WhatsApp ou SMS en premier, et faut-il retenir le dernier canal par client ?
6. **La couleur du bouton plein** : encre ou terracotta foncé (décision 1 du duel H).
