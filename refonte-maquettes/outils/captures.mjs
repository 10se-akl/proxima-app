// Captures d'écran sans dépendance : Edge en mode headless, piloté par le
// protocole DevTools (WebSocket natif de Node ≥ 22).
//
//   node refonte-maquettes/outils/captures.mjs <dossier-sortie> <liste.json>
//
// liste.json : [{ "nom": "accueil-charge", "url": "http://localhost:3000/apercu-moins?ecran=accueil-charge" }, ...]
// Une URL en file:/// fonctionne aussi (maquettes statiques).
// Produit <nom>-<largeur>-<clair|sombre>.png pour 360, 390 et 1440 px.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [, , sortie, fichierListe, largeursArg] = process.argv;
const LARGEURS = largeursArg ? largeursArg.split(",").map(Number) : [360, 390, 1440];
const liste = JSON.parse(readFileSync(fichierListe, "utf8"));
mkdirSync(sortie, { recursive: true });

const PORT = 9333;
const profil = join(tmpdir(), "compyo-captures-" + Date.now());
const edge = spawn(EDGE, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profil}`,
  "--no-first-run",
  "--hide-scrollbars",
  "about:blank",
]);

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function cible() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const pages = await r.json();
      const p = pages.find((x) => x.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await attendre(300);
  }
  throw new Error("Edge ne répond pas");
}

const ws = new WebSocket(await cible());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const enAttente = new Map();
const evenements = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && enAttente.has(m.id)) {
    enAttente.get(m.id)(m);
    enAttente.delete(m.id);
  } else if (m.method) evenements.push(m.method);
});
const cdp = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    enAttente.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

async function charger(url) {
  evenements.length = 0;
  await cdp("Page.navigate", { url });
  for (let i = 0; i < 120 && !evenements.includes("Page.loadEventFired"); i++) await attendre(250);
  await attendre(1800); // hydratation React, polices, transitions
}

await cdp("Page.enable");
await cdp("Runtime.enable");

for (const { nom, url, pleinePage, largeurs, themes } of liste) {
  for (const theme of themes ?? ["clair", "sombre"]) {
    for (const largeur of largeurs ?? LARGEURS) {
      const mobile = largeur < 768;
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: largeur,
        height: mobile ? 780 : 900,
        deviceScaleFactor: mobile ? 2 : 1,
        mobile,
      });
      await cdp("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 });
      await cdp("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: theme === "sombre" ? "dark" : "light" }],
      });
      // L'application lit « compyo-mode-sombre » (app/layout.tsx) : "0" = clair.
      if (url.startsWith("http")) {
        await charger(new URL(url).origin + "/hors-ligne");
        await cdp("Runtime.evaluate", {
          expression: `localStorage.setItem("compyo-mode-sombre", "${theme === "sombre" ? "1" : "0"}");
                       localStorage.setItem("compyo-ne-pas-mesurer", "1"); true`,
        });
      }
      await charger(url);
      if (!url.startsWith("http")) {
        await cdp("Runtime.evaluate", {
          expression: `document.documentElement.classList.toggle("dark", ${theme === "sombre"}); true`,
        });
        await attendre(200);
      }
      let options = { format: "png", captureBeyondViewport: false };
      if (pleinePage) {
        // Maquettes : toute la page, plafonnée pour rester lisible par un agent.
        const { result: r } = await cdp("Runtime.evaluate", {
          expression: "JSON.stringify([document.documentElement.scrollWidth, document.documentElement.scrollHeight])",
        });
        const [w, h] = JSON.parse(r.result.value);
        options = { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: Math.min(h, 7000), scale: 1 } };
      }
      const { result } = await cdp("Page.captureScreenshot", options);
      if (!result?.data) {
        console.error("échec", nom, largeur, theme);
        continue;
      }
      const fichier = resolve(sortie, `${nom}-${largeur}-${theme}.png`);
      writeFileSync(fichier, Buffer.from(result.data, "base64"));
      console.log("✓", nom, largeur, theme);
    }
  }
}

ws.close();
edge.kill();
process.exit(0);
