"use client";

import { useEffect } from "react";

// ============================================================
// Les petites animations de l'accueil « carnet » (01/11/2026), reprises du
// script de la vitrine expérience (compyo.js) : chaque écran de téléphone
// est écrit dans son état final, lisible sans script ; si le mouvement est
// accepté, on le remet au début et on le joue quand il arrive à l'écran.
// Un message qui devient une fiche, un doigt qui transfère, un devis dont
// les prix se tapent, un message qui part du téléphone de l'artisan.
// ============================================================

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
const euros = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, " ") + " €";
const tous = (s: string, r: ParentNode) => Array.from(r.querySelectorAll<HTMLElement>(s));
const un = (s: string, r: ParentNode) => r.querySelector<HTMLElement>(s);

function quandVisible(el: Element, fn: () => void, seuil = 0.35): () => void {
  if (!("IntersectionObserver" in window)) {
    fn();
    return () => {};
  }
  const obs = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((en) => {
        if (en.isIntersecting) {
          obs.disconnect();
          fn();
        }
      });
    },
    { threshold: seuil }
  );
  obs.observe(el);
  return () => obs.disconnect();
}

function doigtDepart(doigt: HTMLElement, conteneur: HTMLElement) {
  doigt.style.left = `${conteneur.clientWidth / 2 - 22}px`;
  doigt.style.top = `${conteneur.clientHeight - 30}px`;
}
async function appuyer(doigt: HTMLElement, cible: HTMLElement, conteneur: HTMLElement) {
  const rc = conteneur.getBoundingClientRect();
  const rt = cible.getBoundingClientRect();
  doigt.classList.remove("masque");
  doigt.style.left = `${rt.left - rc.left + rt.width / 2 - 22}px`;
  doigt.style.top = `${rt.top - rc.top + rt.height / 2 - 22}px`;
  await attendre(800);
  doigt.classList.add("appui");
  cible.classList.add("appuye", "touche");
  await attendre(220);
  doigt.classList.remove("appui");
}

type Anim = { preparer: (el: HTMLElement) => void; jouer: (el: HTMLElement, vivant: () => boolean) => Promise<void> };

