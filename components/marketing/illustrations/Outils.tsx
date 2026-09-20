// ============================================================
// Vocabulaire d'illustrations métier (20/09).
//
// Des dessins au trait, pas des pictogrammes : assez grands et assez
// détaillés pour être regardés, dans l'esprit d'un plan d'atelier — trait
// fin, cotes, traits d'axe, repères. Le site n'avait aucune image ; des
// photos de banque d'images auraient tout de suite sonné faux pour un
// artisan qui reconnaît un vrai chantier au premier coup d'œil. Un dessin,
// lui, ne ment pas : il dit "c'est un dessin".
//
// Règles communes à tous :
//   - viewBox 0 0 200 200, affiché entre 200 et 400 px ;
//   - `stroke="currentColor"`, donc la couleur vient du texte parent
//     (token `ink` / `steel`) et suit le mode sombre sans rien faire ;
//   - l'accent terracotta est porté par un <g className="text-signal">,
//     jamais plus de deux ou trois traits par dessin — c'est un accent,
//     pas un coloriage ;
//   - aucune épaisseur en dur autre que celles définies ici, pour que la
//     famille reste cohérente d'un dessin à l'autre.
// ============================================================

type ProprietesDessin = {
  className?: string;
  /** Décrit le dessin pour les lecteurs d'écran. Sans titre, le dessin est
   *  purement décoratif et disparaît de l'arbre d'accessibilité. */
  titre?: string;
};

function Cadre({
  titre,
  className = "",
  children,
}: ProprietesDessin & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titre ? "img" : undefined}
      aria-hidden={titre ? undefined : true}
    >
      {titre && <title>{titre}</title>}
      {children}
    </svg>
  );
}

// Traits d'axe et repères de cote, communs au vocabulaire : c'est ce
// détail-là qui fait lire "plan" plutôt que "icône".
function Cote({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const vertical = x1 === x2;
  return (
    <g strokeWidth={0.8} opacity={0.5}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="none" />
      {vertical ? (
        <>
          <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} />
          <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} />
          <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} />
        </>
      )}
    </g>
  );
}

function Axe({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={0.7}
      strokeDasharray="10 4 2 4"
      opacity={0.35}
    />
  );
}

export function Truelle(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      <Axe x1={100} y1={18} x2={100} y2={186} />
      {/* La lame, en triangle adouci */}
      <path d="M100 42 L154 104 Q100 150 46 104 Z" />
      <path d="M100 52 L143 104 Q100 138 57 104 Z" strokeWidth={0.8} opacity={0.45} />
      {/* La soie et la douille */}
      <path d="M100 42 L100 30" />
      <path d="M92 30 L108 30 L106 20 L94 20 Z" />
      <g className="text-signal">
        {/* Le manche : le seul élément coloré */}
        <path d="M94 20 L94 4 Q100 -2 106 4 L106 20" strokeWidth={2.2} />
      </g>
      <Cote x1={46} y1={168} x2={154} y2={168} />
      <g strokeWidth={0.8} opacity={0.45}>
        <line x1={46} y1={104} x2={46} y2={168} />
        <line x1={154} y1={104} x2={154} y2={168} />
      </g>
    </Cadre>
  );
}

export function NiveauABulle(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      <Axe x1={14} y1={100} x2={186} y2={100} />
      <rect x="18" y="78" width="164" height="44" rx="6" />
      <rect x="26" y="86" width="148" height="28" rx="4" strokeWidth={0.8} opacity={0.4} />
      {/* La fiole centrale */}
      <rect x="78" y="88" width="44" height="24" rx="12" />
      <line x1={92} y1={88} x2={92} y2={112} strokeWidth={0.8} opacity={0.6} />
      <line x1={108} y1={88} x2={108} y2={112} strokeWidth={0.8} opacity={0.6} />
      <g className="text-signal">
        {/* La bulle, pile entre les deux repères : le niveau est bon */}
        <circle cx="100" cy="100" r="7" strokeWidth={2} />
      </g>
      {/* Les deux fioles d'extrémité, de biais comme sur un vrai niveau */}
      <rect x="36" y="90" width="26" height="20" rx="10" strokeWidth={0.9} opacity={0.6} />
      <rect x="138" y="90" width="26" height="20" rx="10" strokeWidth={0.9} opacity={0.6} />
      <Cote x1={18} y1={140} x2={182} y2={140} />
    </Cadre>
  );
}

