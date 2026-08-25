import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Interroge le flag "maintenance_actif" (Module 23, supabase/schema.sql) via
// un fetch direct au REST de Supabase (clé service_role) plutôt que
// createAdminClient() : plus léger dans le runtime Edge du middleware, et ça
// évite d'importer ici @supabase/supabase-js (sa dépendance realtime-js tire
// du code Node incompatible avec l'Edge Runtime). "no-store" systématique :
// un cache rendrait le bouton on/off inefficace pendant plusieurs minutes.
async function estEnMaintenance(): Promise<boolean> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/parametres_systeme?cle=eq.maintenance_actif&select=valeur`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const lignes: { valeur: boolean }[] = await res.json();
    return Boolean(lignes[0]?.valeur);
  } catch {
    // Si Supabase est injoignable, on n'ajoute pas une deuxième panne
    // par-dessus la première : le site continue de répondre normalement.
    return false;
  }
}

// Redirige vers /login toute tentative d'accès à /dashboard sans session
// active, ET sert l'écran de maintenance (app/maintenance/page.tsx) à tout
// le monde sauf l'admin quand Axel l'a activé (voir /admin/maintenance).
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const pathname = request.nextUrl.pathname;
  const besoinSession = pathname.startsWith("/dashboard");
  // Jamais de bascule sur la page de maintenance elle-même : sinon elle se
  // réécrirait indéfiniment sur elle-même.
  const maintenancePossible = pathname !== "/maintenance";

  let userEmail: string | null = null;

  if (maintenancePossible || besoinSession) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    // La maintenance a priorité sur la redirection /login habituelle : un
    // visiteur non connecté qui arrive sur /dashboard pendant la
    // maintenance doit voir l'écran de maintenance, pas /login.
    if (maintenancePossible && userEmail !== process.env.ADMIN_EMAIL && (await estEnMaintenance())) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url);
    }

    if (!user && besoinSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Le matcher couvrait uniquement /dashboard/:path* avant l'écran de
  // maintenance (Module 23) — élargi à tout le site (pages marketing
  // incluses), sauf les assets statiques Next, favicon, les routes /api/*
  // (l'API continue de répondre normalement — seule la navigation par page
  // est concernée) et tout chemin qui ressemble à un fichier (contient un
  // point, ex: /logo.svg, /robots.txt).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
