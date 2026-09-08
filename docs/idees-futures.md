# Idées pour plus tard

Notes de travail, pas des décisions figées — à reprendre et affiner quand le moment sera venu (après la bêta, une fois la structure juridique en place). Rien ici n'est codé ni actif.

## Bilan mensuel (08/09) — construit, mais l'email ne partira pas tout de suite

Architecture revue par Cowork puis codée : `lib/bilan-mensuel.ts`, page `/dashboard/bilan`, cron `app/api/cron/bilan-mensuel/route.ts`, colonne `factures.payee_le` ajoutée (manquait pour calculer "combien encaissé CE mois-ci" correctement).

**Dépendance découverte en codant, à ajouter à la liste de samedi** : l'email du bilan doit partir vers l'adresse de CHAQUE artisan, pas seulement celle d'Axel — le domaine de test Resend (`onboarding@resend.dev`) ne peut envoyer qu'à l'adresse du compte Resend lui-même. Il faudra, en plus d'acheter `compyo.fr` et de le brancher sur Vercel : **vérifier ce même domaine sur Resend aussi** (DNS séparés de ceux de Vercel), puis renseigner `RESEND_FROM_EMAIL`. Tant que ce n'est pas fait, l'envoi est sauté automatiquement sans erreur — le bilan reste consultable dans l'app.

Cron pas encore programmé côté cron-job.org (même service externe que les rappels) — à faire une fois `CRON_SECRET` en place.

## Structure juridique — décision (08/09)

Axel a choisi de ne PAS attendre ses 18 ans (risque qu'un concurrent prenne le même positionnement entre-temps). Voie retenue : SASU, avec un parent comme représentant légal tant qu'Axel est mineur non émancipé (à confirmer précisément avec LegalPlace — détails de procédure non garantis par Claude, sujet juridique spécialisé).

Budget plafond fixé par Axel : **1000€ maximum**, à répartir entre :
- Création (greffe + annonce légale + forfait LegalPlace) : ~300-500€ ponctuels — estimation à confirmer avec de vrais devis.
- Reste (~500-700€) comme trésorerie pour payer un expert-comptable en ligne (30-80€/mois estimé) le temps que les premiers clients payants arrivent — donne grossièrement 8 à 15 mois de marge.

Prochaine étape côté Axel (pas du code) : en parler avec un parent (rôle de représentant légal requis), puis obtenir de vrais devis LegalPlace + 2-3 experts-comptables en ligne (Dougs, Indy, Wity cités en exemple) pour remplacer ces estimations par des chiffres réels avant d'engager quoi que ce soit.

## Tarification

- **Bêta actuelle** : gratuite, tant qu'il n'y a pas de société (obligation légale).
- **Tarif fondateur** (bêta-testeurs actuels) : tarif à vie, en dessous du prix de lancement — récompense d'avoir testé un produit jeune sans garantie. Montant exact à définir (piste : 9-12€/mois, ou quelques mois offerts).
- **Prix de lancement** : ~20€/mois pendant les 3 premiers mois d'ouverture au public.
- **Prix "normal"** : ~35-40€/mois, à partir de 3-6 mois après le lancement.
- **Règle non négociable** : jamais augmenter le prix de quelqu'un déjà abonné à un tarif inférieur — un tarif obtenu est gardé tant que l'abonnement continue. Seuls les nouveaux arrivants paient le tarif du moment.

### Palier "Entreprise" (idée de la prof d'Axel, 08/09) — pour plus tard

Principe économique : une structure avec plusieurs salariés tire une valeur ABSOLUE bien plus grande de Compyo (plus de devis, plus d'heures gagnées, plus d'argent) qu'un solo — elle a donc une disposition à payer plus élevée, et un prix unique pour tout le monde laisse de la valeur sur la table pour les grosses structures tout en pesant trop lourd pour les petites. Solution classique en SaaS B2B (Obat le fait déjà : 25€ pour un auto-entrepreneur, jusqu'à 85€ pour les fonctionnalités complètes) : un palier "Entreprise" plus cher.

