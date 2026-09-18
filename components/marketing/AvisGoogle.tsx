import { CarrouselAvis, type AvisAffiche } from "./CarrouselAvis";

// ============================================================
// Avis Google, en direct (18/09).
//
// Les avis ne sont JAMAIS recopiés à la main : ils sont lus chez Google
// (API Places), avec la note et le nombre d'avis réels, et affichés tels
// que Google les renvoie — ni triés, ni retouchés. Impossible, donc,
// d'afficher un avis qui n'existe pas : c'est la seule façon honnête de
// présenter des avis sur un produit qui se vend sur la confiance.
//
// Mise en service (voir .env.example) :
//   GOOGLE_PLACE_ID       identifiant de la fiche d'établissement Google
//   GOOGLE_PLACES_API_KEY clé de l'API Places (côté serveur uniquement)
//
// - Sans GOOGLE_PLACE_ID : la section n'apparaît pas (pas de fiche, pas
//   d'avis possibles).
// - Avec l'identifiant seul (ou si Google ne répond pas) : on affiche quand
//   même les deux boutons qui mènent chez Google — voir les avis, en
//   laisser un. C'est le plus important.
// - Avec la clé en plus : la note, le nombre d'avis et les derniers avis.
//
// Les réponses de Google sont gardées 12 h en cache : une visite de la
// page ne coûte presque jamais d'appel à l'API.
// ============================================================

type ReponsePlaces = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

async function lireFiche(placeId: string, cle: string): Promise<ReponsePlaces | null> {
  try {
    const reponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
      {
        headers: {
          "X-Goog-Api-Key": cle,
          "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
        },
        next: { revalidate: 43200 },
      }
    );
    if (!reponse.ok) {
      console.error("Avis Google : l'API Places a répondu", reponse.status);
      return null;
    }
    return (await reponse.json()) as ReponsePlaces;
  } catch (e) {
    console.error("Avis Google : API Places injoignable", e);
    return null;
  }
}

export async function SectionAvisGoogle() {
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!placeId) return null;

  const cle = process.env.GOOGLE_PLACES_API_KEY;
  const fiche = cle ? await lireFiche(placeId, cle) : null;

  const urlFiche = fiche?.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  const urlAvis = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

  const avis: AvisAffiche[] = (fiche?.reviews ?? [])
    .map((r) => ({
      auteur: r.authorAttribution?.displayName ?? "Utilisateur Google",
      urlAuteur: r.authorAttribution?.uri ?? null,
      photo: r.authorAttribution?.photoUri ?? null,
      note: Math.max(0, Math.min(5, Math.round(r.rating ?? 0))),
      quand: r.relativePublishTimeDescription ?? "",
      texte: (r.text?.text ?? r.originalText?.text ?? "").trim(),
    }))
    .filter((a) => a.texte.length > 0);

  return (
    <VueAvisGoogle
      note={fiche?.rating}
      nombre={fiche?.userRatingCount}
      avis={avis}
      urlFiche={urlFiche}
      urlAvis={urlAvis}
    />
  );
}

// L'affichage seul, séparé de la lecture chez Google.
export function VueAvisGoogle({
  note,
  nombre,
  avis,
  urlFiche,
  urlAvis,
}: {
  note?: number;
  nombre?: number;
  avis: AvisAffiche[];
  urlFiche: string;
  urlAvis: string;
}) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="titre-avis">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#C96B4A]">Avis Google</p>
          <h2 id="titre-avis" className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#F5F1EA] sm:text-5xl">
            {note && nombre ? "Ce que les artisans en disent." : "Vous utilisez Compyo ? Dites-le."}
          </h2>

          {note && nombre ? (
            <div className="mt-8 flex items-center gap-4 rounded-full border border-white/10 bg-[#241C16]/80 py-2.5 pl-3 pr-5">
              <LogoGoogle />
              <span className="font-display text-3xl font-bold tabular-nums text-[#F5F1EA]">
                {note.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <Etoiles note={note} taille="h-5 w-5" />
              <span className="text-sm text-[#C9C0B4]">
                {nombre} avis
              </span>
            </div>
          ) : (
            <p className="mt-4 max-w-md text-[#C9C0B4]">
              Un avis sur Google aide un autre artisan à passer moins de soirées sur ses devis.
            </p>
          )}
        </div>
      </div>

      {avis.length > 0 && <CarrouselAvis avis={avis} />}

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-center gap-3 px-6 sm:flex-row">
        <a
          href={urlAvis}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#C96B4A] px-7 py-3.5 font-medium text-white shadow-sm shadow-[#C96B4A]/30 transition-all hover:scale-[1.03] hover:bg-[#B85F40] active:scale-[0.97]"
        >
          <IconeEtoile className="h-4 w-4" />
          Laisser un avis sur Google
        </a>
        <a
          href={urlFiche}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E8DCCB]/25 px-7 py-3.5 font-medium text-[#E8DCCB] transition-all hover:scale-[1.03] hover:border-[#E8DCCB]/45 active:scale-[0.97]"
        >
          {note && nombre ? `Lire les ${nombre} avis` : "Voir notre fiche Google"}
        </a>
      </div>
      <p className="mt-4 text-center text-xs text-[#C9C0B4]/50">
        Avis publiés sur Google — nous ne pouvons ni les modifier, ni les choisir.
      </p>
    </section>
  );
}

export function Etoiles({ note, taille = "h-4 w-4" }: { note: number; taille?: string }) {
  const pleines = Math.round(note);
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${note.toLocaleString("fr-FR")} étoiles sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <IconeEtoile key={i} className={`${taille} ${i < pleines ? "text-[#E8B23D]" : "text-white/15"}`} />
      ))}
    </span>
  );
}

export function IconeEtoile({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5l1.11-6.47-4.7-4.58 6.5-.95L12 2.6z" />
    </svg>
  );
}

function LogoGoogle() {
  // Le « G » de Google, à ses couleurs : les règles d'affichage des avis
  // Google demandent que la source soit clairement attribuée.
  return (
    <svg viewBox="0 0 48 48" className="h-7 w-7" aria-label="Google" role="img">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
