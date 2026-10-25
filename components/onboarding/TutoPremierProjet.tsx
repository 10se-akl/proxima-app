"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { IconeCoche, IconeMessage, IconePlus } from "@/components/projet/icones";
import { BOUTON_CREUX_LARGE, BOUTON_PLEIN_LARGE, BOUTON_TEXTE, TITRE_ECRAN } from "@/components/ui/recettes";

// ============================================================
// Le mini-tuto du premier lancement (03/10, demande du fondateur).
//
// 13/10 — sur ordinateur, la démonstration montre l'ordinateur (la barre
// de gauche et « Nouveau projet », la feuille au milieu) au lieu d'un
// téléphone : avant, un artisan sur PC apprenait à toucher un « + » qu'il
// n'avait pas.
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
//
// Design v3 (24/10) : plus rien ne pulse en boucle — ce qu'il faut toucher
// porte un anneau fixe ; le + et « Nouveau projet » en bleu-nuit comme les
// vrais ; plus de capitales espacées ; cartes surface + ombre douce ; la
// carte « Maintenant » sur la nuit, comme à l'accueil.
//
// Design v3 (25/10) : le tuto porte lui-même data-da="atelier" (les jetons
// et la police Inter de l'application, app/globals.css) : c'est le premier
// écran vu après l'inscription, il ne doit jamais retomber sur le thème du
// site (Manrope, fond plus clair, encre ardoise), même hors du tableau de
// bord (banc d'aperçu). « Plus tard » en BOUTON_CREUX_LARGE ; le faux
// « Nouveau projet » en pilule à l'encre, comme le vrai (BOUTON_PLEIN).
// ============================================================

/** L'anneau qui montre où toucher (fixe, sans pulsation). */
const CIBLE = "ring-2 ring-offset-2";

export const CLE_TUTO_VU = "compyo-tuto-premier-projet-vu";

type Etape = "intro" | "plus" | "choix" | "lecture" | "fiche" | "fin";
type Choix = "coller" | "photo" | "ecrire";

const ORDRE: Etape[] = ["intro", "plus", "choix", "lecture", "fiche", "fin"];

