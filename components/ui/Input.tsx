import { CHAMP, LIBELLE } from "@/components/ui/recettes";
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: ReactNode;
  required?: boolean;
};

// rounded-xl + anneau de focus coloré (au lieu d'un simple changement de
// couleur de bordure) — cohérent avec Button.tsx et Card.tsx repolis.
// 08/10 (passe de finition) — 16 px au lieu de 14 : sous 16 px, l'iPhone
// zoome toute la page dès qu'on touche le champ. 48 px de haut, le focus
// en encre (règle 18), le libellé en acier sans opacité (règle 4).
// Design v3 (24/10) : les recettes CHAMP (surface blanche, contour fin,
// rayon 14, focus à l'encre) et LIBELLE (15 px, à l'encre, au-dessus).
const CLASSE_CHAMP = `${CHAMP} py-3`;
const CLASSE_LIBELLE = LIBELLE;

// 27/09 — Le libellé est relié à son champ (htmlFor / id) : toucher
// « Téléphone » place le curseur dans le champ, et un lecteur d'écran
// annonce le bon libellé. Avant, les deux n'étaient reliés nulle part.
// Un `id` passé par l'appelant reste prioritaire. N'est importé que par
// des composants navigateur (« use client »).

export function Field({
  label,
  required,
  id,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  return (
    <div>
      <label htmlFor={idChamp} className={CLASSE_LIBELLE}>
        {label} {required && <span className="text-signal-fonce">*</span>}
      </label>
      <input id={idChamp} required={required} className={CLASSE_CHAMP} {...props} />
    </div>
  );
}

export function TextareaField({
  label,
  required,
  id,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const idAuto = useId();
  const idChamp = id ?? idAuto;
  return (
    <div>
      <label htmlFor={idChamp} className={CLASSE_LIBELLE}>
        {label} {required && <span className="text-signal-fonce">*</span>}
      </label>
      <textarea id={idChamp} required={required} className={`${CLASSE_CHAMP} min-h-[6rem] resize-none leading-relaxed`} {...props} />
    </div>
  );
}
