import { Reveal, SectionLabel } from "./LandingPage";
import { VideoDemo } from "./VideoDemo";

// ============================================================
// 18/09 — la démonstration est désormais une vraie vidéo, produite par
// rendu-video-demo.py (dossier compyo/, en dehors de l'app). C'est la
// seule source de la démo : l'animation React qui en était une copie
// (DemoAnimee.tsx) a été retirée, pour que les deux ne divergent jamais.
//
// Pour mettre la vidéo à jour : relancer le script, puis recopier
// compyo-demo-paysage-1920x1080.mp4 en public/compyo-demo.mp4 et
// réextraire l'affiche (première image) en public/compyo-demo-affiche.jpg.
//
// Si un jour la démo est hébergée ailleurs (YouTube, Vimeo), renseigner
// son adresse ici suffit : le lecteur intégré prend le relais.
// ============================================================
const URL_VIDEO_DEMO = "/compyo-demo.mp4";
const AFFICHE_VIDEO_DEMO = "/compyo-demo-affiche.jpg";

// Pour les lecteurs d'écran : la vidéo n'a ni son ni sous-titres, elle ne
// montre que des écrans. Voici ce qu'ils disent, dans l'ordre.
const DESCRIPTION_DEMO =
  "Démonstration de Compyo, sans son. Une cliente écrit pour faire refaire sa salle de bain ; " +
  "l'artisan partage son message à Compyo, qui en fait un projet. Il dicte ensuite ses notes de visite. " +
  "Compyo propose un devis chiffré, que l'artisan valide avant de l'envoyer. Le dossier se suit ensuite " +
  "jusqu'à la facture. Vos soirées ne sont pas faites pour la paperasse.";

function estUrlIntegration(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function SectionDemoVideo() {
  return (
    <section className="bg-paper">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal className="text-center">
          <SectionLabel>Démonstration</SectionLabel>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Compyo, en trente secondes.
          </h2>
          <p className="mt-4 text-ink/60 max-w-md mx-auto leading-relaxed">
            Du message du client au devis que vous validez, puis suivi jusqu&apos;au paiement.
          </p>

          <a
            href="#demo-video"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
          >
            Voir la démonstration
          </a>
        </Reveal>

        <Reveal delay={100} className="mt-14">
          <div id="demo-video" className="max-w-4xl mx-auto scroll-mt-24">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-xl shadow-ink/[0.08]">
              {estUrlIntegration(URL_VIDEO_DEMO) ? (
                <iframe
                  src={URL_VIDEO_DEMO}
                  title="Démonstration de Compyo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <VideoDemo src={URL_VIDEO_DEMO} affiche={AFFICHE_VIDEO_DEMO} description={DESCRIPTION_DEMO} />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
