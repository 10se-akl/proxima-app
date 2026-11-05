import { CentreNotifications } from "@/components/notifications/CentreNotifications";
import { IconeLoupe } from "@/components/ui/Icones";
import { FOCUS } from "@/components/ui/recettes";

// ============================================================
// Le bandeau d'« Aujourd'hui » (05/11/2026, demande d'Axel) : en haut de
// l'accueil de l'app, une recherche dans ses projets et la cloche.
//
// - La recherche part vers la liste des projets, déjà filtrée (?q=, nom,
//   téléphone, adresse : ListeProjetsRecherchable). Un simple formulaire :
//   il marche même avant le chargement des scripts.
// - La cloche (CentreNotifications) : messages de Compyo et rappels dus en
//   chiffre, chantiers du jour en point rouge (lib/notifications/
//   badgeCloche.ts). Sur cet écran, c'est la seule : celle de la barre du
//   haut (téléphone) et celle de la barre latérale (ordinateur) se
//   retirent (Sidebar.tsx), pour ne jamais en montrer deux.
// ============================================================
export function BandeauAccueil() {
  return (
    <div className="mb-5 flex items-center gap-2">
      <form role="search" action="/dashboard/demandes" method="get" className="relative min-w-0 flex-1">
        <IconeLoupe taille={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel" />
        <input
          type="search"
          name="q"
          placeholder="Client, téléphone, adresse…"
          aria-label="Chercher dans mes projets"
          enterKeyHint="search"
          autoComplete="off"
          className={`h-12 w-full rounded-[14px] border border-gris-clair bg-surface pl-11 pr-4 text-base text-ink placeholder:text-steel ${FOCUS}`}
        />
      </form>
      <div className="shrink-0">
        <CentreNotifications vers="bas" />
      </div>
    </div>
  );
}
