"use client";

import { useEffect, useRef } from "react";

// ============================================================
// Le nuage de particules de l'en-tête de la vitrine (27/09, demande
// d'Axel, d'après son export « Particles Swarm »).
//
// Adapté plutôt que copié :
//   - tout le calcul se fait sur la carte graphique (un shader) : l'export
//     recalculait 20 000 particules en JavaScript à chaque image, avec un
//     effet de lueur par-dessus — de quoi faire saccader et chauffer un
//     téléphone d'entrée de gamme. Ici, le processeur ne fait rien ;
//   - aux couleurs de Compyo (terracotta, ambre, crème) au lieu de
//     l'arc-en-ciel ;
//   - moins de particules sur téléphone, en pause quand l'en-tête n'est
//     plus à l'écran ou l'onglet caché, une seule image fixe si
//     « réduire les animations » est activé ;
//   - three.js n'est chargé qu'une fois la page affichée : il ne retarde
//     jamais le titre ni le bouton d'inscription.
// Pas de WebGL : rien ne s'affiche, l'en-tête reste celui d'avant.
// ============================================================

const SOMMETS = /* glsl */ `
  precision highp float;
  attribute float aIndex;
  attribute vec3 aDepart;
  uniform float uTemps;
  uniform float uNombre;
  uniform float uRayon;
  uniform float uArrivee;
  uniform float uTaille;
  uniform float uSombre;
  varying vec3 vCouleur;
  varying float vAlpha;

  vec3 teinte(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    const float PI = 3.14159265;
    float i = aIndex + 0.5;
    // Répartition régulière sur une sphère (angle d'or), tirée vers huit
    // lobes : la forme de l'export d'origine.
    float phi = acos(clamp(1.0 - 2.0 * i / uNombre, -1.0, 1.0));
    float theta = PI * (3.0 - sqrt(5.0)) * i;
    vec3 dir = vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
    float region = mod(aIndex, 8.0);
    float angleLobe = region / 8.0 * 2.0 * PI;
    vec3 lobe = vec3(cos(angleLobe), cos(region * PI), sin(angleLobe));
    vec3 n = normalize(vec3(dir.x * 0.65 + lobe.x * 0.35, dir.y * 0.65 + lobe.y * 0.21, dir.z * 0.65 + lobe.z * 0.35));

    // Les plis de surface, qui ondulent lentement. La phase est ramenée
    // sous 2π avant d'ajouter le temps : sinon, en précision simple, le
    // mouvement avancerait par à-coups.
    float phase = mod(phi * 14.0 + theta * 4.0, 2.0 * PI);
    float pli = sin(phase + uTemps * 0.15) * 0.5;
    float rayon = uRayon * (1.0 + pli * 0.3);
    vec3 surface = n * vec3(1.15, 0.95, 1.0) * rayon + vec3(sign(n.x + 0.0001) * 0.06 * uRayon, 0.0, 0.0);

    // Un cœur en spirale pour l'une des huit régions.
    float coeur = exp(-pow(region - 2.0, 2.0) * 1.5);
    float angleSpirale = mod(aIndex * 0.15, 2.0 * PI);
    float rayonSpirale = mod(aIndex, 400.0) * 0.05 + 2.0;
    vec3 spirale = vec3(cos(angleSpirale) * rayonSpirale, sin(uTemps * 0.5 + mod(aIndex * 0.01, 2.0 * PI)) * uRayon * 0.15, sin(angleSpirale) * rayonSpirale);
    vec3 p = mix(surface, spirale, coeur);

    float a = uTemps * 0.1;
    p = vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a));

    // L'arrivée : les particules partent d'un nuage épars et se rassemblent.
    float e = 1.0 - pow(1.0 - uArrivee, 3.0);
    vec3 position = mix(aDepart, p, e);

    // Les « influx » qui traversent la forme, en ondes lentes.
    float influx = pow(max(0.0, sin(length(p) * 0.35 - uTemps * 0.5 + region * 0.8)), 6.0);
    // Terracotta vers ambre ; un influx éclaire vers le crème.
    float h = 0.035 + region / 8.0 * 0.06;
    float s = mix(0.62, 0.5, influx);
    float l = uSombre > 0.5 ? 0.5 + influx * 0.35 + coeur * 0.08 : 0.4 + influx * 0.1;
    vCouleur = teinte(vec3(h, s, l));
    vAlpha = (uSombre > 0.5 ? 0.75 + influx * 0.25 : 0.55 + influx * 0.35) * e;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uTaille * (170.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENTS = /* glsl */ `
  precision mediump float;
  varying vec3 vCouleur;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // Un cœur plein et un halo doux : la lueur de l'export, sans le coût
    // d'un post-traitement.
    float halo = exp(-d * d * 18.0);
    gl_FragColor = vec4(vCouleur, vAlpha * halo);
  }
