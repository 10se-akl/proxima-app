import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BoutonRetour } from "@/components/dashboard/BoutonRetour";
import { PremierLancement } from "@/components/onboarding/PremierLancement";
import { PopupRappel } from "@/components/notes/PopupRappel";
import { lireMembership } from "@/lib/organisation";
import { BandeauReseau } from "@/components/ui/BandeauReseau";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Module 43 (21/09) — deuxième barrière, identique à celle du
  // middleware : si une page du dashboard était un jour servie sans passer
  // par lui (matcher modifié, route oubliée), un compte en attente reste
  // dehors. Seul le statut explicite "en_attente" bloque : les comptes
  // créés avant le Module 43 et les employés invités n'ont pas ce statut,
  // ils ne sont pas concernés.
  //
  // Refonte (03/10, duel A) — vers /rejoindre plutôt que directement vers
  // « candidature en cours » : une personne invitée par une équipe y
  // passe devant la liste d'attente ; sans invitation, /rejoindre la
  // renvoie vers « candidature en cours » comme avant.
  if (user.app_metadata?.acces === "en_attente") {
    redirect("/rejoindre");
  }

  const [{ data: profil }, membership] = await Promise.all([
    supabase.from("profils").select("nom, metier").eq("id", user.id).single(),
    lireMembership(supabase, user.id),
  ]);

  // Refonte (03/10, duel A) — un compte sans équipe (retiré, ou invité
  // qui n'a pas encore rejoint) n'a rien à faire ici : la base ne lui
  // montre plus rien. /rejoindre lui dit pourquoi, après avoir revérifié
  // côté serveur. Une PANNE de lecture (« erreur ») n'y envoie jamais :
  // les pages affichent leur propre « Réessayer ».
  if (membership.etat === "aucune") {
    redirect("/rejoindre");
  }
  const organisationId = membership.etat === "membre" ? membership.organisationId : null;

  // 26/09 — la pastille de « Aujourd'hui » dans la navigation : seulement
  // ce qui risque d'être oublié, c'est-à-dire les notes dont le rappel est
  // passé sans qu'elles soient faites. Un simple comptage, sans les lignes.
  const { count: nbEnRetard } = organisationId
    ? await supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", organisationId)
        .eq("statut", "active")
        .lt("rappel_a", new Date().toISOString())
    : { count: 0 };

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar nomArtisan={profil?.nom ?? user.email ?? ""} nbEnRetard={nbEnRetard ?? 0} />
      {/* Fond de l'app (06/09) — retour d'Axel : l'app "ne donne pas envie
          de l'ouvrir" comparée au site vitrine, qui lui a du relief (voir
          LandingImmersive). Un dégradé radial très discret (12% d'opacité,
          couleur de marque signal-clair, identique dans les deux thèmes
          car "signal" ne s'inverse jamais avec le mode) apporte un peu de
          la même chaleur sans jamais gêner la lisibilité du contenu, qui
          reste posé sur des cartes bg-surface opaques par-dessus. */}
      {/* pb : sur téléphone, le contenu ne passe jamais sous la barre du
          bas (voir Sidebar.tsx), zone de sécurité du téléphone comprise. */}
      {/* min-w-0 (27/09) : à côté de la barre latérale (tablette, téléphone
          en paysage), un nom de client très long faisait déborder toute la
          page de 144 px sur le côté au lieu d'être coupé par « … ». */}
      <main className="flex-1 min-w-0 min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0 bg-[radial-gradient(ellipse_1200px_700px_at_top_left,rgb(var(--c-signal-clair)/0.14),transparent_65%)]">
        <BandeauReseau />
        {children}
      </main>
      <BoutonRetour />
      <PremierLancement />
      {/* Pop-up de rappel (29/08) — montée une seule fois ici, tout en
          haut du dashboard, pour être active sur n'importe quelle page
          sans dépendre de laquelle est ouverte. Voir
          components/notes/PopupRappel.tsx pour la philosophie complète. */}
      <PopupRappel />
    </div>
  );
}
