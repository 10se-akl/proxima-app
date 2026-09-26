import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: ReactNode;
  required?: boolean;
};

// rounded-xl + anneau de focus coloré (au lieu d'un simple changement de
// couleur de bordure) — cohérent avec Button.tsx et Card.tsx repolis.
const CLASSE_CHAMP =
  "w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15";

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
      <label htmlFor={idChamp} className="block text-xs font-medium text-ink/70 mb-1.5">
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
      <label htmlFor={idChamp} className="block text-xs font-medium text-ink/70 mb-1.5">
        {label} {required && <span className="text-signal">*</span>}
      </label>
      <textarea id={idChamp} required={required} className={`${CLASSE_CHAMP} resize-none`} {...props} />
    </div>
  );
}