`;

const DUREE_ARRIVEE_S = 2.6;

export function FondParticules({ className = "" }: { className?: string }) {
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conteneur = zone.current;
    if (!conteneur) return;
    let arrete = false;
    let nettoyer = () => {};

    // Après l'affichage de la page : le titre et le bouton d'abord.
    const depart = window.setTimeout(async () => {
      const essai = document.createElement("canvas");
      if (!(essai.getContext("webgl2") || essai.getContext("webgl"))) return;

      const THREE = await import("three");
      if (arrete) return;

      const telephone = window.matchMedia("(max-width: 767px)").matches;
      const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Sur téléphone, l'en-tête est le ciel du soir (toujours sombre) ;
      // sur ordinateur, le mur clair — sauf en mode sombre.
      const sombre = telephone || document.documentElement.classList.contains("dark");
      const petit = telephone && (navigator.hardwareConcurrency ?? 4) <= 4;
      const nombre = telephone ? (petit ? 2500 : 4000) : 12000;

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telephone ? 1.5 : 2));
      renderer.setClearColor(0x000000, 0);
      const toile = renderer.domElement;
      toile.setAttribute("aria-hidden", "true");
      toile.className = "absolute inset-0 h-full w-full opacity-0 motion-safe:transition-opacity motion-safe:duration-1000";
      conteneur.appendChild(toile);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, 1, 1, 1000);
      camera.position.set(0, 0, 170);

      const index = new Float32Array(nombre);
      const departs = new Float32Array(nombre * 3);
      for (let i = 0; i < nombre; i++) {
        index[i] = i;
        departs[i * 3] = (Math.random() - 0.5) * 320;
        departs[i * 3 + 1] = (Math.random() - 0.5) * 320;
        departs[i * 3 + 2] = (Math.random() - 0.5) * 320;
      }
      const geometrie = new THREE.BufferGeometry();
      geometrie.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nombre * 3), 3));
      geometrie.setAttribute("aIndex", new THREE.BufferAttribute(index, 1));
      geometrie.setAttribute("aDepart", new THREE.BufferAttribute(departs, 3));

      const uniformes = {
        uTemps: { value: 0 },
        uNombre: { value: nombre },
        uRayon: { value: telephone ? 31 : 65 },
        uArrivee: { value: immobile ? 1 : 0 },
        uTaille: { value: telephone ? 3.4 : 3.6 },
        uSombre: { value: sombre ? 1 : 0 },
      };
      const materiau = new THREE.ShaderMaterial({
        uniforms: uniformes,
        vertexShader: SOMMETS,
        fragmentShader: FRAGMENTS,
        transparent: true,
        depthWrite: false,
        blending: sombre ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const nuage = new THREE.Points(geometrie, materiau);
      nuage.frustumCulled = false;
      // Téléphone : en haut, derrière le titre, dans le ciel du soir.
      // Ordinateur : au centre de l'en-tête (27/09, Axel : à droite, le
      // téléphone dessiné le cachait presque entièrement).
      nuage.position.set(telephone ? 8 : 0, telephone ? 30 : 0, 0);
      scene.add(nuage);

      const dimensionner = () => {
        const { width, height } = conteneur.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      dimensionner();
      const observateurTaille = new ResizeObserver(dimensionner);
      observateurTaille.observe(conteneur);

      // Un temps cumulé qui ignore les pauses : en revenant sur l'en-tête,
      // la forme reprend où elle en était, sans refaire son arrivée.
      const horloge = new THREE.Clock();
      let temps = 0;
      let visible = true;
      let boucle = 0;
      const dessiner = () => {
        temps += Math.min(horloge.getDelta(), 0.1);
        uniformes.uTemps.value = temps;
        if (!immobile) uniformes.uArrivee.value = Math.min(1, temps / DUREE_ARRIVEE_S);
        renderer.render(scene, camera);
      };
      const tourner = () => {
        dessiner();
        boucle = visible ? requestAnimationFrame(tourner) : 0;
      };

      if (immobile) {
        // Une seule image, la forme déjà en place : rien ne bouge.
        uniformes.uTemps.value = 12;
        renderer.render(scene, camera);
      } else {
        boucle = requestAnimationFrame(tourner);
      }
      requestAnimationFrame(() => toile.classList.replace("opacity-0", sombre ? "opacity-90" : "opacity-70"));

      // En pause dès que l'en-tête sort de l'écran.
      const observateurVue = new IntersectionObserver(([entree]) => {
        visible = entree.isIntersecting;
        if (visible && !immobile && !boucle) {
          horloge.getDelta();
          boucle = requestAnimationFrame(tourner);
        }
      });
      observateurVue.observe(conteneur);

      nettoyer = () => {
        cancelAnimationFrame(boucle);
        observateurTaille.disconnect();
        observateurVue.disconnect();
        geometrie.dispose();
        materiau.dispose();
        renderer.dispose();
        toile.remove();
      };
    }, 400);

    return () => {
      arrete = true;
      window.clearTimeout(depart);
      nettoyer();
    };
  }, []);

  return <div ref={zone} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} />;
}
