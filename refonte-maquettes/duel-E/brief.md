# Duel E — La capture

**Le problème en une phrase.** La capture est l'avantage le plus fort de Compyo. Pourtant, le geste le plus fréquent, une demande qui arrive pendant le travail, prend 6 gestes ou plus. Et l'accusé de réception « bien reçu » n'apparaît pas dans le cas le plus courant : un message partagé depuis WhatsApp n'a pas de numéro.

**La douleur.** La recherche dit : « Le besoin n'est pas de répondre à la place de l'artisan. C'est de pouvoir dire en une seconde "bien reçu, je vous rappelle ce soir". » Elle ajoute : « La vraie cible […] c'est que le soir, il n'y ait plus rien à trier parce que tout a été rangé au moment où c'est arrivé. » Et sur la dictée : « les devis dictés doivent être vérifiés point par point, donc […] aucun gain de temps ».

**L'état actuel.** Lis `_inventaire/05-ecrans-coeur.md` §4 et `_inventaire/02-statut-prompts-precedents.md` (le grand micro a été **retiré** par 91bc744 car il « sert à rien et marche pas bien » : comprends pourquoi avant de le remettre). Vérifie `components/navigation/FeuilleCapture.tsx`, `app/dashboard/demandes/nouvelle|importer|importer-capture|partage/[id]`, `app/api/partage`, `components/dashboard/CorrespondanceProjetExistant.tsx`, `BrouillonProjet.tsx`, `lib/ai/brouillonProjet.ts`, `lib/dictee.ts` et `lib/messagesClient.ts`. La capture est `captures/avant/capture-*`.
- Il y a quatre entrées : le partage Android, coller, les captures d'écran et la saisie à la main. Elles n'arrivent pas au même endroit après création.
- La dictée d'un nouveau projet prend 5 gestes, plus le nom tapé au clavier.
- Si l'IA échoue, le repli de création manuelle perd le texte partagé.

**Ce qu'il faut trancher :**
- un parcours plus court pour le geste le plus fréquent ;
- ce qui doit se passer **juste après** une capture (l'accusé de réception au client, le rangement dans un projet existant ou nouveau, l'étape suivante), pour que l'artisan n'ait plus rien à trier le soir ;
- le cas d'un coéquipier de terrain qui capte sur un chantier existant (duel A) ;
- le repli quand la dictée ou l'IA échoue, sans rien perdre.

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** Le parcours actuel, avec seulement les bugs corrigés : « bien reçu » sans numéro, repli qui garde le texte.
- **B — Le plus soustractif.** Une seule porte : tout ce qui arrive (partage, collé, photo, voix) tombe dans le même écran « Reçu », qui propose le rangement et l'accusé de réception. Moins d'entrées, un seul atterrissage.
- **C — Une logique différente.** Par exemple, une capture sans décision immédiate (on capte en 1 geste, Compyo range tout seul en proposition, et l'artisan valide les rangements en un coup d'œil le soir, ou sur Aujourd'hui), ou bien l'accusé de réception d'abord, le rangement ensuite.
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

**Chaque maquette montre :**
- WhatsApp → partage → l'écran d'arrivée → l'accusé de réception → le retour au travail, en comptant les gestes ;
- la dictée d'un nouveau projet ;
- le repli quand la dictée échoue.

**Les poids** sont les poids standard.
