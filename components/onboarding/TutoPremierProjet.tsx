"use client";

import { useEffect, useState, type ReactNode } from "react";

// ============================================================
// Le mini-tuto du premier lancement (03/10, demande du fondateur).
//
// Comme dans un jeu vidéo : on fait une fois, pour de faux, le geste le
// plus important — créer un projet à partir d'une demande de client — et
// on le refait ensuite tout seul. Cinq écrans, une action à chaque écran
// (c'est l'artisan qui touche, l'écran ne défile pas tout seul), rien n'est
// enregistré, « Passer » toujours visible.
//
// Joué une seule fois par appareil (clé locale). « Revoir le tuto » dans le
// Guide le relance (événement compyo:ouvrir-tuto). À la fin, l'écran
// d'installation existant (PremierLancement) prend la suite s'il y a lieu
// (événement compyo:tuto-termine).
// ============================================================

export const CLE_TUTO_VU = "compyo-tuto-premier-projet-vu";

type Etape = "intro" | "plus" | "choix" | "lecture" | "fiche" | "fin";
type Choix = "coller" | "photo" | "ecrire";

const ORDRE: Etape[] = ["intro", "plus", "choix", "lecture", "fiche", "fin"];

const MESSAGE_CLIENT =
  "Bonjour, je voudrais refaire le plafond de ma cuisine, environ 12 m². Pouvez-vous passer ? Mme Garnier, 06 12 34 56 78";

export function tutoDejaVu(): boolean {
  try {
    return window.localStorage.getItem(CLE_TUTO_VU) === "1";
  } catch {
    return true; // Stockage indisponible : on ne bloque jamais l'accès.
  }
}

