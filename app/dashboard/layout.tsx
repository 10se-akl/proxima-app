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
      <main className="flex-1 min-h-screen">{children}</main>
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
