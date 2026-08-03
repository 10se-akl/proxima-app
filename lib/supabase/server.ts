import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// À utiliser dans les Server Components et les Route Handlers (app/api/*).
// Ne jamais importer ce fichier dans un composant "use client".
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Appelé depuis un Server Component (page.tsx, layout.tsx) plutôt
            // qu'une Route Handler ou une Server Action : Next.js interdit
            // d'y modifier les cookies. Sans danger à ignorer ici, car le
            // middleware (middleware.ts) se charge déjà de rafraîchir la
            // session à chaque requête.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Même raison que ci-dessus.
          }
        },
      },
    }
  );
}
