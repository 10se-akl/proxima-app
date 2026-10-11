// ============================================================
// Le film Compyo (11/10, référence d'Axel : un montage de motion design,
// des plans d'une seconde coupés net sur des fonds de couleur).
//
// Une seule animation, deux usages :
//   - sur la vitrine, le défilement fait avancer le film (Showreel.tsx) ;
//   - la pub vidéo : le même film rendu image par image (pub-motion).
//
// Tout tient dans rendre(racine, t) : aucune animation CSS, chaque image
// se calcule à partir du temps, sur une scène de 1600 × 1000 que le
// composant met à l'échelle. On n'écrit que transform, opacity et, pour
// les tracés, stroke-dashoffset.
// ============================================================

export const DUREE = 16;

// Les plans, dans l'ordre : [début, fin[.
export const PLANS = {
  grille: [0, 1.6],
  marque: [1.6, 3.2],
  vos: [3.2, 4.3],
  soirees: [4.3, 5.4],
  avous: [5.4, 6.7],
  bilan: [6.7, 9.2],
  messages: [9.2, 10.9],
  devis: [10.9, 12.7],
  points: [12.7, 14.4],
  fin: [14.4, 16.01],
} as const;
export type IdPlan = keyof typeof PLANS;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const p = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const eo5 = (x: number) => 1 - Math.pow(1 - x, 5);
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eback = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const euros = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} €`;

// Des positions « au hasard » mais toujours les mêmes (pas de Math.random :
// le rendu du serveur et celui du navigateur doivent être identiques).
export function hasard(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const MESSAGES = [
  { nom: "Mme Garnier", texte: "Fuite sous l'évier" },
  { nom: "M. Bernard", texte: "Toiture, devis ?" },
  { nom: "Mme Martin", texte: "Parquet 30 m²" },
  { nom: "M. Petit", texte: "Ravalement façade" },
  { nom: "Mme Dupont", texte: "Salle de bain" },
  { nom: "M. Leroy", texte: "Chauffe-eau HS" },
  { nom: "Mme Roux", texte: "Peinture salon" },
  { nom: "M. Faure", texte: "Tableau électrique" },
];
export const BARRES = [32, 41, 38, 52, 47, 60, 58, 71, 66, 80, 77, 92];
export const POINTS = 9;

type Pose = { x?: number; y?: number; s?: number; r?: number; o?: number; flou?: number };

export function rendre(racine: HTMLElement, t: number) {
  const $ = (id: string) => racine.querySelector<HTMLElement>(`[data-r="${id}"]`);
  const $$ = (id: string) => Array.from(racine.querySelectorAll<HTMLElement>(`[data-r="${id}"]`));
  const pose = (el: HTMLElement | null, { x = 0, y = 0, s = 1, r = 0, o = 1, flou = 0 }: Pose) => {
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
    el.style.opacity = String(o);
    el.style.filter = flou > 0.05 ? `blur(${flou}px)` : "";
  };
  const local = (id: IdPlan) => {
    const [a, b] = PLANS[id];
    return { a, b, actif: t >= a && t < b, d: t - a, k: (t - a) / (b - a) };
  };

  // Un seul plan visible : la coupe est nette, comme au montage.
  (Object.keys(PLANS) as IdPlan[]).forEach((id) => {
    const el = $(`plan-${id}`);
    if (el) el.style.visibility = local(id).actif ? "visible" : "hidden";
  });

  // 1. La grille et la ligne qui la traverse.
  {
    const { d } = local("grille");
    pose($("grille-fond"), { s: lerp(1, 1.08, eio(p(d, 0, 1.6))) });
    const ligne = $("grille-ligne");
    if (ligne) ligne.style.transform = `scaleX(${eo(p(d, 0.15, 1.0))})`;
    pose($("grille-texte"), { o: p(d, 0.5, 0.8), y: (1 - eo(p(d, 0.5, 0.9))) * 12 });
  }

  // 2. COMPYO qui claque, lettre par lettre.
  {
    const { d } = local("marque");
    $$("marque-lettre").forEach((el, i) => {
      const k = eo5(p(d, 0.05 + i * 0.06, 0.35 + i * 0.06));
      pose(el, { y: (1 - k) * 160, o: k, s: lerp(1.35, 1, k), flou: (1 - k) * 14 });
    });
    pose($("marque-sous"), { o: p(d, 0.55, 0.85), y: (1 - eo(p(d, 0.55, 0.95))) * 20 });
    pose($("marque-cadre"), { s: lerp(1.06, 1, eio(p(d, 0, 1.6))) });
  }

  // 3. VOS · SOIRÉES · À VOUS : un mot par plan, plein cadre.
  for (const id of ["vos", "soirees", "avous"] as const) {
    const { d } = local(id);
    const k = eo5(p(d, 0, 0.32));
    pose($(`mot-${id}`), { s: lerp(1.3, 1, k) * lerp(1, 1.04, p(d, 0.32, 1.2)), o: k, flou: (1 - k) * 18 });
  }
  {
    const { d } = local("avous");
    $$("crochet").forEach((el, i) => {
      const k = eback(p(d, 0.15 + i * 0.04, 0.5 + i * 0.04));
      const dx = i % 2 ? 1 : -1;
      const dy = i < 2 ? -1 : 1;
      pose(el, { x: (1 - k) * dx * 60, y: (1 - k) * dy * 60, o: clamp(k * 1.5) });
    });
  }

  // 4. Le bilan : le montant compte, les barres montent, la courbe se trace.
  {
    const { d } = local("bilan");
    const montant = $("bilan-montant");
    if (montant) montant.textContent = `+${euros(8460 * eo(p(d, 0.15, 1.5)))}`;
    pose($("bilan-gauche"), { o: p(d, 0, 0.2), x: (1 - eo(p(d, 0, 0.4))) * -40 });
    $$("bilan-barre").forEach((el, i) => {
      el.style.transform = `scaleY(${eback(p(d, 0.25 + i * 0.07, 0.75 + i * 0.07))})`;
    });
    const courbe = $("bilan-courbe");
    if (courbe) courbe.style.strokeDashoffset = String(1 - eio(p(d, 0.6, 1.9)));
    const anneau = $("bilan-anneau");
    if (anneau) anneau.style.strokeDashoffset = String(1 - 0.78 * eo(p(d, 0.3, 1.6)));
    const pc = $("bilan-pc");
    if (pc) pc.textContent = `${Math.round(78 * eo(p(d, 0.3, 1.6)))} %`;
    pose($("bilan-cadre"), { s: lerp(1, 1.05, p(d, 0, 2.5)) });
  }

  // 5. Les messages : un désordre de bulles qui se range en projets.
  {
    const { d } = local("messages");
    const range = eio(p(d, 0.55, 1.25));
    $$("bulle").forEach((el, i) => {
      const entree = eo(p(d, i * 0.04, 0.3 + i * 0.04));
      const x0 = (hasard(i) - 0.5) * 1100;
      const y0 = (hasard(i + 40) - 0.5) * 640;
      const r0 = (hasard(i + 80) - 0.5) * 40;
      const colonne = i % 2;
      const ligne = Math.floor(i / 2);
      const x1 = -250 + colonne * 500;
      const y1 = -255 + ligne * 170;
      pose(el, {
        x: lerp(x0 * lerp(1.4, 1, entree), x1, range),
        y: lerp(y0 * lerp(1.4, 1, entree), y1, range),
        r: lerp(r0, 0, range),
        o: clamp(entree * 1.4),
        s: lerp(0.9, 1, entree),
      });
    });
    pose($("messages-titre"), { o: p(d, 1.15, 1.4), y: (1 - eo(p(d, 1.15, 1.5))) * 20 });
  }

  // 6. Le devis : la carte surgit, le doigt valide.
  {
    const { d } = local("devis");
    const k = eback(p(d, 0, 0.45));
    const carte = $("devis-carte");
    if (carte) {
      carte.style.transform = `perspective(1800px) rotateX(${(1 - eo(p(d, 0, 0.6))) * 22}deg) translateY(${(1 - k) * 80}px) scale(${lerp(0.82, 1, k)})`;
      carte.style.opacity = String(clamp(k * 1.6));
      carte.style.filter = d < 0.3 ? `blur(${(1 - p(d, 0, 0.3)) * 12}px)` : "";
    }
    const total = $("devis-total");
    if (total) total.textContent = euros(3944.6 * eo(p(d, 0.35, 1.0)));
    const doigt = eo(p(d, 0.9, 1.15));
    const appui = d > 1.18 && d < 1.34 ? Math.sin(Math.PI * p(d, 1.18, 1.34)) : 0;
    pose($("devis-doigt"), { x: (1 - doigt) * 160, y: (1 - doigt) * 140, s: 1 - appui * 0.2, o: clamp(doigt * 1.5) * (1 - p(d, 1.55, 1.75)) });
    const onde = p(d, 1.25, 1.75);
    pose($("devis-onde"), { s: 1 + onde * 2.4, o: d < 1.25 ? 0 : (1 - onde) * 0.8 });
    const valide = d >= 1.27;
    const bouton = $("devis-bouton");
    if (bouton) {
      bouton.dataset.valide = valide ? "1" : "0";
      bouton.style.transform = `scale(${1 - appui * 0.04})`;
    }
  }

  // 7. Les points : chaque chantier, puis un seul endroit.
  {
    const { d } = local("points");
    const cercle = $("points-cercle");
    if (cercle) cercle.style.strokeDashoffset = String(1 - eio(p(d, 0, 0.5)));
    const reunit = eio(p(d, 0.65, 1.25));
    $$("point").forEach((el, i) => {
      const a = hasard(i + 7) * Math.PI * 2;
      const r = 70 + hasard(i + 21) * 170;
      const apparu = eback(p(d, 0.1 + i * 0.04, 0.4 + i * 0.04));
      pose(el, { x: Math.cos(a) * r * (1 - reunit), y: Math.sin(a) * r * (1 - reunit), s: apparu * lerp(1, i === 0 ? 2.2 : 0.4, reunit), o: i === 0 ? 1 : 1 - p(d, 1.1, 1.25) });
    });
    pose($("points-cercle-g"), { o: 1 - p(d, 1.0, 1.3), s: lerp(1, 0.7, eio(p(d, 0.9, 1.3))) });
  }

  // 8. La fin : le logo se dessine.
  {
    const { d } = local("fin");
    const arc = $("fin-arc");
    if (arc) arc.style.strokeDashoffset = String(161 * (1 - eio(p(d, 0, 0.7))));
    const c = eback(p(d, 0.5, 0.85));
    const coeur = $("fin-coeur");
    if (coeur) coeur.setAttribute("transform", `translate(${71.6 + 14.4 * (1 - c)},${35.39 + 14.4 * (1 - c)}) scale(${1.2 * c})`);
    pose($("fin-mot"), { o: p(d, 0.45, 0.75), y: (1 - eo(p(d, 0.45, 0.85))) * 40 });
    pose($("fin-url"), { o: p(d, 0.8, 1.05), s: lerp(0.85, 1, eback(p(d, 0.8, 1.15))) });
  }
}
