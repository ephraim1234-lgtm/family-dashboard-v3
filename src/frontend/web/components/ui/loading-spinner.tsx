type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export function LoadingSpinner({
  label = "Loading...",
  className
}: LoadingSpinnerProps) {
  return (
    <div
      className={["flex items-center gap-3 text-sm text-base-content/70", className].filter(Boolean).join(" ")}
      aria-live="polite"
    >
      <span className="loading loading-spinner loading-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
