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
    "pill",
    variant !== "default" ? `pill-${variant}` : null,
    className
  ].filter(Boolean).join(" ");

  return <span className={classes} {...props} />;
}
