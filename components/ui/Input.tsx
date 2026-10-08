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
const CLASSE_CHAMP =
  "min-h-12 w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-base text-ink placeholder:text-steel transition-colors focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/15";
const CLASSE_LIBELLE = "mb-1.5 block text-sm text-steel";

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
        {label} {required && <span className="text-signal">*</span>}
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
        {label} {required && <span className="text-signal">*</span>}
      </label>
      <textarea id={idChamp} required={required} className={`${CLASSE_CHAMP} resize-none`} {...props} />
    </div>
  );
}