const ANIMATIONS: Record<string, Anim> = {
  morph: {
    preparer(el) {
      un(".bulle-source", el)?.classList.remove("rangee");
      un(".fiche", el)?.classList.add("cache-zoom");
      tous(".champ", el).forEach((c) => c.classList.add("cache-bas"));
    },
    async jouer(el, vivant) {
      await attendre(900);
      if (!vivant()) return;
      un(".bulle-source", el)?.classList.add("rangee");
      await attendre(250);
      if (!vivant()) return;
      un(".fiche", el)?.classList.remove("cache-zoom");
      for (const c of tous(".champ", el)) {
        await attendre(200);
        if (!vivant()) return;
        c.classList.remove("cache-bas");
      }
    },
  },
  partage: {
    preparer(el) {
      un(".partage-feuille", el)?.classList.add("feuille-basse");
      un(".voile", el)?.classList.add("masque");
      un(".app-compyo", el)?.classList.remove("touche");
      const doigt = un(".doigt", el);
      const app = un(".tel-app", el);
      if (doigt && app) {
        doigt.classList.add("masque");
        doigtDepart(doigt, app);
      }
    },
    async jouer(el, vivant) {
      const app = un(".tel-app", el);
      const doigt = un(".doigt", el);
      const cible = un(".app-compyo .app-rond", el);
      await attendre(500);
      if (!vivant()) return;
      un(".voile", el)?.classList.remove("masque");
      un(".partage-feuille", el)?.classList.remove("feuille-basse");
      await attendre(700);
      if (!vivant() || !app || !doigt || !cible) return;
      await appuyer(doigt, cible, app);
      un(".app-compyo", el)?.classList.add("touche");
      await attendre(500);
      doigt.classList.add("masque");
    },
  },
  envoi: {
    preparer(el) {
      const bulle = un(".message-pret", el);
      bulle?.classList.remove("envoye");
      bulle?.classList.add("brouillon");
      const etat = un(".etat-message", el);
      if (etat) etat.textContent = "Préparé par Compyo · à envoyer";
      un(".toast", el)?.classList.add("masque");
      tous(".tel-bouton", el).forEach((b) => b.classList.remove("appuye"));
      const doigt = un(".doigt", el);
      const app = un(".tel-app", el);
      if (doigt && app) {
        doigt.classList.add("masque");
        doigtDepart(doigt, app);
      }
    },
    async jouer(el, vivant) {
      await attendre(900);
      if (!vivant()) return;
      const doigt = un(".doigt", el);
      const bouton = un(".tel-bouton.fort", el);
      const app = un(".tel-app", el);
      if (!doigt || !bouton || !app) return;
      await appuyer(doigt, bouton, app);
      if (!vivant()) return;
      const bulle = un(".message-pret", el);
      bulle?.classList.remove("brouillon");
      bulle?.classList.add("envoye");
      const etat = un(".etat-message", el);
      if (etat) etat.textContent = "Envoyé par vous · 10:42";
      un(".toast", el)?.classList.remove("masque");
      await attendre(500);
      doigt.classList.add("masque");
      bouton.classList.remove("appuye");
      await attendre(1800);
      un(".toast", el)?.classList.add("masque");
    },
  },
  devis: {
    preparer(el) {
      tous(".devis-ligne", el).forEach((l) => l.classList.add("cache-bas"));
      tous(".prix[data-v]", el).forEach((p) => {
        p.textContent = "à fixer";
        p.classList.add("vide");
        p.classList.remove("saisie");
      });
      tous("[data-total]", el).forEach((t) => {
        t.textContent = "—";
      });
      un(".tampon", el)?.classList.add("cache-zoom");
    },
    async jouer(el, vivant) {
      const devis = un(".devis", el);
      const taux = parseFloat(devis?.dataset.taux || "0");
      for (const l of tous(".devis-ligne", el)) {
        await attendre(260);
        if (!vivant()) return;
        l.classList.remove("cache-bas");
      }
      await attendre(600);
      let ht = 0;
      for (const p of tous(".prix[data-v]", el)) {
        const valeur = parseFloat(p.dataset.v ?? "0");
        const texte = valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2 });
        p.classList.remove("vide");
        p.classList.add("saisie");
        for (let i = 1; i <= texte.length; i++) {
          if (!vivant()) return;
          p.textContent = texte.slice(0, i);
          await attendre(70);
        }
        p.textContent = euros(valeur);
        // Le calcul est fixe : somme des lignes, TVA au taux choisi, total.
        ht = Math.round((ht + valeur) * 100) / 100;
        const tva = Math.round(ht * taux * 100) / 100;
        const totaux: Record<string, number> = { ht, tva, ttc: Math.round((ht + tva) * 100) / 100 };
        tous("[data-total]", el).forEach((t) => {
          t.textContent = euros(totaux[t.dataset.total ?? "ht"]);
        });
        await attendre(250);
      }
      await attendre(450);
      if (!vivant()) return;
      const valider = un(".tel-bouton.fort", el);
      if (valider) {
        valider.classList.add("appuye");
        await attendre(260);
        valider.classList.remove("appuye");
      }
      un(".tampon", el)?.classList.remove("cache-zoom");
    },
  },
  soir: {
    preparer(el) {
      tous(".a-relire", el).forEach((n) => n.classList.add("cache-bas"));
    },
    async jouer(el, vivant) {
      for (const n of tous(".a-relire", el)) {
        await attendre(380);
        if (!vivant()) return;
        n.classList.remove("cache-bas");
      }
    },
  },
};

export function AnimationsCarnet({ racine }: { racine: string }) {
  useEffect(() => {
    const zone = document.getElementById(racine);
    if (!zone) return;
    const nettoyages: Array<() => void> = [];
    const mouvement = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    zone.classList.add("js");

    // En-tête : un trait quand on défile.
    const entete = un(".entete", zone);
    if (entete) {
      const maj = () => entete.classList.toggle("defile", window.scrollY > 8);
      window.addEventListener("scroll", maj, { passive: true });
      maj();
      nettoyages.push(() => window.removeEventListener("scroll", maj));
    }

    // Le cordeau qui claque, les coches au crayon.
    tous(".trait, .coches", zone).forEach((el) => nettoyages.push(quandVisible(el, () => el.classList.add("vu"), 0.5)));

    if (mouvement) {
      // Les aiguilles des horloges tournent jusqu'à l'heure.
      tous(".horloge", zone).forEach((h) => {
        h.classList.add("a-zero");
        nettoyages.push(quandVisible(h, () => setTimeout(() => h.classList.remove("a-zero"), 150), 0.8));
      });
      // Les écrans de téléphone.
      tous("[data-anim]", zone).forEach((el) => {
        const anim = ANIMATIONS[el.dataset.anim ?? ""];
        if (!anim) return;
        let jeton = 0;
        let actif = true;
        // Une animation qui se répète s'arrête après 3 tours (WCAG 2.2.2).
        let tours = 0;
        const lancer = async () => {
          const moi = ++jeton;
          const vivant = () => actif && moi === jeton;
          anim.preparer(el);
          await attendre(60);
          await anim.jouer(el, vivant);
          tours += 1;
          if (el.hasAttribute("data-boucle") && vivant() && tours < 3) {
            await attendre(2800);
            if (vivant()) void lancer();
          }
        };
        anim.preparer(el);
        nettoyages.push(quandVisible(el, () => void lancer(), 0.45));
        nettoyages.push(() => {
          actif = false;
        });
      });
    }
    return () => nettoyages.forEach((n) => n());
  }, [racine]);
  return null;
}
