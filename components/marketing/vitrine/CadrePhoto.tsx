import Image from "next/image";
import type { Photo } from "./photos";

// ============================================================
// Une photo de la vitrine, dans son cadre (24/09) — voir photos.ts.
//
// Le voile est ce qui permet de remplacer un visuel CSS par une photo sans
// toucher à la mise en page : le texte posé dessus reste lisible, en clair
// comme en sombre, quelle que soit la photo.
// ============================================================

const VOILES = {
  // Le texte du hero est à gauche : on éclaircit (ou assombrit) ce côté.
  hero: "bg-gradient-to-r from-paper via-paper/80 to-paper/10 lg:via-paper/55",
  // Le nom du métier est en bas de la carte.
  carte: "bg-gradient-to-t from-black/70 via-black/15 to-transparent",
  // La soirée : le texte est centré, sur un fond sombre.
  soiree: "bg-gradient-to-b from-black/55 via-black/40 to-black/75",
} as const;

export function CadrePhoto({
  photo,
  className = "",
  voile,
  priorite = false,
  sizes = "100vw",
}: {
  photo: Photo;
  className?: string;
  voile?: keyof typeof VOILES;
  priorite?: boolean;
  sizes?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        priority={priorite}
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: photo.position ?? "center" }}
      />
      {voile && <div aria-hidden className={`absolute inset-0 ${VOILES[voile]}`} />}
    </div>
  );
}
