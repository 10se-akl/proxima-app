# Architecture — Compyo MVP

## Stack
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Route Handlers Next.js (`app/api/*`) — pas de serveur séparé pour ce MVP
- **Base de données** : PostgreSQL via Supabase
- **Auth** : Supabase Auth (email / mot de passe)
- **IA** : API Claude (Anthropic), appelée uniquement côté serveur
- **Export devis** : impression navigateur → PDF (voir `components/dashboard/DevisPreview.tsx`)

## Sécurité
Row Level Security activée sur toutes les tables (`supabase/schema.sql`) : chaque
artisan ne peut lire/modifier que ses propres demandes et devis, appliqué au niveau
de la base de données — pas seulement côté application.

## Flux d'accès (bêta privée)
`/demander-acces` (candidature publique, aucun compte créé) → `/admin/candidatures`
(vous acceptez ou refusez) → si accepté, Supabase envoie un email d'invitation →
`/definir-mot-de-passe` → `/dashboard`. Aucun crédit IA n'est consommé avant l'acceptation
d'une candidature.

## Flux principal (une fois l'accès activé)
1. `app/(auth)/signup` → création de compte + profil artisan
2. `app/dashboard/demandes/nouvelle` → saisie d'une demande client
3. `app/dashboard/demandes/[id]` → analyse IA (informations manquantes, questions à
   poser), puis génération d'un devis structuré
4. `app/api/ai/analyser-demande` et `app/api/ai/generer-devis` → les deux seules
   routes qui appellent l'IA, chacune avec un prompt dédié et une réponse JSON stricte

## Ce qui n'est volontairement pas fait dans ce MVP
Application mobile, comptabilité, paiement, planning, reconnaissance photo,
automatisation complète des emails — voir la discussion initiale sur le périmètre.

## Prochaine étape technique si le MVP est validé
Remplacer l'export "impression navigateur" par une vraie génération PDF serveur
(mise en page fixe, logo, personnalisation) une fois que le besoin de personnalisation
des artisans est confirmé.
