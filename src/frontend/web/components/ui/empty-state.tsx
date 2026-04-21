import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  message: string;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ message, title, action, className }: EmptyStateProps) {
  return (
    <div className={cn("ui-empty-state", className)}>
      {title ? <div className="ui-empty-state-title">{title}</div> : null}
      <p className="ui-empty-state-message">{message}</p>
      {action ? <div className="ui-empty-state-action">{action}</div> : null}
    </div>
  );
}
