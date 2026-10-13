// Les captures du Guide (public/guide/*.webp) et la place des boutons à
// entourer (lib/guide/captures.json), produites ensemble depuis les bancs
// d'essai locaux (app/apercu-*, données fictives, sans base ni connexion).
//
//   node refonte-maquettes/outils/captures-guide.mjs [id1,id2…]
//
// Lit refonte-maquettes/outils/guide.json. Pour chaque capture et chaque
// appareil (telephone 390 × 844, ordinateur 1280 × 860), en sombre puis en
// clair : ouvre l'URL, joue le geste (« js »), repère les cibles et la zone
// à garder (« clip »), capture. Les PNG passent ensuite en WebP
// (python refonte-maquettes/outils/guide-webp.py).
// Serveur de dev sur le port 3000. Edge sans fenêtre.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const RACINE = process.cwd();
const config = JSON.parse(readFileSync(join(RACINE, "refonte-maquettes/outils/guide.json"), "utf8"));
const seulement = process.argv[2] ? process.argv[2].split(",") : null;
const SORTIE_PNG = join(tmpdir(), "compyo-guide-png");
mkdirSync(SORTIE_PNG, { recursive: true });
const FICHIER_JSON = join(RACINE, "lib/guide/captures.json");
// Tout refaire repart de zéro ; refaire quelques captures garde les autres.
const resultats = seulement && existsSync(FICHIER_JSON) ? JSON.parse(readFileSync(FICHIER_JSON, "utf8")) : {};