**Pas pertinent MAINTENANT** : Compyo est aujourd'hui pensé et construit pour le solo/petite équipe (pas de vraies fonctionnalités de gestion d'équipe — attribution de tâches à des employés, écarté précédemment comme hors cible). Ne changer le prix de lancement (20€→40€) que pour la cible actuelle. Ce palier "Entreprise" a du sens le jour où de vraies fonctionnalités équipe sont construites, pas avant.

**Argument de vente lié, à garder pour la communication** (idée d'Axel) : Compyo consolide ce que plusieurs outils séparés font chez la concurrence (devis, facturation, planning, signature électronique...) — un artisan qui paierait plusieurs abonnements séparés pour obtenir tout ça ailleurs (potentiellement ~100€/mois cumulés) peut tout avoir avec un seul abonnement Compyo à 40€. Un vrai argument de consolidation/coût total, pas juste "moins cher à l'unité".

**Confirmé le 08/09** : pas maintenant, priorité au solo/petite équipe. Reste ici pour plus tard.

## Petites équipes (08/09) — construit, et ce qui reste écarté

En creusant la question, l'API d'invitation/retrait d'équipe existait déjà (`app/api/equipe/inviter`, `app/api/equipe/retirer`) mais sans aucune page pour s'en servir — corrigé (`/dashboard/equipe`). Le planning était par ailleurs déjà partagé entre tous les membres d'une organisation (vérifié dans les policies RLS), ce n'était pas un manque.

Recherche concurrentielle rapide (Obat, Batikko, BTPBip, Kaliti) sur ce que proposent les autres pour les petites équipes (2-5 personnes) :
- **Rôles/permissions par employé** (Obat, Batikko) — écarté pour l'instant : Compyo n'a que 2 rôles (propriétaire/membre), tout le monde voit tout au sein d'une organisation. Ajouter des permissions fines serait de la complexité pour un usage à 2-5 personnes qui se font déjà confiance dans la réalité (souvent famille/couple/1-2 employés).
- **Accès gratuit pour l'expert-comptable** (Obat) — idée intéressante mais prématurée : Axel lui-même n'a pas encore de comptable (voir plus haut).
- **Pointage horaire par employé** (BTPBip) — écarté : hors du périmètre actuel de Compyo (devis/facturation/planning/suivi de chantier), ajouterait une fonctionnalité entière pour un besoin non exprimé par les bêta-testeurs actuels.

À revisiter si de vrais retours d'artisans en équipe (pas juste solo) le demandent explicitement — ne pas construire par anticipation.
- **Affichage du prix de lancement** : éviter un "~~40€~~ 20€ (-50%)" barré — juridiquement risqué pour un produit jamais vendu à 40€ avant (pratique commerciale trompeuse potentielle). Préférer : "Prix de lancement : 20€/mois — passera à 40€/mois à partir du [date]. Verrouillez ce tarif maintenant." Mettre une vraie limite (date précise, ou nombre de places) pour que l'offre reste crédible.
- **Accès sans paiement** : ne jamais bloquer la lecture des données existantes (projets, devis, factures, planning, notes) même si l'abonnement s'arrête — seul l'accès aux fonctionnalités IA doit être coupé (c'est la seule chose qui coûte réellement de l'argent à l'usage).

## Parrainage

