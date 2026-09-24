"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "../Journee";
import { Carte, Coche, Etiquette } from "./outils";

// ============================================================
// 15:10 — la cliente signe, sur son téléphone.
//
// À gauche, ce qu'elle voit : la page publique du devis (celle que Compyo
// envoie), avec la zone de signature. À droite, ce que voit l'artisan :
// le devis relu avant l'envoi (mentions, TVA, validité, assurance),
// envoyé, ouvert, signé — puis l'acompte, que l'artisan facture depuis le
// devis signé (l'app ne crée pas la facture toute seule : il décide).
//
// Le visiteur peut signer lui-même, au doigt ou à la souris : c'est le
// geste le plus parlant de la page. Pour qui ne peut pas tracer (clavier,
// lecteur d'écran), le bouton « Signer » suffit.
// ============================================================

const SIGNATURE_AUTO =
  "M14 50C20 26 34 14 32 36S22 64 42 52 58 24 64 38 70 58 84 44 96 30 102 44 110 60 126 42 140 24 148 42 158 58 172 36M150 60C162 57 180 55 196 51";

type Etape = { titre: string; court: string; detail: string; heure: string };

const ETAPES: Etape[] = [
  { titre: "Relu par Compyo", court: "Relu", detail: "Mentions obligatoires, TVA 10 %, validité 30 jours, assurance", heure: "13:58" },
  { titre: "Envoyé à Mme Garnier", court: "Envoyé", detail: "Un lien pour lire et signer", heure: "14:02" },
  { titre: "Ouvert", court: "Ouvert", detail: "Sur son téléphone", heure: "14:40" },
  { titre: "Signé", court: "Signé", detail: "Signature électronique, horodatée", heure: "15:12" },
  { titre: "Acompte à facturer", court: "Acompte", detail: "Depuis le devis signé, en un geste · 30 % = 116,16 €", heure: "15:12" },
];

type Point = [number, number];

