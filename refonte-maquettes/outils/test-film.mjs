// Teste le film de la vitrine dans Edge sans fenêtre (le panneau navigateur
// de l'app Claude ne dessine pas d'images) : se lance-t-il seul en arrivant
// à l'écran ? Pause, reprise, fin, « Revoir ».
//   node refonte-maquettes/outils/test-film.mjs <dossier-captures> [largeur]
// Serveur de dev lancé sur le port 3000.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SORTIE = process.argv[2];
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9334;
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), "compyo-film-" + Date.now())}`, "--no-first-run", "--hide-scrollbars", "about:blank"]);
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let url;
for (let i = 0; i < 50 && !url; i++) {
  try {
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page");
    url = p?.webSocketDebuggerUrl;
  } catch {}
  if (!url) await attendre(300);
}
const ws = new WebSocket(url);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const att = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && att.has(m.id)) { att.get(m.id)(m); att.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; att.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const capture = async (nom) => {
  const r = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(SORTIE, nom), Buffer.from(r.result.data, "base64"));
};

const largeur = Number(process.argv[3] || 1280);
const hauteur = largeur < 600 ? 780 : 900;
await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: largeur < 600 });
await cdp("Page.navigate", { url: "http://localhost:3000/" });
await attendre(6000);
const lire = `(() => { const s = document.querySelector('section[aria-label="Compyo en seize secondes"]'); return { bouton: s.querySelector('button').textContent.trim(), temps: s.querySelector('.font-mono span').textContent }; })()`;
const res = {};
res.depart = await js(lire);
res.deuxSoirees = await js(`document.body.innerText.includes("Deux soirées")`);
res.hauteurSection = await js(`document.querySelector('section[aria-label="Compyo en seize secondes"]').offsetHeight`);
await js(`document.documentElement.style.scrollBehavior='auto'; document.querySelector('section[aria-label="Compyo en seize secondes"]').scrollIntoView({block:'center'}); true`);
await attendre(4000);
res.apres4s = await js(lire);
await capture(`film-${largeur}-lecture.png`);
await js(`window.scrollTo(0, 0); true`);
await attendre(2500);
res.horsEcran = await js(lire);
await js(`document.querySelector('section[aria-label="Compyo en seize secondes"]').scrollIntoView({block:'center'}); true`);
await attendre(2000);
res.revenu = await js(lire);
await js(`document.querySelector('section[aria-label="Compyo en seize secondes"] button').click(); true`);
await attendre(1500);
res.pauseVisiteur = await js(lire);
await js(`window.scrollTo(0, 0); true`);
await attendre(800);
await js(`document.querySelector('section[aria-label="Compyo en seize secondes"]').scrollIntoView({block:'center'}); true`);
await attendre(1500);
res.pauseRestee = await js(lire);
await capture(`film-${largeur}-pause.png`);
await js(`document.querySelector('section[aria-label="Compyo en seize secondes"] button').click(); true`);
await attendre(14000);
res.fin = await js(lire);
await capture(`film-${largeur}-fin.png`);
await js(`document.querySelector('section[aria-label="Compyo en seize secondes"] button').click(); true`);
await attendre(1500);
res.revoir = await js(lire);
console.log(JSON.stringify(res, null, 1));
ws.close();
edge.kill();
process.exit(0);
