# Point d'arrêt : équipe (duel A) et navigation (duel B)

*Ces deux décisions engagent le modèle de données et l'habitude des utilisateurs. **Rien n'en est implémenté**, j'attends ta validation. Les arbitrages complets sont dans `refonte-maquettes/duel-A/arbitrage.md` et `refonte-maquettes/duel-B/arbitrage.md`.*

**Les maquettes gagnantes.**
- Équipe : `refonte-maquettes/duel-A/candidat-A.html`.
- Navigation : `refonte-maquettes/duel-B/candidat-D.html`.
- Rendus PNG : dans `rendus/` de chaque dossier.

Elles ont été dessinées **avant** l'arbitrage. Les écarts avec la décision finale sont signalés ci-dessous.

---

## Duel A : l'équipe. Une seule entreprise partagée, sans rôle affiché.

**La décision.** On garde le modèle actuel : une entreprise, et tout le monde y voit tout. On ne crée ni rôle « terrain », ni plafond, ni deuxième application.

**Ce qui change :**
1. **On ferme les failles en base.** Seuls le propriétaire et la base elle-même peuvent toucher à l'IBAN. Personne ne peut supprimer un projet, un devis ou une facture. Un devis signé est intouchable. La numérotation des factures et la signature publique ne peuvent plus être appelées de l'extérieur. Les photos sont rangées par entreprise, pas par personne.
2. **Le carnet dit qui a noté quoi** : « Raph · 14 h 12 », seulement quand ce n'est pas vous. L'artisan seul n'en voit jamais.
3. **Une seule interface d'équipe, dans Paramètres › Équipe.**
   - `/dashboard/equipe` redirige vers Paramètres, et `GestionEquipe.tsx` disparaît.
   - Le retrait se fait par une feuille en bas de l'écran : « Retirer Pierre ? Il n'ouvre plus Compyo. Ses notes, photos et projets restent. » Plus de `window.confirm`.
4. **L'invitation se fait par e-mail, puis la personne appuie sur « Rejoindre ».**
   - Compyo prépare un message WhatsApp sans lien (« regarde tes mails »), que Gérard envoie lui-même.
   - Gérard reçoit toujours la même réponse : on ne révèle jamais si une adresse a un compte.
   - Il dispose de « Renvoyer » et « Annuler ».
5. **Le départ d'un membre ne perd rien et ne laisse rien d'orphelin.** Son nom reste dans le carnet, ses rappels passent au propriétaire, ses notifications s'arrêtent. Supprimer son compte ne peut plus rien effacer.

**Ce que voit l'artisan seul : rien de nouveau.**

**Ce qu'on écarte explicitement :**
- les prix cachés à l'apprenti : une vraie restriction en base coûterait environ 40 fichiers, sans un seul test ;
- un utilisateur dans plusieurs entreprises ;
- l'accès de l'expert-comptable, toujours prématuré (l'export existe déjà) ;
- le lien d'invitation sans e-mail (une porte publique) ;
- l'accès anonyme pour l'apprenti.

**Écarts entre la maquette et la décision :**
- la maquette affiche « Propriétaire » et « Membre », alors que la décision n'affiche **aucun mot de rôle** ;
- la maquette ne montre pas encore le prénom de l'auteur dans le carnet (greffe 1).

**Mise en œuvre.** 9 lots, et 8 migrations réversibles, écrites mais jamais exécutées par moi :

| Lot | Contenu | Migration |
|---|---|---|
| 0 | Banc de tests d'isolation (`supabase/tests/isolation.sql`) | — |
| 1 | Fonctions exposées et contrainte de rôle ; devis signés et IBAN figés | 45, 46 |
| 2 | Fichiers rangés par entreprise (sans déplacer un seul fichier existant) | 47 |
| 3 | Départ propre, une seule interface d'équipe, feuille de retrait | 48 |
| 4 | Le prénom de l'auteur au carnet | — |
| 5 | L'invitation à accepter | 49 |
| 6 | Fin de l'ancien accès aux fichiers (au moins 2 semaines après le lot 2) | 50 |
| 7 | Plus aucune suppression en cascade | 51 |
| 8 | IBAN réservé au propriétaire, notifications par personne, signature publique fermée | 52 |

**Les migrations se passent en deux temps.**
- **Temps 1, compatibilité** : 45 à 49. Elles ne font qu'ajouter, et l'application actuelle continue de marcher.
- **Temps 2, resserrement** : 50 à 52. Chacune n'est passée qu'après son code, une à la fois, avec la matrice d'isolation rejouée sur une copie de la base.

**À trancher par toi :**
1. Aucun mot de rôle affiché : d'accord ?
2. La phrase de l'invitation, « Elle verra tout, comme vous : devis, prix, factures. ». C'est une promesse.
3. L'IBAN modifiable seulement par le propriétaire. Le transfert de propriété se ferait par le support.
4. Une personne invitée passe-t-elle devant la liste d'attente de la bêta ? Je recommande oui.
5. Le tarif reste « une entreprise = un abonnement ». Facturer par siège doublerait le prix d'un couple : à décider avant de vendre « l'équipe ».
6. À la suppression RGPD d'un ancien membre : anonymiser plutôt que supprimer ? C'est à écrire dans la politique de confidentialité.
7. Effacer les brouillons locaux du téléphone d'une personne retirée ? Je recommande oui.
8. Une invitation valable 14 jours ?

---

## Duel B : la navigation. « Argent » prend la place de « Plus ».

**La décision.**
- **Sur téléphone, en bas :** Aujourd'hui · Projets · [+] · Planning · **Argent**. Il n'y a qu'une case qui change, à la même place.
- **Sur téléphone, en haut :** un **avatar** (initiales) ouvre une feuille « Compte » : Paramètres, Guide, Donner mon avis, thème, installer, se déconnecter.
- **Sur ordinateur :** les mêmes quatre destinations dans la barre latérale, et Paramètres · Guide · Avis à un clic, en bas.
- **La page Argent**, 5 blocs au plus :
  - le total « à encaisser », calculé comme le Bilan ;
  - « En attente du client », avec « Relancer » (le message prêt, envoyé depuis son propre téléphone) ;
  - « Devis à envoyer » ;
  - plus tard, « À facturer » ;
  - en pied de page : Tous les devis · Toutes les factures · Bilan du mois.

**Où vit chaque écran :**
- Devis, Factures, Bilan : dans le pied d'Argent (2 gestes, comme aujourd'hui) et dans chaque projet.
- Notes : on en crée une par le [+] (3 → 2 gestes) et on les lit par la cloche.
- Équipe : dans Paramètres.
- Carte mentale : **sort de l'application** (la page reste publique).
- Aucune route n'est supprimée.

