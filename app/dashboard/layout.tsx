import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";

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
    </div>
  );
}
