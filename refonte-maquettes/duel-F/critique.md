# Duel F — Critique adverse (devis sur téléphone)

Je ne défends personne. Références relues dans le dépôt le 02/10/2026.

## Six faits du code qui commandent le duel

1. **Le lien de signature n'existe qu'à `envoye`.** `obtenir_devis_public` filtre `statut in ('envoye','refuse')` (`schema.sql:2405`), `repondre_devis_public` refuse le reste (`:1638`), la page dit « Devis introuvable. » (`DevisPublicClient.tsx:121`). Noter « envoyé » avant WhatsApp est donc la seule façon, sans migration, de ne pas envoyer un lien mort.
2. **La relance J+5 ne lit que `statut='envoye'` et `envoye_le`** (`cron/relance-devis/route.ts`). Elle pousse « envoyé il y a N jours » et propose « le devis que je vous ai transmis » (`templates.ts:50`). Aucune preuve d'envoi n'existe.
3. **Le gel des mentions se fait à un seul endroit** : `marquerDevisEnvoye` (`actions.ts:62-68`). Il copie les paramètres, `null` compris. Le trigger interdit ensuite toute correction (`schema.sql:2213`), et le score « n'empêche jamais d'envoyer » (`qualite.ts:21`). Un devis parti sans décennale ne se répare que par une nouvelle version.
4. **Les prix générés ne sont jamais ceux de l'artisan.** Main-d'œuvre = son tarif (`calculerDevis.ts:194,207`) : « prix hors habitude » ne peut pas sonner dessus. Fournitures = table de mots-clés, sinon 60 € (`:150,221`), sans aucun mot de plaquiste. Les quatre maquettes montrent des prix réalistes (11,50 €/m²) que le moteur ne produit pas. La vraie incertitude est la quantité et la durée devinées par l'IA ; « quantité absente » n'arrive jamais (`generer-devis/route.ts:21-33`).
5. **« Habitude » est mince.** Clé = description entière (`postesFrequents.ts:53`), au moins 2 usages (`:72`), 8 postes (`:74`), prix du dernier usage, 40 derniers devis sans filtre de statut (`:36-40`) : les brouillons jamais relus comptent, et l'IA reformule ses libellés.
6. **Le score est déjà silencieux** : replié sauf si un point important manque (`ScoreDevis.tsx:91`).

## A — Ne rien changer

- **Sérieuse. Il ne traite pas le duel.** Lignes sous le pli, badge « IA » sur toutes (`EditeurLignes.tsx:257`), rien n'est désigné. A l'avoue.
- **Sérieuse. « Passer à l'envoi » reste faux.** Le bouton appelle toujours `marquerDevisEnvoye` (`SuiviDevis.tsx:157`) : gel irréversible, relance armée. La pastille « Envoyé — en attente » (`statut.ts:36`), l'accueil et le push affirment toujours.
- **Mineure. Seul à ne rien perdre en conformité** : le score est visible à l'envoi (`EspaceDevis.tsx:380`).
- **Mineure. Hors `langage-interface.md`** (règles 2 à 4), et la capture du guide est à refaire (`guide/contenu.ts:123`).

## B — Un écran, un bouton

