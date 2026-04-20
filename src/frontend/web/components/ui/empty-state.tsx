type EmptyStateProps = {
  message: string;
  className?: string;
};

export function EmptyState({ message, className }: EmptyStateProps) {
  return <p className={["muted", className].filter(Boolean).join(" ")}>{message}</p>;
}
