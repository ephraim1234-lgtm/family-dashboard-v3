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
    "badge rounded-full border px-3 py-3 text-xs font-medium uppercase tracking-[0.16em]",
    variant === "admin"
      ? "border-secondary/20 bg-secondary/12 text-secondary"
      : variant === "warning"
        ? "border-warning/25 bg-warning/12 text-warning"
        : variant === "danger"
          ? "border-error/25 bg-error/12 text-error"
          : "border-base-300/70 bg-base-200/70 text-base-content/70",
    className
  ].filter(Boolean).join(" ");

  return <span className={classes} {...props} />;
}