Principe validé : donner un code, la personne parrainée l'entre à l'inscription.
- Filleul : -10% (récurrent tant qu'il reste abonné, sur le prix en vigueur à son inscription).
- Parrain : -20% sur son propre abonnement (récurrent), déclenché **seulement quand le filleul devient réellement payant** — pas à la simple inscription, pour éviter les faux comptes créés pour se faire des réductions soi-même.
- Si le parrain est encore en bêta gratuite au moment où son filleul devient payant : le crédit de -20% doit être mis de côté et s'appliquer automatiquement dès que le parrain passe payant à son tour.
- Cumul de plusieurs parrainages : à plafonner (proposition : -60% max) pour ne pas se retrouver avec des comptes à 0€ si quelqu'un parraine beaucoup de monde — décision finale à prendre par Axel.

## Marketing / acquisition

Compyo cible un public précis (artisans du bâtiment, souvent 40-60 ans) — pas le même public que TikTok/Instagram grand public. Canaux plus pertinents à explorer, moins chers/plus ciblés qu'une pub généraliste :
- Groupes Facebook d'artisans/BTP (très actifs en France, échanges de pair à pair).
- Forums spécialisés BTP.
- Partenariats avec des négoces de matériaux locaux (Point.P, Gedimat...) : flyers/QR code en caisse, très ciblé, peu coûteux.
- Chaînes YouTube d'artisans/BTP (contenu métier, audience déjà qualifiée) — sponsoring ou simple mention.
- Google Ads sur des mots-clés d'intention ("logiciel devis plombier", "appli gestion chantier artisan") — coût maîtrisable, démarrage à petit budget possible.
- Réseau personnel direct (l'ami à l'origine du projet, ses contacts, artisans locaux) — cohérent avec l'histoire personnelle déjà mise en avant sur /a-propos et /confiance.
- Chambres de métiers et de l'artisanat (CMA) — accès potentiellement plus facile une fois une vraie structure juridique en place.

## Étude de marché (08/09) — ce qui a été construit, et ce qui a été écarté

Recherche approfondie sur Tolteck, Obat, Batappli, Costructor, et les nouveaux entrants "devis IA" (Acompli, Batisigne, Rita, DevisMatic — au moins 6-7 concurrents directs identifiés, le positionnement "IA qui fait le devis" seul n'est plus un vrai différenciant). Décisions prises suite à cette recherche :

**Construit** (voir commits du 08/09) :
- Signature électronique en ligne du devis (Obat l'a nativement, Tolteck non — écart comblé).
- Mention TVA réduite automatique sur devis/facture (changement réglementaire du 16/02/2025).
- Bibliothèque de prix enrichie (~50 références supplémentaires) + **postes fréquents** : plutôt que copier la logique "grosse base de prix générique" des concurrents (30 000 à 80 000 postes, hors de portée sans acheter une vraie base de données), Compyo réutilise les postes que CHAQUE artisan a déjà lui-même chiffrés — sa vraie façon de travailler, marche dès le 2e-3e devis.
- Sous-totaux main d'œuvre / fournitures sur le devis (faiblesse relevée dans les avis Tolteck, corrigée).
- 19e métier ajouté : Pisciniste — marché réel, et un profil d'entretien récurrent (hivernage/remise en route) qui correspond exactement au mécanisme déjà construit pour le paysagiste.

**Sciemment écarté, avec raison :**
- *Gestion de stock/matériaux* — pertinent pour des entreprises avec un vrai entrepôt, pas pour l'artisan solo/petite équipe ciblé par Compyo (qui achète au fur et à mesure chez son négoce).
- *Attribution de tâches à des employés* — Compyo cible le solo/petite équipe ; l'organisation multi-membres existe déjà (partage des projets), mais une vraie gestion d'équipe avec assignation fine serait disproportionnée à ce stade.
- *Mode hors-ligne complet* — les fonctionnalités IA (cœur du produit) ont structurellement besoin du réseau ; en faire une fausse promesse "ça marche hors-ligne" serait trompeur. Limite assumée, pas résolue avec du code de façade.
- *Grosse bibliothèque de prix généraliste (30 000+ postes)* — nécessiterait d'acheter une vraie base de données professionnelle (BatiPrix ou équivalent), hors budget. Remplacé par "postes fréquents" (voir ci-dessus), jugé plus pertinent que copier la concurrence.

## Infrastructure technique à construire (quand le go sera donné)

- Palier d'accès par organisation (bêta / lancement / plein tarif / gratuit-lecture-seule).
- Gate sur les routes IA uniquement (jamais sur la lecture des données).
- Système de code de parrainage + suivi des réductions actives.
- Intégration Stripe (ou équivalent) — bloquée tant qu'il n'y a pas de structure juridique.