export function Tuile(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      {/* Trois tuiles canal qui se recouvrent, vues de trois quarts */}
      <path d="M30 128 Q46 96 62 128 L62 168 Q46 178 30 168 Z" />
      <path d="M72 116 Q88 84 104 116 L104 156 Q88 166 72 156 Z" />
      <path d="M114 104 Q130 72 146 104 L146 144 Q130 154 114 144 Z" />
      {/* Les lignes de recouvrement */}
      <path d="M62 128 Q68 122 72 116" strokeWidth={0.8} opacity={0.5} />
      <path d="M104 116 Q110 110 114 104" strokeWidth={0.8} opacity={0.5} />
      <g className="text-signal">
        {/* La ligne de pente, ce qui compte vraiment sur un toit */}
        <path d="M24 140 L154 84" strokeWidth={2} />
        <path d="M146 84 L154 84 L154 92" strokeWidth={2} />
      </g>
      <Axe x1={24} y1={176} x2={176} y2={176} />
      <Cote x1={30} y1={190} x2={146} y2={190} />
    </Cadre>
  );
}

export function Equerre(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      <path d="M36 32 L36 168 L172 168" strokeWidth={2} />
      <path d="M48 44 L48 156 L160 156" />
      {/* Graduations le long du bras horizontal */}
      <g strokeWidth={0.8} opacity={0.55}>
        {[62, 76, 90, 104, 118, 132, 146].map((x) => (
          <line key={x} x1={x} y1={156} x2={x} y2={x % 28 === 62 % 28 ? 142 : 148} />
        ))}
      </g>
      {/* L'angle droit, marqué comme sur un plan */}
      <path d="M36 152 L52 152 L52 168" strokeWidth={0.9} opacity={0.6} />
      <g className="text-signal">
        <path d="M36 32 L172 168" strokeWidth={1.8} strokeDasharray="6 5" />
        <circle cx="36" cy="168" r="4" strokeWidth={2} />
      </g>
    </Cadre>
  );
}

export function Rouleau(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      <Axe x1={100} y1={14} x2={100} y2={120} />
      {/* Le manchon */}
      <rect x="44" y="36" width="112" height="46" rx="10" />
      <path d="M44 59 L156 59" strokeWidth={0.8} opacity={0.35} />
      {/* Le bâti en fil de fer */}
      <path d="M100 82 L100 104 L84 104" />
      <path d="M84 104 L84 130" />
      <path d="M76 130 L92 130 L92 176 L76 176 Z" />
      <g className="text-signal">
        {/* La trace fraîche laissée sur le mur */}
        <path d="M44 100 Q60 108 44 116 Q60 124 44 132" strokeWidth={2} opacity={0.9} />
        <path d="M156 100 Q140 108 156 116 Q140 124 156 132" strokeWidth={2} opacity={0.9} />
      </g>
      <Cote x1={44} y1={22} x2={156} y2={22} />
    </Cadre>
  );
}