const MESSAGE_CLIENT =
  "Bonjour, je voudrais refaire le plafond de ma cuisine, environ 12 m². Pouvez-vous passer ? Mme Garnier, 06 12 34 56 78";

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
  const grand = useGrandEcran();

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
    window.dispatchEvent(new CustomEvent("compyo:tuto-termine", { detail: { capture: ouvrirCapture } }));
    // Le vrai premier projet, tout de suite : la même feuille que le [+].
    if (ouvrirCapture) setTimeout(() => window.dispatchEvent(new Event("compyo:ouvrir-capture")), 250);
  }

  if (!visible) return null;
  const rang = ORDRE.indexOf(etape);
  // Sur ordinateur, la démonstration montre l'ordinateur : la barre de
  // gauche et son bouton « Nouveau projet », la feuille au milieu de
  // l'écran. Sur téléphone, le téléphone et son « + ».
  const Maquette = grand ? Fenetre : Telephone;

  return (
    <div
      data-da="atelier"
      role="dialog"
      aria-modal="true"
      aria-label="Tuto : créer un projet"
      className="fixed inset-0 z-[70] flex flex-col bg-paper sm:items-center sm:justify-center sm:bg-black/40 sm:p-6 sm:dark:bg-black/60"
    >
      <div className="flex h-full w-full flex-col bg-paper sm:h-auto sm:max-h-[92vh] sm:max-w-xl ombre-feuille sm:rounded-[28px] md:max-w-4xl">
        {/* En-tête : la progression et « Passer » */}
        <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-8 sm:pt-6">
          <div className="flex gap-1.5" aria-label={`Étape ${rang + 1} sur ${ORDRE.length}`}>
            {ORDRE.map((e, i) => (
              <span key={e} className={`h-1.5 w-6 rounded-full ${i <= rang ? "bg-ink" : "bg-gris-clair"}`} />
            ))}
          </div>
          {etape !== "fin" && (
            <button
              type="button"
              onClick={() => terminer(false)}
              className={`-mr-3 ${BOUTON_TEXTE}`}
            >
              Passer
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-8 sm:pb-8 md:min-h-[24rem] md:justify-center">
          {etape === "intro" && (
            <Ecran
              titre="Créons un projet ensemble."
              sousTitre={"Pour de faux : rien n'est enregistré."}
              action={<BoutonPlein onClick={() => setEtape("plus")}>C&apos;est parti</BoutonPlein>}
            >
              <Maquette>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-paper-warm text-ink" aria-hidden>
                    <IconeMessage className="h-7 w-7" />
                  </span>
                  <p className="text-base font-semibold text-ink">Mme Garnier vous écrit sur WhatsApp.</p>
                  <p className="text-sm text-steel">On va en faire un projet.</p>
                </div>
              </Maquette>
            </Ecran>
          )}

          {etape === "plus" &&
            (grand ? (
              <Ecran titre="Cliquez sur « Nouveau projet »." sousTitre={"En haut à gauche : c'est par là qu'arrive tout nouveau projet."}>
                <Fenetre
                  bouton={
                    <button
                      type="button"
                      onClick={() => setEtape("choix")}
                      className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-xs font-semibold text-paper ring-signal ring-offset-surface ${CIBLE}`}
                    >
                      <IconePlus className="h-3.5 w-3.5" /> Nouveau projet
                    </button>
                  }
                >
                  <div className="flex-1 px-4 pt-4">
                    <p className="text-sm font-bold text-ink">Aujourd&apos;hui</p>
                    <div className="mt-3 h-10 rounded-[14px] bg-surface ombre-douce" />
                    <div className="mt-2 h-10 rounded-[14px] bg-surface ombre-douce" />
                  </div>
                </Fenetre>
              </Ecran>
            ) : (
              <Ecran titre="Touchez le +" sousTitre="C'est par là qu'arrive tout nouveau projet.">
                <Telephone>
                  <div className="flex-1 px-4 pt-4">
                    <p className="text-base font-bold text-ink">Aujourd&apos;hui</p>
                    <div className="mt-3 h-14 rounded-[16px] bg-surface ombre-douce" />
                    <div className="mt-2 h-14 rounded-[16px] bg-surface ombre-douce" />
                  </div>
                  <div className="relative flex h-16 items-center justify-around border-t border-gris-clair bg-surface">
                    <span className="h-2 w-10 rounded-full bg-gris-clair" />
                    <span className="h-2 w-10 rounded-full bg-gris-clair" />
                    <button
                      type="button"
                      onClick={() => setEtape("choix")}
                      aria-label="Nouveau projet"
                      // Le même « + » que la vraie barre du bas (Sidebar.tsx).
                      className={`-mt-4 grid h-14 w-14 place-items-center rounded-full bg-nuit text-white dark:bg-ink dark:text-paper ring-signal ring-offset-surface ${CIBLE}`}
                    >
                      <IconePlus className="h-7 w-7" />
                    </button>
                    <span className="h-2 w-10 rounded-full bg-gris-clair" />
                    <span className="h-2 w-10 rounded-full bg-gris-clair" />
                  </div>
                </Telephone>
              </Ecran>
            ))}

          {etape === "choix" && (
            <Ecran titre="Choisissez comment il arrive." sousTitre="Les trois mènent au même projet.">
              <Maquette>
                <div className={`flex flex-1 flex-col bg-black/40 ${grand ? "items-center justify-center p-4" : ""}`}>
                  {!grand && <div className="flex-1" />}
                  <div className={`bg-paper px-3 pb-3 pt-3 ombre-feuille ${grand ? "w-full max-w-[17rem] rounded-[20px]" : "rounded-t-[20px]"}`}>
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
                        className={`mt-1.5 flex w-full items-center justify-between rounded-[14px] bg-surface px-3 text-left font-semibold text-ink ombre-douce first:mt-0 active:bg-paper-warm sm:hover:bg-paper-warm/60 motion-safe:transition-colors ${grand ? "min-h-11 text-sm" : "min-h-14 text-base"}`}
                      >
                        {libelle}
                        <span aria-hidden className="text-steel">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              </Maquette>
            </Ecran>
          )}

          {etape === "lecture" && (
            <Ecran
              titre={lu ? "Compyo a tout rangé." : "Compyo lit la demande…"}
              sousTitre={lu ? "Vous vérifiez, puis vous créez." : "Vous, vous continuez votre chantier."}
              action={lu ? <BoutonPlein onClick={() => setEtape("fiche")}>Créer le projet</BoutonPlein> : undefined}
            >
              <Maquette>
                <div className="flex-1 space-y-3 px-4 pt-4">
                  {choix === "photo" ? (
                    <div className="rounded-[16px] bg-paper-warm p-3">
                      <p className="text-xs text-steel">Capture d&apos;écran</p>
                      <p className="mt-1 text-sm text-ink">{MESSAGE_CLIENT}</p>
                    </div>
                  ) : choix === "ecrire" ? (
                    <div className="rounded-[16px] bg-paper-warm p-3">
                      <p className="text-xs text-steel">Vous avez écrit (ou dicté)</p>
                      <p className="mt-1 text-sm text-ink">Garnier, plafond cuisine 12&nbsp;m², 06&nbsp;12&nbsp;34&nbsp;56&nbsp;78</p>
                    </div>
                  ) : (
                    <div className="ml-auto max-w-[85%] rounded-[16px] rounded-tr-sm bg-succes-fond p-3">
                      <p className="text-sm text-ink">{MESSAGE_CLIENT}</p>
                    </div>
                  )}
                  {lu ? (
                    <div className="rounded-[16px] bg-surface px-3 py-1 ombre-douce">
                      <Champ nom="Client" valeur="Mme Garnier" />
                      <Champ nom="Téléphone" valeur={"06 12 34 56 78"} />
                      <Champ nom="Travaux" valeur={"Plafond de cuisine, 12 m²"} />
                    </div>
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="h-10 rounded-[14px] bg-paper-warm" />
                      <div className="h-10 rounded-[14px] bg-paper-warm" />
                      <div className="h-10 rounded-[14px] bg-paper-warm" />
                    </div>
                  )}
                </div>
              </Maquette>
            </Ecran>
          )}

          {etape === "fiche" && (
            <Ecran titre="Le projet est créé." sousTitre="Rassurez le client en un geste.">
              <Maquette>
                <div className="flex-1 px-4 pt-4">
                  <p className="font-display text-2xl font-semibold text-ink">Mme Garnier</p>
                  <p className="text-sm text-steel">Plafond de cuisine, 12&nbsp;m²</p>
                  <div className="mt-4 rounded-[24px] bg-nuit p-4 text-white">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-signal-clair">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-signal" />
                      Maintenant
                    </p>
                    <p className="mt-1 text-base font-semibold">Nouvelle demande.</p>
                    <button
                      type="button"
                      onClick={() => setEtape("fin")}
                      className={`mt-3 min-h-12 w-full rounded-full bg-signal px-4 text-base font-semibold text-white ring-white ring-offset-nuit ${CIBLE}`}
                    >
                      Répondre&nbsp;: bien reçu
                    </button>
                  </div>
                </div>
              </Maquette>
            </Ecran>
          )}

          {etape === "fin" && (
            <Ecran
              titre="Bravo, c'est tout."
              sousTitre={"Le message part par vos SMS ou votre WhatsApp : c'est vous qui envoyez."}
              action={
                <div className="flex w-full flex-col gap-2">
                  <BoutonPlein onClick={() => terminer(true)}>À moi&nbsp;: mon premier projet</BoutonPlein>
                  <button type="button" onClick={() => terminer(false)} className={BOUTON_CREUX_LARGE}>
                    Plus tard
                  </button>
                </div>
              }
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-succes-fond text-succes" aria-hidden>
                  <IconeCoche className="h-8 w-8" />
                </span>
                <ul className="space-y-2 text-base text-ink">
                  <li>{grand ? "1. Cliquez sur « Nouveau projet »" : "1. Touchez +"}</li>
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

/** Ordinateur à partir de 640 px : la même limite que la barre latérale
 *  (components/dashboard/Sidebar.tsx). */
function useGrandEcran(): boolean {
  const [grand, setGrand] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const maj = () => setGrand(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);
  return grand;
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
  // Téléphone : le titre, l'image, puis le bouton sous le pouce.
  // Ordinateur (à partir de 768 px) : le texte et le bouton à gauche,
  // l'image à droite.
  return (
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-10">
      <div>
        <h2 className={`${TITRE_ECRAN} [text-wrap:balance]`}>{titre}</h2>
        <p className="mt-1 text-base text-steel [text-wrap:pretty]">{sousTitre}</p>
        {action && <div className="mt-8 hidden md:block">{action}</div>}
      </div>
      <div className="mt-5 flex flex-1 flex-col md:mt-0">{children}</div>
      {action && <div className="mt-5 md:hidden">{action}</div>}
    </div>
  );
}

/** Un faux téléphone, pour qu'on comprenne que c'est une démonstration. */
function Telephone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[320px] w-full max-w-[300px] flex-1 flex-col overflow-hidden rounded-[28px] bg-paper ring-2 ring-gris-clair">
      {children}
    </div>
  );
}

/** Une fausse fenêtre de Compyo sur ordinateur : la barre de gauche, claire
 *  à filet comme la vraie (Design v3), et la page à droite. `bouton` prend la place de
 *  « Nouveau projet » quand c'est lui qu'il faut toucher. */
function Fenetre({ children, bouton }: { children: ReactNode; bouton?: ReactNode }) {
  return (
    <div className="flex min-h-[300px] w-full flex-1 overflow-hidden rounded-[20px] bg-paper ring-2 ring-gris-clair md:aspect-[16/11] md:min-h-0 md:flex-none">
      <div className="flex w-[34%] max-w-[11rem] shrink-0 flex-col gap-2 border-r border-gris-clair bg-surface p-3" aria-hidden={bouton ? undefined : true}>
        <div className="flex items-center gap-1.5 pb-1">
          <span aria-hidden>
            <CompyoMark variante="couleur" taille={14} />
          </span>
          <span className="text-xs font-semibold text-ink">Compyo</span>
        </div>
        {bouton ?? (
          <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ink text-xs font-semibold text-paper">
            <IconePlus className="h-3.5 w-3.5" /> Nouveau projet
          </span>
        )}
        {["Aujourd'hui", "Projets", "Planning", "Argent"].map((l) => (
          <span key={l} className="px-1 text-xs text-steel">
            {l}
          </span>
        ))}
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function Champ({ nom, valeur }: { nom: string; valeur: string }) {
  return (
    <p className="flex min-h-10 items-center justify-between gap-3 border-t border-gris-clair text-sm first:border-t-0">
      <span className="text-steel">{nom}</span>
      <span className="min-w-0 break-words text-right font-semibold text-ink">{valeur}</span>
    </p>
  );
}

function BoutonPlein({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={BOUTON_PLEIN_LARGE}>
      {children}
    </button>
  );
}
