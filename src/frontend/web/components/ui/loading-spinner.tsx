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
      className={["flex items-center gap-3 text-sm ui-text-muted", className].filter(Boolean).join(" ")}
      aria-live="polite"
    >
      <span className="ui-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
