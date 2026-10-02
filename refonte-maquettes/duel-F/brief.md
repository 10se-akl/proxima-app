# Duel F — Le devis sur téléphone

**Le problème en une phrase.** Il faut éditer, vérifier et valider un devis au pouce, sans que la vérification ligne par ligne annule le gain de temps. C'est le reproche numéro un fait au devis vocal des concurrents.

**La douleur.** La recherche dit : « Un peintre explique que les devis dictés doivent être vérifiés point par point, donc qu'il n'y a aucun gain de temps par rapport à la saisie classique. C'est l'avertissement le plus important de ce document pour Compyo. » Et aussi : « Le logiciel doit porter la conformité à la place de l'artisan, silencieusement, et ne parler que quand quelque chose manque vraiment. » Le devis n'est **pas** la douleur n°1 : ce duel vise la justesse et la confiance, pas la richesse.

**L'état actuel.** Lis `_inventaire/05-ecrans-coeur.md` §5, puis vérifie `components/dashboard/ValiderDevis.tsx` (806 lignes), `components/devis/*` (EspaceDevis, EditeurLignes, ScoreDevis, CompletionMention, ApercuPdf, SuiviDevis), `lib/devis/qualite.ts`, `lib/devis/actions.ts`, `app/api/ai/generer-devis/route.ts` et `lib/postesFrequents.ts`. Les captures sont `captures/avant/devis*`.
- L'écran montre d'abord le titre et le montant, des onglets Modifier / Aperçu, le score, puis le formulaire. Les lignes du devis sont sous la ligne de flottaison.
- **« Envoyer au client » n'envoie rien** : il fige le devis. L'envoi réel passe ensuite par « Partager », sans le numéro du client.
- Il faut environ 7 gestes après la génération, sans aucune correction.
- Le brouillon est conservé sur le téléphone.

**Contraintes rappelées.** Aucun prix n'est fixé par l'IA : les prix viennent des postes de l'artisan, et l'artisan valide. Aucun envoi automatique. L'envoi part de son WhatsApp ou de ses SMS.

**Ce qu'il faut trancher :**
- le minimum à regarder pour être sûr ;
- ce que l'écran de validation montre en premier ;
- comment éditer une ligne au pouce ;
- comment le score et les mentions manquantes s'expriment sans bruit ;
- comment « valider » et « envoyer » deviennent un seul parcours honnête (que le bouton dise ce qu'il fait) ;
- qui peut valider ou envoyer si un coéquipier de terrain existe (duel A).

**Les candidats demandés (un agent par candidat) :**
- **A — Ne rien changer.** L'écran actuel, avec seulement les libellés honnêtes corrigés.
- **B — Le plus soustractif.** Un seul écran : le total, puis la liste des lignes, avec **seulement les lignes « à vérifier » mises en avant** (prix hors de vos habitudes, quantité absente, poste inconnu), puis un seul bouton « Envoyer par WhatsApp / SMS ». Le score n'apparaît que s'il bloque.
- **C — Une logique différente.** Par exemple, une vérification par exception en mode « cartes » (une ligne douteuse à la fois, Oui / Corriger), ou bien l'aperçu du document réel comme écran principal, éditable en touchant la ligne.
- **D — Libre.** La meilleure synthèse que tu puisses défendre.

**Chaque maquette montre :**
- l'écran de validation à 360 px sans défiler ;
- la correction d'une ligne ;
- une mention obligatoire manquante ;
- l'envoi, en comptant les gestes de « devis généré » à « parti au client ».

**Les poids** sont les poids standard.