- **Bloquante. Lien mort au départ.** Le devis reste `a_valider` jusqu'au « Oui, parti », statut non servi (fait 1). B écrit « vérifier que la page publique l'accepte » tout en annonçant « aucune migration » : il faut modifier deux fonctions `security definer`. Et `questionEnvoi` est un `useState` (`EspaceDevis.tsx:203`) : sur un Android d'entrée de gamme, l'onglet est souvent rechargé au retour de WhatsApp, la question disparaît, le devis reste « à envoyer » (`dashboard/page.tsx:312`) et la cliente a un lien mort. Le lot 1 de B livre cela en premier.
- **Sérieuse. Le signal.** Au premier devis, toutes les fournitures sont signalées (B l'admet). Ensuite, « Poste jamais chiffré » est faux pour un poste chiffré une fois (fait 5). La quantité plausible mais fausse passe, et le « Rien à vérifier » vert (écran 3) affirme une justesse non contrôlée.
- **Sérieuse. Gestes sous-comptés** : « 3 » ignore les deux lignes cerclées de son écran 1 (les cercles ne bloquent rien) et le retour dans Compyo. Voir le tableau.
- **Sérieuse. Deux prix sur un écran** : liste au prix client, feuille au prix de revient (« Votre prix 8,00 », « Pour le client 423,20 »). `ValiderDevis.tsx:718-741` existe pour éviter cette confusion.
- **Sérieuse. Mentions.** Une ligne non bloquante, puis gel au toucher (fait 3). Quelles mentions couvre `mentionsManquantes` ? SIRET, coordonnées et TVA contradictoire (`qualite.ts:169-181`, fréquente chez un micro-entrepreneur) n'ont pas de place. La ligne du mockup passe sur deux lignes.
- **Mineure.** La conjointe sur PC garde le formulaire actuel, et le bouton ouvrirait WhatsApp Web.

## C — La pile de questions

- **Bloquante. Même lien mort que B** : « valide puis ouvre WhatsApp », « noté envoyé » ensuite. C annonce « RLS inchangée » sans évoquer les deux fonctions publiques ; même question perdue au rechargement.
- **Sérieuse. « Passer » sur la mention manquante** (écran 4) : un appui esquive une mention légale, puis le gel est irréversible. Plus faible que le score actuel.
- **Sérieuse. Le « Oui » réflexe** (C l'admet). « Plus gros poste » est posée à chaque devis, le seuil de 15 % est arbitraire, la deuxième ligne n'est pas contrôlée. À sa décharge, c'est le seul signal qui vise la bonne variable : durée et quantité.
- **Sérieuse. Coût sous-estimé.** `validerDevis` n'est pas « exportable » : c'est une fermeture sur une vingtaine d'états (`ValiderDevis.tsx:367-483`). `confirmees` dans `EtatEdition` fait différer l'empreinte (`:205`) : trois « Oui » déclenchent « modifications non validées retrouvées » (`:499-510`).
- **Mineure.** Deux parcours à maintenir (pile, formulaire). Son décompte est le plus honnête, mais il oublie le retour.

## D — Le total, les doutes, un bouton

- **Sérieuse. « Envoyé » écrit au toucher.** `envoye_le` est l'heure du toucher. Si Gérard est interrompu avant d'appuyer sur envoyer, le client n'a rien reçu, mais la pastille, l'événement « Devis envoyé au client » (`actions.ts:89`) et le push J+5 affirment le contraire. D ne change aucune de ces chaînes : son « Pas parti ? » n'existe que sur un écran. Meilleur compromis (le lien est actif), pas honnête.
- **Sérieuse. Trois écritures avant `window.open`** sur 4G : pop-up possiblement bloqué (D le note). Surtout, `marquerDevisEnvoye` appelé avec le `devis` ou les `parametres` d'avant l'écriture figerait un `mention_tva_reduite` périmé (`actions.ts:67`, écrit à `ValiderDevis.tsx:443`) ou une décennale tout juste complétée. Irréversible, et D n'en dit rien.
- **Sérieuse. « Rien d'inhabituel dans vos prix. »** (écran 3) est vrai par vide au premier devis, et par construction sur la main-d'œuvre : fausse assurance. La règle « Quantité à confirmer · 1 m² » du mockup n'est définie nulle part. 24 m² au lieu de 20 passe (D l'avoue).
- **Sérieuse. Le prix ne se recompose pas.** Lignes au prix de revient, total TTC marge incluse : 612 + 9 + 1 245 = 1 866 € contre 2 306,26 €, sans marge, déplacement ni TVA à l'écran. C'est le trou déjà bouché une fois (`ValiderDevis.tsx:718-721`) ; seul le PDF du PC le rattrape.
- **Mineure.** Rangée de mention non bloquante ; `CompletionMention` n'a rien pour la TVA contradictoire (`:28-69`) ; cible de 32 px sur `.retour` (vue PC).

## Gestes, de « devis généré » à « parti » (recompte)

| Cas | A | B | C | D |
|---|---|---|---|---|
| Envoi sans rien lire | 6 + 1 glissement | 3 + retour = 4 | 7 | 2 |
| En relisant ce que l'écran signale | 6 | 5 + retour = 6 | 7 | 4 |
| Une ligne corrigée | 8 | 7 + retour = 8 | 9 | 6 |

Le « 2 » et le « 3 » ne s'obtiennent qu'en ne vérifiant rien, donc au premier devis, quand le risque est maximal. Le retour dans Compyo (un geste système ou deux) est obligatoire dans B et C, et personne ne le compte.

## Ce qu'aucun candidat ne traite

1. **L'amont** : appliquer les prix de l'artisan dès la génération (`calculerDevis`), plutôt que de signaler après coup. Sinon les mêmes lignes sont « à vérifier » à chaque devis. Personne n'a mesuré le taux de fausses alertes sur de vrais devis.
2. **Un nom d'état vrai partout** (`statut.ts`, accueil, push, événement, texte « transmis » de la relance), ou la migration qui servirait `a_valider`.
3. **Le gel conditionnel** : un « Envoyer quand même » explicite quand décennale ou identité manquent, pour que l'irréversible ne vienne pas d'un appui distrait.
4. **Le premier devis aux paramètres par défaut** (45 €/h, 15 %, 20 %) : l'avertissement `ValiderDevis.tsx:539-558` disparaît de B, C et D.
5. **Le canal** : WhatsApp en tête, alors qu'un client de 60 ans ou un fixe n'a parfois que le SMS (`messagesClient.ts:156-173`). Rien ne mémorise le dernier canal.
6. **L'apprenti** : un appui du coéquipier envoie un devis chiffré au nom de l'entreprise (duel A : mêmes droits).
