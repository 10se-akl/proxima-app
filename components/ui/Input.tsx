import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  required?: boolean;
};

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
      <input
        required={required}
        className="w-full border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
        {...props}
      />
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
      <textarea
        required={required}
        className="w-full border border-ink/15 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink resize-none"
        {...props}
      />
    </div>
  );
}