**Gestes :**
- relancer une facture hors de l'accueil : 7 → 4 ;
- voir tout ce qu'on me doit : 1 geste (cette vue n'existe pas aujourd'hui) ;
- aucune tâche ne coûte plus cher qu'aujourd'hui.

**Le soir de la conjointe, sur ordinateur :**
1. un clic sur Argent : le total et tout ce qui attend ;
2. une relance part en 4 gestes, depuis son propre WhatsApp.

**La dissidence.** « Ne rien changer » perd de peu (65,5 contre 67,5). Ses arguments :
- rien de mesuré ne montre que « Plus » gêne ;
- l'avatar en haut reste hors de portée du pouce ;
- Argent répète des lignes d'Aujourd'hui.

**Ce qui ferait changer d'avis.** On mesure l'usage avant de basculer : la table `visites` enregistre déjà les pages `/dashboard/*`.

**Écarts entre la maquette et la décision :**
- pas de « Mon équipe » dans le menu Compte ;
- pas de « vue réduite » ;
- Argent tient en une seule colonne, même sur ordinateur ;
- pas de pastille sur Argent.

**Mise en œuvre en 4 lots.** On peut s'arrêter après le lot 2.
1. Le compte passe en haut, la Carte mentale sort (`Sidebar.tsx`).
2. La page Argent est ajoutée, sans rien retirer. Une seule fonction de calcul sert à l'accueil et à Argent. « Voir les N » d'« En attente du client » mène enfin au bon endroit.
3. **La bascule** : la 5e case devient Argent, et la ligne « Une note ou un rappel » entre dans le [+]. C'est réversible par une constante. Tu préviens les testeurs le jour même.
4. « À facturer », une fois la règle décidée.

**À trancher par toi :**
1. Le mot : « Argent » (recommandé) ou « Factures » ?
2. La règle « À facturer » : chantier terminé, devis accepté, solde après acomptes et avoirs ? Le total doit égaler celui du Bilan.
3. La signature d'une relance envoyée par ta conjointe : « Gérard Martin, Martin Plâtrerie » ou « Sylvie, pour Martin Plâtrerie » ?
4. La date de la bascule et le message aux testeurs.
5. La Carte mentale n'a plus de lien dans l'application : d'accord ?

---

## Une décision transverse (duel H, langage visuel)

**La couleur du bouton d'action principal.**
- **Anthracite** (recommandé) : une trentaine de boutons le sont déjà.
- **Terracotta foncé** (`signal-fonce`) : le terracotta actuel (`signal`) en texte blanc n'est qu'à 3,7:1, sous le seuil de lisibilité.

C'est le seul saut visible du langage. Il touche environ 50 boutons, y compris la connexion et la demande d'accès.
