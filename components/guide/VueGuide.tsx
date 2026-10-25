import Link from "next/link";
import { SECTIONS, lireCapture } from "@/lib/guide/contenu";
import { CaptureAnnotee } from "./CaptureAnnotee";
import { BoutonRevoirTuto } from "./BoutonRevoirTuto";
import { CLASSE_PAGE, EnTetePage } from "@/components/ui/EnTetePage";
import { BOUTON_CREUX_LARGE, BOUTON_TEXTE, CARTE, CREUX, SECONDAIRE, TITRE_SECTION } from "@/components/ui/recettes";

// ============================================================
// Le guide (27/09) — « comment l'utiliser, avec des flèches, des images »
// (Axel). Un sommaire des huit moments de la journée, puis chaque moment
// en quelques étapes : la phrase d'abord, la capture ensuite. Aucune
// donnée chargée, aucun script : la page s'affiche aussitôt, même avec peu
// de réseau (les images arrivent au fur et à mesure qu'on descend).
//
// 13/10 — deux versions, à la même limite que la barre latérale (640 px) :
// sur téléphone, la capture du téléphone et « Touchez » ; sur ordinateur,
// la capture de l'ordinateur et « Cliquez ». Seules les images de
// l'appareil (et du thème) affiché sont téléchargées.
//
// Design v3 (24/10) : la grille commune ; des cartes calmes (surface, ombre
// douce, sans contour) ; des numéros sobres, en creux et à l'encre (plus de
// ronds orange ni de ronds pleins) ; aucun bouton plein sur la page.
// ============================================================

export function VueGuide() {
  return (
    <div className={`${CLASSE_PAGE} max-w-3xl`}>
      <div id="sommaire" className="scroll-mt-16">
        <EnTetePage
          titre={`Compyo en ${SECTIONS.length} moments`}
          sousTitre="Choisissez un moment de votre journée pour voir comment faire, écran par écran."
        >
          <BoutonRevoirTuto />
        </EnTetePage>
      </div>

      <nav aria-label="Sommaire du guide" className="mt-6">
        <ol className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`flex h-full min-h-[4.25rem] items-center gap-3 px-4 py-3 ${CARTE} active:bg-ink/[0.03] sm:hover:bg-ink/[0.02] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-paper-warm text-base font-semibold tabular-nums text-ink">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-snug text-ink">{s.titre}</span>
                  <span className={`block ${SECONDAIRE}`}>{s.resume}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {SECTIONS.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`titre-${s.id}`} className="mt-14 scroll-mt-16">
          <p className={SECONDAIRE}>
            {i + 1} sur {SECTIONS.length}
          </p>
          <h2 id={`titre-${s.id}`} className={`mt-1 ${TITRE_SECTION}`}>
            {s.titre}
          </h2>
          <p className={`mt-1 ${SECONDAIRE}`}>{s.resume}</p>

          <ol className="mt-6 flex flex-col gap-10">
            {s.etapes.map((e, j) => {
              const telephone = e.capture ? lireCapture(e.capture, "telephone") : null;
              const ordinateur = e.capture ? lireCapture(e.capture, "ordinateur") : null;
              return (
                <li key={j} className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-warm text-[15px] font-semibold tabular-nums text-ink">
                      {j + 1}
                    </span>
                    <p className="pt-0.5 text-base text-ink">
                      <span className={e.texteOrdinateur ? "sm:hidden" : undefined}>{e.texte}</span>
                      {e.texteOrdinateur && <span className="hidden sm:inline">{e.texteOrdinateur}</span>}
                    </p>
                  </div>
                  {e.capture && telephone && (
                    <div className="sm:hidden">
                      <CaptureAnnotee id={e.capture} appareil="telephone" capture={telephone} alt={e.alt ?? ""} />
                    </div>
                  )}
                  {e.capture && ordinateur && (
                    <div className="hidden pl-11 sm:block">
                      <CaptureAnnotee id={e.capture} appareil="ordinateur" capture={ordinateur} alt={e.alt ?? ""} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {s.astuce && (
            <p className={`mt-8 px-4 py-3.5 text-base text-ink ${CREUX}`}>
              <span className="font-semibold">Astuce · </span>
              {s.astuce}
            </p>
          )}
          {s.lien && (
            <Link
              href={s.lien.href}
              className={`mt-8 ${BOUTON_CREUX_LARGE}`}
            >
              {s.lien.libelle}
            </Link>
          )}

          <a
            href="#sommaire"
            className={`-ml-3 mt-4 ${BOUTON_TEXTE} font-medium`}
          >
            Revenir au sommaire
          </a>
        </section>
      ))}
    </div>
  );
}
