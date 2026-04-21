import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "admin" | "warning" | "danger";
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const classes = [
    "ui-badge",
    variant === "admin"
      ? "ui-badge-admin"
      : variant === "warning"
        ? "ui-badge-warning"
        : variant === "danger"
          ? "ui-badge-danger"
          : "ui-badge-default",
    className
  ].filter(Boolean).join(" ");

  return <span className={classes} {...props} />;
}
