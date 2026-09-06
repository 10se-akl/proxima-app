// Page de revue interne — PAS la landing finale. Sert uniquement à visualiser
// en localhost les images/vidéos générées avec Higgsfield pour valider la
// direction artistique "Director's Cut" (voir compyo-direction-artistique.md
// à la racine du dossier partagé) avant tout développement React Three
// Fiber. Les fichiers restent hébergés sur le CDN Higgsfield (pas encore
// téléchargés dans /public) — cette page fonctionne donc uniquement avec une
// connexion internet active. Retirer cette route avant tout déploiement
// public : ce n'est pas une page destinée aux visiteurs du site.
//
// Audit sécurité/bugs (05/09) — 🟡 : en attendant cette suppression, exclue
// explicitement de l'indexation (même traitement que /apercu-immersif) —
// robots.ts ne bloque que /dashboard et /admin, cette page de brouillon
// aurait donc été indexable si jamais déployée telle quelle.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aperçu univers (brouillon interne)",
  description: "Brouillon interne — exploration visuelle Higgsfield, non destiné aux visiteurs du site.",
  robots: { index: false, follow: false },
};

type Scene = {
  numero: string;
  titre: string;
  image?: string;
  video?: string;
  description: string;
};

const SCENES: Scene[] = [
  {
    numero: "0",
    titre: "Entrée — les objets flottants",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_145820_d0e0790a-1d23-4b9b-9278-b86ddf6e969c.png",
    description:
      "Neuf objets du quotidien de l'artisan flottent dans l'obscurité. Aucun texte les 3 premières secondes.",
  },
  {
    numero: "1",
    titre: "Convergence — la sphère qui absorbe",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_145830_0cecf475-28bb-43db-a9f6-555f1217a508.png",
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_152304_13802e92-869b-4ad9-8364-e4a1db6779db.mp4",
    description:
      "Les objets convergent et sont absorbés par une matière vivante. Titre : « Votre entreprise. Enfin organisée. »",
  },
  {
    numero: "2",
    titre: "Le cerveau — intérieur de la sphère",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150216_2de7eca0-7f67-4092-b4bb-da2536a658f8.png",
    description: "La caméra traverse la matière : ce n'est pas une planète, c'est un cerveau.",
  },
  {
    numero: "3a",
    titre: "Le chantier — avant (chaos)",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150224_4c40f430-40ab-4e4c-9aa8-ab301700210c.png",
    description: "Matériaux, outils, plans et devis éparpillés en désordre.",
  },
  {
    numero: "3b",
    titre: "Le chantier — après (rangé)",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150153_f4067547-e888-459e-9f24-1d100698bf86.png",
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_152305_a22c73df-9a54-4341-acb1-19fcef93e6b1.mp4",
    description: "Sans aucune main humaine visible, tout se classe. « Compyo pense. »",
  },
  {
    numero: "4",
    titre: "Le message qui devient projet",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150232_2f51344e-ed8d-4377-8763-cd32e8bdac60.png",
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_152304_a6628031-4439-4602-92e2-afa7fa79a142.mp4",
    description: "Une bulle WhatsApp est absorbée ; projet, client, devis, planning et photos apparaissent.",
  },
  {
    numero: "5",
    titre: "La complexification — le cerveau devient dense",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150153_644b2a2c-0eb6-406e-bfa8-1fae3f5d6b8f.png",
    description: "Plus Compyo reçoit d'informations, plus il devient beau et organisé.",
  },
  {
    numero: "6a",
    titre: "Adaptation métier — Plombier",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150240_6d16ac69-268d-412b-ba24-30e0e477cdca.png",
    description: "Tube de cuivre, raccord PER, robinetterie chromée.",
  },
  {
    numero: "6b",
    titre: "Adaptation métier — Électricien",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150246_7d05da49-890a-46d7-bd58-64c1e87e4957.png",
    description: "Disjoncteur, tableau électrique miniature, faisceau de câbles.",
  },
  {
    numero: "6c",
    titre: "Adaptation métier — Couvreur",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150153_9ccfc544-bb40-48b8-836f-70bf67557aa1.png",
    description: "Tuile terre cuite, ardoise, chevron de bois.",
  },
  {
    numero: "6d",
    titre: "Adaptation métier — Peintre",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150253_1142a01e-0c43-46b9-a9c9-e4655717d19b.png",
    description: "Nuancier RAL, pot de peinture entrouvert, rouleau.",
  },
  {
    numero: "7",
    titre: "Sortie — la sphère au repos",
    image:
      "https://d8j0ntlcm91z4.cloudfront.net/user_3Im3oHo8r1kQKY16yZ1wWQu3TXm/hf_20260902_150259_959296c1-01c0-40c0-9038-6bb93fb28824.png",
    description: "« Compyo est en bêta privée, avec quelques artisans. » CTA : Demander un accès.",
  },
];

export default function ApercuUniversPage() {
  return (
    <div style={{ background: "#0F0F11", color: "#F2EDE6", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px 120px" }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>
          Aperçu interne — pas la landing finale
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
          Compyo — Direction artistique &quot;Director&apos;s Cut&quot;
        </h1>
        <p style={{ opacity: 0.6, marginTop: 8, lineHeight: 1.6 }}>
          Images et vidéos générées avec Higgsfield pour valider la direction avant tout
          développement React Three Fiber. Voir <code>compyo-direction-artistique.md</code> pour le
          storyboard complet.
        </p>

        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 64 }}>
          {SCENES.map((scene) => (
            <div key={scene.numero}>
              <p style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.5, marginBottom: 6 }}>
                Scène {scene.numero}
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{scene.titre}</h2>
              <p style={{ opacity: 0.6, marginBottom: 16, maxWidth: 640, lineHeight: 1.6 }}>
                {scene.description}
              </p>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(242,237,230,0.1)" }}>
                {scene.video ? (
                  <video
                    src={scene.video}
                    poster={scene.image}
                    controls
                    loop
                    muted
                    playsInline
                    style={{ width: "100%", display: "block" }}
                  />
                ) : scene.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={scene.image} alt={scene.titre} style={{ width: "100%", display: "block" }} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
