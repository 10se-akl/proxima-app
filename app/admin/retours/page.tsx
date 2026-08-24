import { redirect } from "next/navigation";

// Cette page listait le détail nominatif des retours produit séparément de
// la carte mentale (voir Module 15/16, supabase/schema.sql). Audit Cycle 2
// (Agent Product Manager) : deux vues admin distinctes pour la même donnée
// forçaient Axel à vérifier deux endroits — le panneau nominatif est
// désormais intégré directement dans /carte-mentale (clic sur une bulle,
// visible seulement si estAdmin). Redirection conservée (plutôt qu'une
// suppression) pour ne pas casser un ancien lien ou favori.
export default function AdminRetoursPage() {
  redirect("/carte-mentale");
}