const APPAREILS = {
  telephone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  ordinateur: { width: 1280, height: 860, deviceScaleFactor: 1.5, mobile: false },
};

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9336;
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), "compyo-guide-" + Date.now())}`, "--no-first-run", "--hide-scrollbars", "about:blank"]);
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let url;
for (let i = 0; i < 50 && !url; i++) {
  try {
    url = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page")?.webSocketDebuggerUrl;
  } catch {}
  if (!url) await attendre(300);
}
const ws = new WebSocket(url);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const att = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && att.has(m.id)) {
    att.get(m.id)(m);
    att.delete(m.id);
  }
});
const cdp = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    att.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const js = async (expr) => {
  const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) console.log("  ! erreur JS :", r.result.exceptionDetails.exception?.description?.split("\n")[0]);
  return r.result?.result?.value;
};

// Trouver un élément à l'écran : { css } ou { texte } (bouton, lien,
// étiquette dont le texte ou l'aria-label contient ce texte ; le plus petit).
const OUTILS = `
window.__vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
window.__trouver = (c) => {
  if (typeof c === 'string') c = { css: c };
  let els;
  if (c.css) els = [...document.querySelectorAll(c.css)].filter(__vis);
  else {
    const t = c.texte.toLowerCase();
    els = [...document.querySelectorAll(c.parmi || 'button, a, label, [role=button], [role=link]')]
      .filter((e) => __vis(e) && ((e.innerText || '') + ' ' + (e.getAttribute('aria-label') || '')).toLowerCase().includes(t));
    els.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return ra.width * ra.height - rb.width * rb.height; });
  }
  return els[c.nieme || 0] || null;
};
window.__rect = (c) => { const e = __trouver(c); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
`;

await cdp("Page.enable");
for (const entree of config) {
  if (seulement && !seulement.includes(entree.id)) continue;
  resultats[entree.id] = resultats[entree.id] || {};
  for (const appareil of ["telephone", "ordinateur"]) {
    const conf = entree[appareil];
    if (!conf) {
      delete resultats[entree.id][appareil];
      continue;
    }
    for (const theme of ["sombre", "clair"]) {
      const a = APPAREILS[appareil];
      await cdp("Emulation.setDeviceMetricsOverride", a);
      await cdp("Page.navigate", { url: "http://localhost:3000/apercu-polish?ecran=vide" });
      await attendre(500);
      await js(`try{localStorage.setItem("compyo-mode-sombre","${theme === "sombre" ? "1" : "0"}");localStorage.setItem("compyo-tuto-premier-projet-vu","1");localStorage.setItem("compyo-onboarding-vu","1")}catch(e){}`);
      await cdp("Page.navigate", { url: conf.url });
      await attendre(conf.chargement ?? 3500);
      await js(OUTILS + "document.documentElement.style.scrollBehavior='auto'; true");
      for (const geste of conf.gestes || []) {
        if (geste.cliquer) {
          const ok = await js(`(() => { const e = __trouver(${JSON.stringify(geste.cliquer)}); if (!e) return false; e.click(); return true; })()`);
          if (!ok) console.log(`  ! ${entree.id} ${appareil} : rien à cliquer pour ${JSON.stringify(geste.cliquer)}`);
        }
        if (geste.js) await js(geste.js);
        await attendre(geste.attente ?? 700);
      }
      // Amener la zone en haut de l'écran.
      if (conf.defiler) {
        await js(`(() => { const e = __trouver(${JSON.stringify(conf.defiler)}); if (e) { const y = e.getBoundingClientRect().top + scrollY - ${conf.defilerMarge ?? (appareil === "telephone" ? 64 : 24)}; scrollTo(0, Math.max(0, y)); } })()`.replace("__MARGE__", ""));
        await attendre(500);
      }
      await attendre(conf.attenteFinale ?? 600);
      const vue = await js(`({ w: innerWidth, h: innerHeight })`);
      let clip = { x: 0, y: 0, w: vue.w, h: vue.h };
      if (conf.clip && conf.clip.zone) {
        const rs = [];
        for (const z of conf.clip.zone) {
          const r = await js(`__rect(${JSON.stringify(z)})`);
          if (r) rs.push(r);
          else console.log(`  ! ${entree.id} ${appareil} : zone introuvable ${JSON.stringify(z)}`);
        }
        if (rs.length) {
          const m = conf.clip.marge ?? 16;
          let x1 = Math.min(...rs.map((r) => r.x)) - m;
          let y1 = Math.min(...rs.map((r) => r.y)) - m;
          let x2 = Math.max(...rs.map((r) => r.x + r.w)) + m;
          let y2 = Math.max(...rs.map((r) => r.y + r.h)) + m;
          if (conf.clip.pleineLargeur) {
            x1 = 0;
            x2 = vue.w;
          }
          if (conf.clip.minLargeur && x2 - x1 < conf.clip.minLargeur) {
            const c = (x1 + x2) / 2;
            x1 = c - conf.clip.minLargeur / 2;
            x2 = c + conf.clip.minLargeur / 2;
          }
          x1 = Math.max(0, x1);
          y1 = Math.max(0, y1);
          x2 = Math.min(vue.w, x2);
          y2 = Math.min(vue.h, y2);
          clip = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
        }
      } else if (conf.clip && conf.clip.w) clip = conf.clip;
      clip = { x: Math.round(clip.x), y: Math.round(clip.y), w: Math.round(clip.w), h: Math.round(clip.h) };
      const cibles = [];
      for (const c of conf.cibles || []) {
        const r = await js(`__rect(${JSON.stringify(c)})`);
        if (!r) {
          console.log(`  ! ${entree.id} ${appareil} : cible introuvable ${JSON.stringify(c)}`);
          continue;
        }
        cibles.push({ x: Math.round(r.x - clip.x), y: Math.round(r.y - clip.y), w: Math.round(r.w), h: Math.round(r.h) });
      }
      // La zone est calculée dans l'écran ; la capture compte depuis le haut
      // de la page : on ajoute le défilement.
      const defil = await js(`({ x: scrollX, y: scrollY })`);
      const r = await cdp("Page.captureScreenshot", { format: "png", clip: { x: clip.x + defil.x, y: clip.y + defil.y, width: clip.w, height: clip.h, scale: 1 } });
      const nom = `${entree.id}-${appareil}${theme === "clair" ? "-clair" : ""}.png`;
      writeFileSync(join(SORTIE_PNG, nom), Buffer.from(r.result.data, "base64"));
      if (theme === "clair") resultats[entree.id][appareil] = { largeur: clip.w, hauteur: clip.h, cibles };
      console.log(`✓ ${nom} ${clip.w}×${clip.h} · ${cibles.length} cible(s)`);
    }
  }
}
writeFileSync(FICHIER_JSON, JSON.stringify(resultats, null, 2) + "\n");
console.log("PNG dans", SORTIE_PNG);
ws.close();
edge.kill();
process.exit(0);
