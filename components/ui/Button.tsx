import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-signal text-white hover:bg-[#c15815]",
  secondary: "bg-ink text-paper hover:bg-[#D9631A]",
  ghost: "bg-transparent text-ink hover:bg-ink/5 border border-ink/15",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
