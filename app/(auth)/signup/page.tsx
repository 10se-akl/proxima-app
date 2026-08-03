import { redirect } from "next/navigation";

// Cette page a existé avant la mise en place de la bêta privée sur
// candidature (voir /demander-acces + /admin/candidatures) : elle
// permettait de créer un compte librement, sans validation, ce qui
// contournait complètement le système d'acceptation manuelle. Tant qu'elle
// restait accessible (et liée depuis /login), n'importe quel visiteur
// pouvait obtenir un accès à Compyo sans jamais passer par une
// candidature ni un accord — l'inverse de ce que la bêta privée doit
// garantir. On redirige donc vers le vrai point d'entrée.
export default function SignupPage() {
  redirect("/demander-acces");
}
