# Candidat D — « Reçu » : une arrivée, un rangement, un « bien reçu » toujours possible

**Approche.** Les portes déposent toutes la même chose (un message, des images) dans `partages_entrants`, qui existe déjà, puis tombent sur un seul écran « Reçu » : le message est « gardé » dès l'arrivée, la proposition (client, téléphone, chantier, où ranger) se remplit en dessous, et **un seul bouton plein** crée le projet *et* prépare le « bien reçu ». Avec un numéro, SMS ou WhatsApp s'ouvre, texte prêt ; sans numéro (le cas courant), la réponse est copiée et « Retour » ramène dans la conversation. Coller, écrire et dicter deviennent une porte « Un message ».

**La douleur.** « pouvoir dire en une seconde "bien reçu, je vous rappelle ce soir" » ; « le soir, il n'y ait plus rien à trier parce que tout a été rangé au moment où c'est arrivé ». Dans le code, un partage WhatsApp n'a pas de numéro : la carte « bien reçu » (qui exige `?cree=1` et un téléphone) manque dans le cas courant, pour un client connu (`ajouter-note-depuis-partage`, pas de `?cree=1`) et pour un RDV détecté.

**Le grand micro n'est pas remis.** 91bc744 : « sert à rien et marche pas bien », la dictée du navigateur étant capricieuse dans l'appli installée (permission, 4G, résultats cumulés d'Android, voir `lib/dictee.ts`). On garde le petit « Dicter » existant, seulement s'il est pris en charge ; le micro du clavier reste le repli. Gain réel : l'IA extrait le nom, donc plus rien à taper après la dictée. La recherche avertit qu'une dictée de *devis* ne fait rien gagner : ici on relit le résultat (4 lignes), pas la transcription.

**Fusionné / supprimé / ajouté.**
- Fusionné : Coller + Écrire + Dicter en « Un message » ; feuille [+] de 3 lignes à 2 ; trois atterrissages (fiche `?cree=1`, planning, liste) en un.
- Retiré de l'écran, pas des données ni des routes : la page « Ce client a déjà un projet ouvert » (devient la ligne « Dans »), le brouillon à 8 champs (adresse et urgence se retouchent dans la fiche), le formulaire en 3 champs (`nouvelle` reste accessible).
- Ajouté : « Message gardé » + squelette, « Créer et répondre », écran « Rangé. » (règle 16), brouillon local du message, repli qui garde le texte. Aucun envoi automatique, aucune notification.
- L'artisan perd : le formulaire instantané sans IA (il attend la lecture, « plusieurs secondes », non mesuré), adresse et urgence au premier écran, l'alerte de doublon par nom (jusqu'au lot 3).

**Gestes** (convention de l'inventaire, jusqu'au « bien reçu » envoyé ; l'« après » est déduit, non testé).

| Tâche | Avant | Après |
|---|---|---|
| Partage WhatsApp, numéro inconnu (courant) | 4, aucun accusé (≥ 8 en le tapant) | 7, rien à taper |
| Partage, client connu | 4, aucun accusé | 5 |
| Partage, numéro dans le message | 6 | 5 |
| Dictée d'un nouveau projet | 6-7 + nom tapé | 5, rien tapé |
| iPhone, message copié | 10-11 | 8 |
| IA en échec | formulaire vide, texte perdu | 1 |

**Technique.** Touchés : `FeuilleCapture.tsx`, `partage/[id]/page.tsx` (l'écran Reçu), `importer/page.tsx` (devient « Un message »), `BrouillonProjet.tsx`, `CorrespondanceProjetExistant.tsx`, `lib/messagesClient.ts` (mode « copier », canal retenu), nouveau `lib/useDictee.ts` extrait de `nouvelle/page.tsx`. `router.replace` au lieu de `push` : aujourd'hui « Retour » mène à un partage supprimé (`partage_vide`). Ni migration, ni dépendance, ni route API nouvelle ; même table, même RLS personnelle, l'organisation reste recalculée côté serveur. Duel A : un coéquipier utilise le même Reçu, la ligne « Dans » propose le chantier existant. Duel B : le [+] reste au centre.

**Lots.** 1 : correctifs invisibles (repli qui garde le texte, `router.replace`, accusé même avec RDV ou projet existant, brouillon local du collé). 2 : l'écran Reçu et « Créer et répondre » (test sur Android réel). 3 : « Un message », feuille à 2 lignes, doublon par nom (`matcher`), capture simple vers Reçu. 4, optionnel, au fondateur : ligne « À ranger » dans « À faire de votre côté » (rouvre la rétention du Module 24, 7 jours, visible du seul compte qui a capté).

**Auto-évaluation (/100).** Charge mentale 24/30 · gestes 15/20 · lisibilité 16/20 · risque 8/15 · migration 6/10 · cohérence 4/5 = **73**.

**Deux vraies faiblesses.** (1) Le cas le plus courant reste à 7 gestes, sur deux hypothèses non testées : « Retour » ramène dans la bonne conversation, le presse-papiers passe. Ce n'est pas « en une seconde ». La feuille de partage système ferait 6, mais avec un risque de mauvais destinataire. (2) « Créer et répondre » ouvre WhatsApp après une écriture réseau : en 4G faible, le navigateur peut bloquer l'ouverture (repli : le bouton de l'écran « Rangé »). Un bouton qui fait deux choses est aussi un pari produit à valider.
