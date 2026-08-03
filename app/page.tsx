import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Un artisan déjà connecté qui revient sur le lien du site n'a plus besoin
  // de revoir la page marketing : il est envoyé directement sur son espace.
  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
