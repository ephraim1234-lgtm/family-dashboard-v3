import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type HouseholdBoardCardProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: "default" | "warning" | "accent";
  className?: string;
};

export function HouseholdBoardCard({
  title,
  description,
  meta,
  actions,
  tone = "default",
  className
}: HouseholdBoardCardProps) {
  return (
    <div
      className={cn(
        "stack-card",
        tone === "warning"
          ? "stack-card-warning"
          : tone === "accent"
            ? "ui-inline-card-accent"
            : null,
        className
      )}
    >
      <div className="stack-card-header">
        <div className="min-w-0 flex-1">
          <strong>{title}</strong>
          {description ? <div className="muted mt-1">{description}</div> : null}
          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>
        {actions ? <div className="family-board-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
