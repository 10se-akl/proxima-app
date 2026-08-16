import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  required?: boolean;
};

// rounded-xl + anneau de focus coloré (au lieu d'un simple changement de
// couleur de bordure) — cohérent avec Button.tsx et Card.tsx repolis.
const CLASSE_CHAMP =
  "w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15";

export function Field({
  label,
  required,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1.5">
        {label} {required && <span className="text-signal">*</span>}
      </label>
      <input required={required} className={CLASSE_CHAMP} {...props} />
    </div>
  );
}

export function TextareaField({
  label,
  required,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1.5">
        {label} {required && <span className="text-signal">*</span>}
      </label>
      <textarea required={required} className={`${CLASSE_CHAMP} resize-none`} {...props} />
    </div>
  );
}