export function TutoPremierProjet() {
  const [visible, setVisible] = useState(false);
  const [etape, setEtape] = useState<Etape>("intro");
  const [choix, setChoix] = useState<Choix>("coller");
  const [lu, setLu] = useState(false);

  useEffect(() => {
    if (!tutoDejaVu()) setVisible(true);
    const rouvrir = () => {
      setEtape("intro");
      setLu(false);
      setVisible(true);
    };
    window.addEventListener("compyo:ouvrir-tuto", rouvrir);
    return () => window.removeEventListener("compyo:ouvrir-tuto", rouvrir);
  }, []);

  // « Compyo lit le message » : une courte attente, puis le brouillon.
  useEffect(() => {
    if (etape !== "lecture") return;
    setLu(false);
    const t = setTimeout(() => setLu(true), 1300);
    return () => clearTimeout(t);
  }, [etape]);

  function terminer(ouvrirCapture: boolean) {
    setVisible(false);
    try {
      window.localStorage.setItem(CLE_TUTO_VU, "1");
    } catch {
      // Sans conséquence : au pire, le tuto se rejoue une fois.
    }
    window.dispatchEvent(new Event("compyo:tuto-termine"));
    // Le vrai premier projet, tout de suite : la même feuille que le [+].
    if (ouvrirCapture) setTimeout(() => window.dispatchEvent(new Event("compyo:ouvrir-capture")), 250);
  }

  if (!visible) return null;
  const rang = ORDRE.indexOf(etape);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tuto : créer un projet"
      className="fixed inset-0 z-[70] flex flex-col bg-paper sm:items-center sm:justify-center sm:bg-ink/40"
    >
      <div className="flex h-full w-full flex-col bg-paper sm:h-auto sm:max-h-[90vh] sm:max-w-sm sm:rounded-[1.6rem] sm:shadow-xl">
        {/* En-tête : la progression et « Passer » */}
        <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex gap-1.5" aria-label={`Étape ${rang + 1} sur ${ORDRE.length}`}>
            {ORDRE.map((e, i) => (
              <span key={e} className={`h-1.5 w-6 rounded-full ${i <= rang ? "bg-ink" : "bg-ink/15"}`} />
            ))}
          </div>
          {etape !== "fin" && (
            <button
              type="button"
              onClick={() => terminer(false)}
              className="min-h-12 px-2 text-base font-semibold text-steel underline decoration-ink/20 underline-offset-4"
            >
              Passer
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          {etape === "intro" && (
            <Ecran
              titre="Créons un projet ensemble."
              sousTitre="Pour de faux : rien n'est enregistré."
              action={<BoutonPlein onClick={() => setEtape("plus")}>C&apos;est parti</BoutonPlein>}
            >
              <Telephone>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-paper-warm text-2xl" aria-hidden>
                    💬
                  </span>
                  <p className="text-base font-semibold text-ink">Mme Garnier vous écrit sur WhatsApp.</p>
                  <p className="text-sm text-steel">On va en faire un projet.</p>
                </div>
              </Telephone>
            </Ecran>
          )}

          {etape === "plus" && (
            <Ecran titre="Touchez le +" sousTitre="C'est par là qu'arrive tout nouveau projet.">
              <Telephone>
                <div className="flex-1 px-4 pt-4">
                  <p className="text-xs uppercase tracking-widest text-steel">Aujourd&apos;hui</p>
                  <div className="mt-3 h-14 rounded-2xl bg-surface ring-1 ring-ink/15" />
                  <div className="mt-2 h-14 rounded-2xl bg-surface ring-1 ring-ink/15" />
                </div>
                <div className="relative flex h-16 items-center justify-around border-t border-ink/15 bg-surface">
                  <span className="h-2 w-10 rounded-full bg-ink/15" />
                  <span className="h-2 w-10 rounded-full bg-ink/15" />
                  <button
                    type="button"
                    onClick={() => setEtape("choix")}
                    aria-label="Nouveau projet"
                    className="-mt-8 grid h-16 w-16 place-items-center rounded-full border-4 border-paper bg-signal text-3xl font-semibold text-white motion-safe:animate-pulse"
                  >
                    +
                  </button>
                  <span className="h-2 w-10 rounded-full bg-ink/15" />
                  <span className="h-2 w-10 rounded-full bg-ink/15" />
                </div>
              </Telephone>
            </Ecran>
          )}

          {etape === "choix" && (
            <Ecran titre="Choisissez comment il arrive." sousTitre="Les trois mènent au même projet.">
              <Telephone>
                <div className="flex-1 bg-ink/30" />
                <div className="rounded-t-[1.4rem] bg-surface px-3 pb-3 pt-3">
                  <p className="px-1 pb-2 text-base font-semibold text-ink">Nouveau projet</p>
                  {(
                    [
                      ["coller", "Coller un message"],
                      ["photo", "Photo ou capture"],
                      ["ecrire", "Écrire moi-même"],
                    ] as const
                  ).map(([cle, libelle]) => (
                    <button
                      key={cle}
                      type="button"
                      onClick={() => {
                        setChoix(cle);
                        setEtape("lecture");
                      }}
                      className="flex min-h-14 w-full items-center justify-between border-t border-ink/10 px-2 text-left text-base font-semibold text-ink first:border-t-0 active:bg-ink/10"
                    >
                      {libelle}
                      <span aria-hidden className="text-steel">›</span>
                    </button>
                  ))}
                </div>
              </Telephone>
            </Ecran>
          )}

          {etape === "lecture" && (
            <Ecran
              titre={lu ? "Compyo a tout rangé." : "Compyo lit la demande…"}
              sousTitre={lu ? "Vous vérifiez, puis vous créez." : "Vous, vous continuez votre chantier."}
              action={lu ? <BoutonPlein onClick={() => setEtape("fiche")}>Créer le projet</BoutonPlein> : undefined}
            >
              <Telephone>
                <div className="flex-1 space-y-3 px-4 pt-4">
                  {choix === "photo" ? (
                    <div className="rounded-2xl bg-paper-warm p-3">
                      <p className="text-xs text-steel">Capture d&apos;écran</p>
                      <p className="mt-1 text-sm text-ink">{MESSAGE_CLIENT}</p>
                    </div>
                  ) : choix === "ecrire" ? (
                    <div className="rounded-2xl bg-paper-warm p-3">
                      <p className="text-xs text-steel">Vous avez écrit (ou dicté)</p>
                      <p className="mt-1 text-sm text-ink">Garnier, plafond cuisine 12 m², 06 12 34 56 78</p>
                    </div>
                  ) : (
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-succes/15 p-3">
                      <p className="text-sm text-ink">{MESSAGE_CLIENT}</p>
                    </div>
                  )}
                  {lu ? (
                    <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/15">
                      <Champ nom="Client" valeur="Mme Garnier" />
                      <Champ nom="Téléphone" valeur="06 12 34 56 78" />
                      <Champ nom="Travaux" valeur="Plafond de cuisine, 12 m²" />
                    </div>
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="h-10 rounded-xl bg-ink/10 motion-safe:animate-pulse" />
                      <div className="h-10 rounded-xl bg-ink/10 motion-safe:animate-pulse" />
                      <div className="h-10 rounded-xl bg-ink/10 motion-safe:animate-pulse" />
                    </div>
                  )}
                </div>
              </Telephone>
            </Ecran>
          )}

          {etape === "fiche" && (
            <Ecran titre="Le projet est créé." sousTitre="Rassurez le client en un geste.">
              <Telephone>
                <div className="flex-1 px-4 pt-4">
                  <p className="font-display text-2xl font-semibold text-ink">Mme Garnier</p>
                  <p className="text-sm text-steel">Plafond de cuisine, 12 m²</p>
                  <div className="mt-4 rounded-2xl bg-anthracite p-4 text-paper">
                    <p className="text-xs uppercase tracking-widest text-paper/70">Maintenant</p>
                    <p className="mt-1 text-base font-semibold">Nouvelle demande.</p>
                    <button
                      type="button"
                      onClick={() => setEtape("fin")}
                      className="mt-3 min-h-12 w-full rounded-2xl bg-paper px-4 text-base font-semibold text-ink motion-safe:animate-pulse"
                    >
                      Répondre : bien reçu
                    </button>
                  </div>
                </div>
              </Telephone>
            </Ecran>
          )}

          {etape === "fin" && (
            <Ecran
              titre="Bravo, c'est tout."
              sousTitre="Le message part de votre téléphone : c'est vous qui envoyez."
              action={
                <div className="flex w-full flex-col gap-2">
                  <BoutonPlein onClick={() => terminer(true)}>À moi : mon premier projet</BoutonPlein>
                  <button
                    type="button"
                    onClick={() => terminer(false)}
                    className="min-h-12 w-full text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
                  >
                    Plus tard
                  </button>
                </div>
              }
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-succes/10 text-3xl text-succes" aria-hidden>
                  ✓
                </span>
                <ul className="space-y-2 text-base text-ink">
                  <li>1. Touchez +</li>
                  <li>2. Choisissez comment ça arrive</li>
                  <li>3. Vérifiez, créez, répondez</li>
                </ul>
              </div>
            </Ecran>
          )}
        </div>
      </div>
    </div>
  );
}

function Ecran({
  titre,
  sousTitre,
  action,
  children,
}: {
  titre: string;
  sousTitre: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="font-display text-3xl font-semibold leading-tight text-ink">{titre}</h2>
      <p className="mt-1 text-base text-steel">{sousTitre}</p>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Un faux téléphone, pour qu'on comprenne que c'est une démonstration. */
function Telephone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[320px] w-full max-w-[300px] flex-1 flex-col overflow-hidden rounded-[1.6rem] bg-paper ring-2 ring-ink/15">
      {children}
    </div>
  );
}

function Champ({ nom, valeur }: { nom: string; valeur: string }) {
  return (
    <p className="flex min-h-10 items-center justify-between gap-3 border-t border-ink/10 text-sm first:border-t-0">
      <span className="text-steel">{nom}</span>
      <span className="truncate font-semibold text-ink">{valeur}</span>
    </p>
  );
}

function BoutonPlein({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      {children}
    </button>
  );
}
