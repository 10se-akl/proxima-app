import { Journee, type Chapitre as InfosChapitre } from "./Journee";
import { Chapitre } from "./scenes/Chapitre";
import { SceneMessage } from "./scenes/SceneMessage";
import { SceneChantier } from "./scenes/SceneChantier";
import { SceneDevis } from "./scenes/SceneDevis";
import { SceneSignature } from "./scenes/SceneSignature";
import { ScenePlanning } from "./scenes/ScenePlanning";
import { SceneRange } from "./scenes/SceneRange";

// ============================================================
// La journée de Compyo, chapitre par chapitre (24/09).
//
// Une seule journée, un seul chantier (Mme Garnier, fuite sous l'évier),
// du premier message à 07:48 jusqu'à la dernière tâche à 18:52. Chaque
// chapitre montre une fonction réelle de l'app, dans l'ordre où un
// artisan la rencontre. Le soleil de chaque toile avance avec l'heure.
// ============================================================

const CHAPITRES: (InfosChapitre & {
  texte: string;
  soleil: [string, string, number];
  scene: React.ReactNode;
})[] = [
  {
    heure: "07:48",
    titre: "Un client écrit.",
    duree: 8,
    texte: "Vous partagez son message vers Compyo. Le projet se crée tout seul.",
    soleil: ["8%", "0%", 0.55],
    scene: <SceneMessage />,
  },
  {
    heure: "10:15",
    titre: "Sur place, vous parlez.",
    duree: 7.5,
    texte: "Votre note est transcrite. Vos photos se rangent dans le bon projet.",
    soleil: ["30%", "-10%", 0.75],
    scene: <SceneChantier />,
  },
  {
    heure: "12:30",
    titre: "Le devis se construit.",
    duree: 8,
    texte: "L'IA rédige les lignes, vos prix font les montants. Essayez de corriger.",
    soleil: ["55%", "-15%", 0.85],
    scene: <SceneDevis />,
  },
  {
    heure: "15:10",
    titre: "La cliente signe.",
    duree: 8.5,
    texte: "Sur son téléphone, en deux gestes. Vous voyez qu'elle a signé.",
    soleil: ["78%", "5%", 0.8],
    scene: <SceneSignature />,
  },
  {
    heure: "17:20",
    titre: "La semaine se remplit.",
    duree: 7.5,
    texte: "Un créneau pris ne peut pas l'être deux fois.",
    soleil: ["95%", "30%", 0.85],
    scene: <ScenePlanning />,
  },
  {
    heure: "18:40",
    titre: "Tout est rangé.",
    duree: 7,
    texte: "Chaque projet garde tout : le message, la note, les photos, le devis, l'acompte.",
    soleil: ["100%", "75%", 0.95],
    scene: <SceneRange />,
  },
];

export function SectionJournee() {
  return (
    <section id="journee" aria-labelledby="titre-journee" className="scroll-mt-16 px-5 pb-10 pt-24 max-md:pb-4 max-md:pt-10 sm:px-8 sm:pt-36">
      <div className="mx-auto max-w-7xl">
        <header data-revele className="mb-10 max-w-3xl max-md:mb-6 sm:mb-20 xl:ml-[18rem] 2xl:ml-[20rem]">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">
            Mardi 9 juin · 07:48 → 18:52
          </p>
          <h2
            id="titre-journee"
            className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink max-md:mt-3 max-md:text-[2.3rem] sm:text-7xl"
          >
            Une journée avec Compyo.
          </h2>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink/60 max-md:mt-3 max-md:text-[15.5px] max-md:leading-snug sm:text-lg">
            Un chantier, du premier message à la dernière tâche. Rien à rattraper le soir.
          </p>
        </header>

        <Journee chapitres={CHAPITRES.map(({ heure, titre, duree }) => ({ heure, titre, duree }))}>
          {CHAPITRES.map((c, i) => (
            <Chapitre key={c.heure} index={i} heure={c.heure} titre={c.titre} texte={c.texte} soleil={c.soleil}>
              {c.scene}
            </Chapitre>
          ))}
        </Journee>
      </div>
    </section>
  );
}
