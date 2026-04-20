type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export function LoadingSpinner({
  label = "Loading…",
  className
}: LoadingSpinnerProps) {
  return (
    <p className={["muted", className].filter(Boolean).join(" ")} aria-live="polite">
      {label}
    </p>
  );
}
