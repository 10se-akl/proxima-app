import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavigationAdmin } from "@/components/admin/NavigationAdmin";

// Toutes les pages /admin (22/09) : la navigation entre elles, et une
// vérification d'accès au niveau du dossier. Chaque page garde la sienne —
// deux contrôles valent mieux qu'un, et une page ajoutée demain sans
// vérification resterait quand même fermée.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/login");

  return (
    <div className="min-h-screen bg-paper">
      <NavigationAdmin />
      {children}
    </div>
  );
}