export function SceneSignature() {
  const { ref, tour, reduit } = useScene<HTMLDivElement>();
  // Étapes cochées côté artisan (0 → 5).
  const [faites, setFaites] = useState(5);
  // "auto" : la signature se dessine toute seule ; "visiteur" : c'est à
  // lui ; "signe" : terminé.
  const [mode, setMode] = useState<"attente" | "auto" | "visiteur" | "signe">("signe");
  const [traits, setTraits] = useState<Point[][]>([]);
  const [parVisiteur, setParVisiteur] = useState(false);
  const trace = useRef<Point[] | null>(null);
  const zone = useRef<SVGSVGElement>(null);
  const minuteurs = useRef<number[]>([]);

  const vider = () => {
    minuteurs.current.forEach(window.clearTimeout);
    minuteurs.current = [];
  };
  const plus_tard = (ms: number, f: () => void) => {
    minuteurs.current.push(window.setTimeout(f, ms));
  };

  // La scène joue : trois étapes, la signature qui se trace, puis la fin.
  useEffect(() => {
    if (tour === 0) return;
    vider();
    setTraits([]);
    setParVisiteur(false);
    if (reduit) {
      setFaites(5);
      setMode("signe");
      return;
    }
    setFaites(0);
    setMode("attente");
    plus_tard(500, () => setFaites(1));
    plus_tard(1100, () => setFaites(2));
    plus_tard(1700, () => setFaites(3));
    plus_tard(2300, () => setMode("auto"));
    plus_tard(4600, () => {
      setMode("signe");
      setFaites(4);
    });
    plus_tard(5300, () => setFaites(5));
    return vider;
  }, [tour, reduit]);

  const aVous = () => {
    vider();
    setTraits([]);
    setFaites(3);
    setMode("visiteur");
  };

  // Sans tracé (clavier, lecteur d'écran), valider signe quand même :
  // la démonstration ne doit exclure personne.
  const signer = () => {
    if (mode !== "visiteur") return;
    setParVisiteur(true);
    setMode("signe");
    setFaites(4);
    plus_tard(reduit ? 0 : 600, () => setFaites(5));
  };

  // Le tracé du visiteur, en coordonnées de la zone (200 × 70).
  const position = (e: React.PointerEvent): Point | null => {
    const r = zone.current?.getBoundingClientRect();
    if (!r) return null;
    return [((e.clientX - r.left) / r.width) * 200, ((e.clientY - r.top) / r.height) * 70];
  };
  const commencer = (e: React.PointerEvent) => {
    if (mode !== "visiteur") return;
    const p = position(e);
    if (!p) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    trace.current = [p];
    setTraits((t) => [...t, [p]]);
  };
  const continuer = (e: React.PointerEvent) => {
    if (!trace.current) return;
    const p = position(e);
    if (!p) return;
    trace.current.push(p);
    const courant = [...trace.current];
    setTraits((t) => [...t.slice(0, -1), courant]);
  };
  const finir = () => {
    trace.current = null;
  };

  const longueur = traits.reduce(
    (total, t) => total + t.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - t[i][0], p[1] - t[i][1]), 0),
    0
  );
  const heureSignature = mode === "signe" && parVisiteur ? "à l'instant" : ETAPES[3].heure;

  return (
    <div ref={ref} className="grid items-center gap-10 px-5 pb-20 pt-8 max-md:gap-3 max-md:px-4 max-md:pb-5 max-md:pt-3 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-2 lg:gap-12 lg:px-14 lg:py-16">
      {/* Le téléphone de la cliente */}
      <div className="mx-auto w-full max-w-[15.5rem] max-md:max-w-none">
        <div className="v-telephone v-cadre-souple">
          <div className="v-ecran bg-[#FAF8F5] text-[#1F2937]">
            <div className="absolute left-1/2 top-[2.6cqw] h-[8.6cqw] w-[29cqw] -translate-x-1/2 rounded-full bg-black max-md:hidden" />
            <div className="flex h-full flex-col px-[6cqw] pb-[6cqw] pt-[16cqw] max-md:px-[5cqw] max-md:pb-[5cqw] max-md:pt-[5cqw]">
              <div className="flex items-center gap-[2.5cqw]">
                <span className="grid h-[9cqw] w-[9cqw] place-items-center rounded-full bg-[#1F2937] text-[3.4cqw] font-semibold text-white">
                  MP
                </span>
                <span className="text-[3.9cqw] font-semibold">Martin Plomberie</span>
              </div>
              <p className="mt-[6cqw] font-mono text-[3cqw] uppercase tracking-[0.14em] text-[#5C7080] max-md:mt-[4cqw]">Devis D-2026-048</p>
              <p className="mt-[1cqw] text-[5.2cqw] font-semibold leading-tight">Fuite sous l&apos;évier</p>
              <ul className="mt-[3.5cqw] space-y-[1.6cqw] text-[3.3cqw] text-[#1F2937]/75 max-md:hidden">
                {["Siphon et raccords", "Flexibles inox", "Fond du meuble", "Main-d'œuvre ½ j"].map((l) => (
                  <li key={l} className="flex items-center justify-between gap-[2cqw] border-b border-[#1F2937]/[0.07] pb-[1.4cqw]">
                    <span className="truncate">{l}</span>
                    <span className="h-[1.2cqw] w-[9cqw] shrink-0 rounded-full bg-[#1F2937]/15" />
                  </li>
                ))}
              </ul>
              <div className="mt-[4cqw] flex items-baseline justify-between rounded-[3cqw] bg-[#F3EDE6] px-[4cqw] py-[3cqw] max-md:mt-[3cqw] max-md:py-[2cqw]">
                <p className="text-[3.2cqw] text-[#5C7080]">Total TTC</p>
                <p className="text-[6cqw] font-semibold tabular-nums tracking-tight">387,20&nbsp;€</p>
              </div>

              <ul className="mt-[3.5cqw] space-y-[1cqw] text-[2.9cqw] leading-snug text-[#5C7080] max-md:hidden">
                <li>Validité 30 jours · TVA 10 % (logement de plus de 2 ans)</li>
                <li>Acompte de 30 % à la signature</li>
              </ul>

              <span className="min-h-[2cqw] flex-1" />
              <p className="mt-[5cqw] text-[3.4cqw] font-medium max-md:mt-[4cqw]">Bon pour accord</p>
              <div
                className={`relative mt-[2cqw] aspect-[2.3/1] rounded-[3cqw] max-md:aspect-[3.6/1] border-[1.5px] border-dashed bg-white ${
                  mode === "visiteur" ? "border-[#C96B4A]" : "border-[#1F2937]/20"
                }`}
              >
                {mode === "visiteur" && traits.length === 0 && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center text-[3.6cqw] text-[#C96B4A]">
                    Signez ici
                  </span>
                )}
                <svg
                  ref={zone}
                  viewBox="0 0 200 70"
                  className={`absolute inset-0 h-full w-full ${mode === "visiteur" ? "cursor-crosshair touch-none" : ""}`}
                  onPointerDown={commencer}
                  onPointerMove={continuer}
                  onPointerUp={finir}
                  onPointerCancel={finir}
                  aria-label={mode === "visiteur" ? "Zone de signature : tracez votre signature" : undefined}
                  aria-hidden={mode === "visiteur" ? undefined : true}
                  role={mode === "visiteur" ? "img" : undefined}
                >
                  {traits.length === 0 && (mode === "auto" || mode === "signe") && (
                    <path
                      d={SIGNATURE_AUTO}
                      fill="none"
                      stroke="#1F2937"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      style={
                        mode === "auto" && !reduit
                          ? { strokeDasharray: 1, strokeDashoffset: 1, animation: "v-trace 2s cubic-bezier(0.65,0,0.35,1) forwards" }
                          : undefined
                      }
                    />
                  )}
                  {traits.map((t, i) => (
                    <polyline
                      key={i}
                      points={t.map((p) => p.join(",")).join(" ")}
                      fill="none"
                      stroke="#1F2937"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>
              </div>

              <div
                className={`mt-[4cqw] flex items-center justify-center gap-[1.5cqw] rounded-full py-[3.4cqw] text-[3.8cqw] font-semibold text-white transition-colors duration-500 ${
                  mode === "signe" ? "bg-[#2F8F5B]" : "bg-[#C96B4A]"
                }`}
              >
                {mode === "signe" ? (
                  <>
                    <Coche className="h-[4cqw] w-[4cqw]" /> Signé · {heureSignature}
                  </>
                ) : (
                  "Signer le devis"
                )}
              </div>
            </div>
          </div>
        </div>

        {/* À vous */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 max-md:mt-2.5">
          {mode === "visiteur" ? (
            <>
              <button
                type="button"
                onClick={signer}
                className={`rounded-full bg-signal px-5 py-2.5 text-[14px] font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
                  longueur > 60 ? "" : "opacity-60"
                }`}
              >
                Valider ma signature
              </button>
              <button
                type="button"
                onClick={() => setTraits([])}
                className="rounded-full px-4 py-2.5 text-[14px] font-medium text-ink/60 hover:text-ink"
              >
                Effacer
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={aVous}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-paper transition hover:bg-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M2 12c2-4 4-7 5-5s-1 5 1 4 3-5 4-4-1 3 1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Signez vous-même
            </button>
          )}
        </div>
        {mode === "visiteur" && (
          <p className="mt-3 text-center text-[12.5px] text-steel">
            Tracez dans la zone, au doigt ou à la souris.
          </p>
        )}
      </div>

      {/* Ce que voit l'artisan */}
      <Carte className="p-5 max-md:px-3 max-md:py-2.5 sm:p-7">
        <div className="flex items-baseline justify-between gap-3 max-md:hidden">
          <Etiquette>Suivi du devis</Etiquette>
          <Etiquette className="normal-case tracking-normal">D-2026-048</Etiquette>
        </div>
        <ol className="mt-5 max-md:mt-0 max-md:flex max-md:justify-between">
          {ETAPES.map((e, i) => {
            const fait = i < faites;
            return (
              <li key={e.titre} className="relative flex gap-4 pb-6 last:pb-0 max-md:flex-1 max-md:flex-col max-md:items-center max-md:gap-1.5 max-md:pb-0">
                {i < ETAPES.length - 1 && (
                  <span aria-hidden className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-ink/10 max-md:hidden">
                    <span
                      className="block h-full w-full origin-top bg-succes transition-transform duration-700"
                      style={{ transform: `scaleY(${i < faites - 1 ? 1 : 0})` }}
                    />
                  </span>
                )}
                <span
                  className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all duration-500 ${
                    fait ? "bg-succes text-white" : "bg-ink/[0.07] text-transparent"
                  } ${i === 4 && fait ? "bg-signal" : ""}`}
                >
                  <Coche className="h-3.5 w-3.5" />
                </span>
                <p className={`text-[11.5px] font-medium transition-opacity duration-500 md:hidden ${fait ? "text-ink" : "text-ink/35"}`}>{e.court}</p>
                <div className={`min-w-0 flex-1 transition-opacity duration-500 max-md:hidden ${fait ? "opacity-100" : "opacity-35"}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14.5px] font-medium text-ink">{e.titre}</p>
                    <p className="shrink-0 font-mono text-[11px] tabular-nums text-steel">
                      {i === 3 || i === 4 ? heureSignature : e.heure}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink/55">{e.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Carte>
    </div>
  );
}
