export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-ink/10 ${className}`}>
      {children}
    </div>
  );
}