export function MetreRuban(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      {/* Le boîtier */}
      <rect x="30" y="96" width="86" height="72" rx="12" />
      <circle cx="73" cy="132" r="22" strokeWidth={0.9} opacity={0.5} />
      <circle cx="73" cy="132" r="6" />
      {/* Le ruban qui sort et se courbe */}
      <path d="M116 112 Q150 104 164 62 Q170 42 158 32" strokeWidth={2} />
      <path d="M116 126 Q156 118 172 68 Q180 44 164 30" strokeWidth={0.9} opacity={0.5} />
      {/* Les graduations sur le ruban */}
      <g strokeWidth={0.8} opacity={0.6}>
        <line x1={131} y1={108} x2={134} y2={118} />
        <line x1={146} y1={96} x2={151} y2={104} />
        <line x1={157} y1={78} x2={164} y2={82} />
        <line x1={163} y1={56} x2={171} y2={58} />
      </g>
      <g className="text-signal">
        {/* Le crochet de bout, celui qui se pose sur l'arête */}
        <path d="M158 32 L146 26 L152 40" strokeWidth={2.2} />
      </g>
      <Cote x1={30} y1={182} x2={116} y2={182} />
    </Cadre>
  );
}

export function CleAMolette(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      <Axe x1={46} y1={154} x2={154} y2={46} />
      {/* Le manche */}
      <path d="M58 166 L44 152 L112 84 L126 98 Z" />
      {/* La tête et le mors mobile */}
      <path d="M126 98 L112 84 L134 62 L120 48 L146 22 L178 54 L152 80 L138 66 Z" />
      <path d="M138 66 L152 80" strokeWidth={0.8} opacity={0.45} />
      <g className="text-signal">
        {/* La molette de réglage */}
        <path d="M108 96 L124 112" strokeWidth={2.4} />
        <path d="M100 104 L116 120" strokeWidth={2.4} />
      </g>
      {/* Le boulon qu'on serre, au bout */}
      <path d="M150 44 L160 38 L170 44 L170 56 L160 62 L150 56 Z" strokeWidth={0.9} opacity={0.55} />
    </Cadre>
  );
}

export function Prise(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      <rect x="40" y="40" width="120" height="120" rx="16" />
      <rect x="52" y="52" width="96" height="96" rx="10" strokeWidth={0.8} opacity={0.4} />
      <circle cx="100" cy="100" r="34" />
      {/* Les deux alvéoles et la broche de terre */}
      <circle cx="86" cy="94" r="5" strokeWidth={2} />
      <circle cx="114" cy="94" r="5" strokeWidth={2} />
      <g className="text-signal">
        <path d="M100 118 L100 132" strokeWidth={2.4} />
        <path d="M92 132 L108 132" strokeWidth={2.4} />
      </g>
      {/* Les repères de perçage, comme sur une notice de pose */}
      <Axe x1={100} y1={24} x2={100} y2={176} />
      <Axe x1={24} y1={100} x2={176} y2={100} />
      <Cote x1={40} y1={182} x2={160} y2={182} />
    </Cadre>
  );
}

export function Carreau(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      {/* Quatre carreaux et le joint, vus de dessus */}
      <rect x="28" y="28" width="68" height="68" rx="3" />
      <rect x="104" y="28" width="68" height="68" rx="3" />
      <rect x="28" y="104" width="68" height="68" rx="3" />
      <rect x="104" y="104" width="68" height="68" rx="3" />
      <g strokeWidth={0.8} opacity={0.35}>
        <rect x="36" y="36" width="52" height="52" rx="2" />
        <rect x="112" y="36" width="52" height="52" rx="2" />
        <rect x="36" y="112" width="52" height="52" rx="2" />
        <rect x="112" y="112" width="52" height="52" rx="2" />
      </g>
      <g className="text-signal">
        {/* La croisette de joint, au croisement */}
        <path d="M100 92 L100 108" strokeWidth={2.4} />
        <path d="M92 100 L108 100" strokeWidth={2.4} />
      </g>
      <Cote x1={28} y1={186} x2={96} y2={186} />
    </Cadre>
  );
}

