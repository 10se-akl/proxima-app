import Link from "next/link";
import { SECTIONS, lireCapture } from "@/lib/guide/contenu";
import { CaptureAnnotee } from "./CaptureAnnotee";
import { BoutonRevoirTuto } from "./BoutonRevoirTuto";
import { EnTetePage } from "@/components/ui/EnTetePage";
import { Pastille } from "@/components/ui/Pastille";
import { IconeGuide } from "@/components/ui/Icones";

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
// ============================================================

export function VueGuide() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-12 sm:p-8">
      <div id="sommaire" className="scroll-mt-16">
        <EnTetePage
          titre={`Compyo en ${SECTIONS.length} moments`}
          sousTitre="Choisissez un moment de votre journée pour voir comment faire, écran par écran."
          icone={
            <Pastille couleur="bleu" taille="grande">
              <IconeGuide taille={24} />
            </Pastille>
          }
        >
          <BoutonRevoirTuto />
        </EnTetePage>
      </div>

      <nav aria-label="Sommaire du guide" className="mt-5">
        <ol className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/10 active:bg-ink/5 motion-safe:transition sm:hover:ring-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal/12 font-display text-base font-semibold text-signal">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-ink">{s.titre}</span>
                  <span className="block text-sm text-steel">{s.resume}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {SECTIONS.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`titre-${s.id}`} className="mt-14 scroll-mt-16">
          <p className="text-sm text-steel">
            {i + 1} sur {SECTIONS.length}
          </p>
          <h2 id={`titre-${s.id}`} className="mt-1 font-display text-xl font-semibold text-ink">
            {s.titre}
          </h2>
          <p className="mt-1 text-base text-steel">{s.resume}</p>

          <ol className="mt-6 flex flex-col gap-10">
            {s.etapes.map((e, j) => {
              const telephone = e.capture ? lireCapture(e.capture, "telephone") : null;
              const ordinateur = e.capture ? lireCapture(e.capture, "ordinateur") : null;
              return (
                <li key={j} className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-paper">
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
            <p className="mt-8 rounded-2xl bg-paper-warm px-4 py-3.5 text-base text-ink">
              <span className="font-semibold">Astuce · </span>
              {s.astuce}
            </p>
          )}
          {s.lien && (
            <Link
              href={s.lien.href}
              className="mt-8 flex min-h-14 items-center justify-center rounded-2xl text-base font-semibold text-ink ring-1 ring-inset ring-ink/30 active:bg-ink/10 sm:hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              {s.lien.libelle}
            </Link>
          )}

          <a
            href="#sommaire"
            className="mt-6 inline-flex min-h-12 items-center text-sm text-steel underline decoration-ink/20 underline-offset-4 sm:hover:text-ink"
          >
            Revenir au sommaire
          </a>
        </section>
      ))}
    </div>
  );
}
