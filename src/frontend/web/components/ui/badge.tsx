import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "admin" | "warning" | "danger";
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "ui-badge",
        variant === "admin"
          ? "ui-badge-admin"
          : variant === "warning"
            ? "ui-badge-warning"
            : variant === "danger"
              ? "ui-badge-danger"
              : "ui-badge-default",
        className
      )}
      {...props}
    />
  );
}