export function Serrure(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      {/* La rosace et le cylindre */}
      <circle cx="100" cy="82" r="42" />
      <circle cx="100" cy="82" r="30" strokeWidth={0.8} opacity={0.4} />
      <circle cx="100" cy="82" r="13" />
      <path d="M94 92 L106 92 L110 138 L90 138 Z" />
      <g className="text-signal">
        {/* Le pêne sorti : la porte est fermée */}
        <path d="M142 82 L176 82" strokeWidth={2.6} />
        <path d="M168 74 L176 82 L168 90" strokeWidth={2.2} />
      </g>
      {/* La gâche en vis-à-vis */}
      <path d="M182 60 L190 60 L190 104 L182 104" strokeWidth={0.9} opacity={0.55} />
      <Axe x1={100} y1={18} x2={100} y2={182} />
    </Cadre>
  );
}

export function Escabeau(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      {/* Les deux montants */}
      <path d="M72 28 L44 172" strokeWidth={1.8} />
      <path d="M96 28 L116 172" strokeWidth={1.8} />
      {/* Les marches */}
      <g>
        <path d="M67 56 L100 56" />
        <path d="M61 88 L105 88" />
        <path d="M55 120 L110 120" />
        <path d="M49 152 L115 152" />
      </g>
      {/* Le jambage arrière, plus clair */}
      <path d="M96 30 L150 168" strokeWidth={0.9} opacity={0.45} />
      <path d="M116 100 L136 100" strokeWidth={0.8} opacity={0.4} />
      <g className="text-signal">
        {/* La plateforme du haut */}
        <path d="M64 28 L104 28" strokeWidth={2.6} />
      </g>
      <Axe x1={30} y1={176} x2={170} y2={176} />
    </Cadre>
  );
}

export function Bache(p: ProprietesDessin) {
  return (
    <Cadre {...p}>
      {/* Le bassin, vu en perspective cavalière */}
      <path d="M28 96 L100 62 L172 96 L100 130 Z" />
      <path d="M28 96 L28 128 L100 162 L172 128 L172 96" />
      <path d="M100 130 L100 162" strokeWidth={0.8} opacity={0.4} />
      {/* La bâche à moitié déroulée, en plis */}
      <path d="M46 88 Q64 80 82 88 Q100 96 118 88" strokeWidth={1.2} opacity={0.75} />
      <path d="M52 98 Q70 90 88 98 Q106 106 124 98" strokeWidth={1.2} opacity={0.55} />
      <g className="text-signal">
        {/* L'enrouleur, au bord */}
        <path d="M150 74 L176 62" strokeWidth={2.4} />
        <circle cx="150" cy="74" r="5" strokeWidth={2} />
        <circle cx="176" cy="62" r="5" strokeWidth={2} />
      </g>
      <Cote x1={28} y1={178} x2={172} y2={178} />
    </Cadre>
  );
}

// ============================================================
// Quel dessin pour quel métier. Clés identiques aux identifiants de
// components/marketing/metiers/exemplesMetiers.ts — un métier sans entrée
// ici retombe sur le mètre ruban, l'outil que tout le monde a dans la
// poche.
// ============================================================
export const DESSINS_METIER: Record<string, (p: ProprietesDessin) => JSX.Element> = {
  macon: Truelle,
  terrassier: Truelle,
  facadier: Escabeau,
  plombier: CleAMolette,
  chauffagiste: CleAMolette,
  climaticien: Prise,
  electricien: Prise,
  serrurier: Serrure,
  vitrier: Carreau,
  couvreur: Tuile,
  charpentier: Equerre,
  menuisier: Equerre,
  plaquiste: NiveauABulle,
  peintre: Rouleau,
  carreleur: Carreau,
  paysagiste: Bache,
  pisciniste: Bache,
  renovation: MetreRuban,
};

export function DessinMetier({
  id,
  className,
  titre,
}: {
  id: string;
  className?: string;
  titre?: string;
}) {
  const Dessin = DESSINS_METIER[id] ?? MetreRuban;
  return <Dessin className={className} titre={titre} />;
}
