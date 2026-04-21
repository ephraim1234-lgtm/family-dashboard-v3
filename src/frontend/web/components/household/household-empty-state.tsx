import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";

type HouseholdEmptyStateProps = {
  variant: "quiet-day" | "nothing-upcoming" | "board-clear";
  action?: ReactNode;
  className?: string;
};

const copyByVariant: Record<HouseholdEmptyStateProps["variant"], { title: string; message: string }> = {
  "quiet-day": {
    title: "A quieter day",
    message: "Nothing urgent is pulling attention right now."
  },
  "nothing-upcoming": {
    title: "No upcoming blocks",
    message: "The next several days are open enough to breathe."
  },
  "board-clear": {
    title: "Board is clear",
    message: "No pinned notes or urgent household context are waiting here."
  }
};

export function HouseholdEmptyState({
  variant,
  action,
  className
}: HouseholdEmptyStateProps) {
  const copy = copyByVariant[variant];

  return (
    <EmptyState
      className={className}
      title={copy.title}
      message={copy.message}
      action={action}
    />
  );
}
