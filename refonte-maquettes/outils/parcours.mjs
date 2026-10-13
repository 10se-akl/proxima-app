// Joue un parcours dans Edge sans fenêtre et capture chaque étape.
//
//   node refonte-maquettes/outils/parcours.mjs <dossier-sortie> <parcours.json> [largeurs] [clair|sombre]
//
// parcours.json : { "url": "http://localhost:3000/apercu-tuto",
//                   "etapes": [ { "nom": "1-intro" },
//                               { "nom": "2-plus", "cliquer": "C'est parti" },
//                               { "nom": "3-x", "js": "document.querySelector('...').click()", "attente": 1500 } ] }
// « cliquer » : le premier bouton ou lien VISIBLE dont le texte (ou
// aria-label) contient ce texte. Chaque étape est capturée après son geste.
// Serveur de dev sur le port 3000. Le panneau navigateur de l'app Claude ne
// dessine pas d'images : les animations ne se testent qu'ici.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , SORTIE, FICHIER, LARGEURS = "390,1280", THEME = "clair"] = process.argv;
const parcours = JSON.parse(readFileSync(FICHIER, "utf8"));
mkdirSync(SORTIE, { recursive: true });
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9335;
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), "compyo-parcours-" + Date.now())}`, "--no-first-run", "--hide-scrollbars", "about:blank"]);
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
const js = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await cdp("Page.enable");
await cdp("Runtime.enable");
for (const largeur of LARGEURS.split(",").map(Number)) {
  const hauteur = largeur < 640 ? 780 : 860;
  await cdp("Emulation.setDeviceMetricsOverride", { width: largeur, height: hauteur, deviceScaleFactor: largeur < 640 ? 2 : 1, mobile: largeur < 640 });
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: THEME === "sombre" ? "dark" : "light" }] });
  // Le thème de l'application suit localStorage (compyo-mode-sombre) : on le règle avant la page.
  await cdp("Page.navigate", { url: "about:blank" });
  await cdp("Page.navigate", { url: parcours.url });
  await attendre(400);
  await js(`try{localStorage.setItem("compyo-mode-sombre","${THEME === "sombre" ? "1" : "0"}")}catch(e){}`);
  await cdp("Page.reload");
  await attendre(parcours.attenteDepart ?? 5000);
  for (const etape of parcours.etapes) {
    if (etape.cliquer) {
      const ok = await js(`(() => {
        const t = ${JSON.stringify(etape.cliquer)}.toLowerCase();
        const els = [...document.querySelectorAll('button, a, [role=button], label')].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && ((e.textContent || '') + ' ' + (e.getAttribute('aria-label') || '')).toLowerCase().includes(t);
        });
        if (!els.length) return false;
        els[0].click();
        return true;
      })()`);
      if (!ok) console.log(`  ! ${largeur}px ${etape.nom} : rien à cliquer pour « ${etape.cliquer} »`);
    }
    if (etape.js) await js(etape.js);
    await attendre(etape.attente ?? 900);
    const r = await cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SORTIE, `${etape.nom}-${largeur}-${THEME}.png`), Buffer.from(r.result.data, "base64"));
    console.log(`✓ ${etape.nom} ${largeur}`);
  }
}
ws.close();
edge.kill();
process.exit(0);
