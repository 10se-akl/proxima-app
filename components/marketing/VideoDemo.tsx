"use client";

import { useEffect, useId, useRef } from "react";

// ============================================================
// Lecteur de la vidéo de démonstration (18/09).
//
// - Muette, en boucle, et lancée seulement quand elle est à l'écran :
//   rien n'est téléchargé tant que le visiteur n'est pas descendu jusque-là
//   (6 Mo épargnés à qui repart avant), et elle se met en pause quand il
//   remonte.
// - Jamais de lecture automatique pour qui a demandé à réduire les
//   animations : l'affiche reste, les contrôles permettent de la lancer.
// - Une pause décidée par le visiteur est respectée : on ne relance plus
//   la vidéo à sa place.
//
// La vidéo est produite par rendu-video-demo.py (dossier compyo/), seule
// source de la démo : on ne la redessine plus en React.
// ============================================================
export function VideoDemo({
  src,
  affiche,
  description,
}: {
  src: string;
  affiche: string;
  description: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // L'accueil monte deux lecteurs (paysage, et vertical sur téléphone) :
  // un identifiant fixe serait dupliqué.
  const idDescription = useId();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pauseParLeVisiteur = false;
    let pauseAutomatique = false;

    const surPause = () => {
      if (!pauseAutomatique) pauseParLeVisiteur = true;
      pauseAutomatique = false;
    };
    const surLecture = () => {
      pauseParLeVisiteur = false;
    };
    video.addEventListener("pause", surPause);
    video.addEventListener("play", surLecture);

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          if (!pauseParLeVisiteur && video.paused) {
            // Refusée par certains navigateurs économes (mode batterie) :
            // l'affiche et les contrôles restent, rien d'autre à faire.
            video.play().catch(() => {});
          }
        } else if (!video.paused) {
          pauseAutomatique = true;
          video.pause();
        }
      },
      { threshold: 0.35 }
    );
    observateur.observe(video);

    return () => {
      observateur.disconnect();
      video.removeEventListener("pause", surPause);
      video.removeEventListener("play", surLecture);
    };
  }, []);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={affiche}
        muted
        loop
        playsInline
        controls
        preload="none"
        aria-describedby={idDescription}
        className="h-full w-full object-cover"
      />
      <p id={idDescription} className="sr-only">
        {description}
      </p>
    </>
  );
}
