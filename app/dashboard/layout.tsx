import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BoutonRetour } from "@/components/dashboard/BoutonRetour";
import { PremierLancement } from "@/components/onboarding/PremierLancement";
import { PopupRappel } from "@/components/notes/PopupRappel";

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

  const { data: profil } = await supabase
    .from("profils")
    .select("nom, metier")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar nomArtisan={profil?.nom ?? user.email ?? ""} />
      {/* Fond de l'app (06/09) — retour d'Axel : l'app "ne donne pas envie
          de l'ouvrir" comparée au site vitrine, qui lui a du relief (voir
          LandingImmersive). Un dégradé radial très discret (12% d'opacité,
          couleur de marque signal-clair, identique dans les deux thèmes
          car "signal" ne s'inverse jamais avec le mode) apporte un peu de
          la même chaleur sans jamais gêner la lisibilité du contenu, qui
          reste posé sur des cartes bg-surface opaques par-dessus. */}
      <main className="flex-1 min-h-screen bg-[radial-gradient(ellipse_1200px_700px_at_top_left,rgb(var(--c-signal-clair)/0.14),transparent_65%)]">
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
