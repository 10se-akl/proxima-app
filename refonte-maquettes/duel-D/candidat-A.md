# Duel D · Candidat A — Ne rien changer, corriger trois bugs

**L'approche.** On garde la fiche telle quelle : en-tête, Maintenant, À faire, À retenir, Dossier, Facturation, Carnet. On corrige seulement ce qui trompe Gérard : deux feuilles « Message au client » qui font deux choses, un mémo qui se perd, un chantier terminé sans question. Le coéquipier voit la même fiche (un espace partagé, aucun rôle) ; le Carnet ajoute son prénom quand l'entrée n'est pas la vôtre.

**La douleur.** L'information éparpillée (★★★★★) : « Deux mois plus tard, le client demande ce qui avait été convenu pour tel détail, et l'artisan doit fouiller partout. » La fiche règle déjà ce point : le Carnet est un fil unique avec recherche, qui garde notes, dictées et photos. Les trois bugs retirent trois pertes de confiance : un texte perdu, un message à recopier, un clic de trop.

**Corrigé.**
- **Message au client : une feuille.** `page.tsx:1236` (« Copier le texte ») disparaît. « Préparer une relance avec l'IA » ouvre `FeuilleMessageClient`, qui montre le texte de l'IA avec SMS / WhatsApp, déjà codés (`ouvrirMessage`), et « Modèles prêts » pour revenir. L'IA propose, Gérard relit et envoie lui-même.
- **À retenir : brouillon local.** Le mémo n'est enregistré qu'au blur (`Blocs.tsx:406`) : fermer l'onglet en tapant perd le texte. Il garde un brouillon sur le téléphone ; sinon « Pas enregistré. Gardé sur ce téléphone. » et « Enregistrer ».
- **Terminer le chantier : une question** (« Chantier terminé ? »), depuis Maintenant comme depuis le menu « … ». `marquerTermine` (`page.tsx:748`) écrit tout de suite et passe les rendez-vous du jour en fait.
- **Prénom de l'auteur** dans le Carnet, seulement si ce n'est pas vous.

**Ce qui est supprimé, fusionné, ajouté.** Supprimé : la seconde feuille. Fusionné : les deux chemins de message. Ajouté : une phrase dans le mémo, une question, un prénom. Gérard ne perd rien.

**Gestes (avant → après).**
| Tâche | Avant | Après |
|---|---|---|
| 3 photos, galerie | 7 | 7 |
| 3 photos, appareil | 11 | 11 |
| Une dictée | 5 | 5 |
| Une note écrite | 4 ou plus | 4 ou plus |
| Relance IA envoyée par SMS | environ 5 (copier, quitter, contact, coller) | 2 |
| Terminer le chantier | 1 | 2, voulu |

**Mesuré** (banc `/apercu-moins?ecran=fiche-chantier`, 360 × 740) : en-tête 247 px, Maintenant 302, À retenir 270, Dossier 287, Carnet 373. La barre du bas commence à 675 px et le Carnet à 1 274 px. Sans défiler : l'en-tête et Maintenant. Rien de À faire, À retenir, Dossier ni du Carnet.

**Impact technique.** Aucune migration : `evenements_projet` et `notes_vocales` portent déjà `artisan_id`. Fichiers : `page.tsx` (retrait de la feuille et de ses états), `FeuilleMessageClient.tsx` (mode « texte IA »), `Blocs.tsx` (brouillon du mémo), `VueProjet.tsx` (confirmation), `Carnet.tsx` et `entreesCarnet.ts` (prénom). Risque faible. Le prénom suppose que le nom du coéquipier est lisible en base : cela dépend des règles d'équipe du duel A.

**Lots.** 1. Confirmation et brouillon du mémo (indépendants, sans effet de bord). 2. Fusion des feuilles de message. 3. Prénom dans le Carnet, après le duel A.

**Auto-évaluation (sur 100).**
- Charge mentale (30) : **14**. Plus de piège, mais la fiche reste un empilement de six blocs.
- Gestes (20) : **6**. Rien ne baisse, sauf la relance IA.
- Lisibilité à 360 px (20) : **11**. Un seul bouton plein, mais le premier écran reste l'en-tête.
- Risque technique (15) : **14**. Trois retouches locales.
- Coût de migration (10) : **10**.
- Cohérence (5) : **5**.

**Total : 60.**

**Deux faiblesses.** (1) Photo, note et dictée restent à 5 gestes, et le Carnet, là où l'on cherche « la mesure de la fenêtre », reste à 1 274 px, sous quatre blocs : la douleur du duel n'est pas traitée. (2) Sont conservés des écarts à `langage-interface.md` : « La demande » sur trois lignes, neuf tailles de texte dans `Blocs.tsx` et trois cibles de 28 px (`Blocs.tsx:133,286,418`) tant qu'on n'y touche pas.
