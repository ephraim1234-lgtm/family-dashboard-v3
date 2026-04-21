import type { HTMLAttributes } from "react";

type CardVariant = "default" | "admin";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "article" | "section" | "div";
  variant?: CardVariant;
};

export function Card({
  as: Component = "article",
  className,
  variant = "default",
  ...props
}: CardProps) {
  const classes = [
    "ui-card",
    variant === "admin" ? "ui-card-admin" : null,
    className
  ].filter(Boolean).join(" ");

  return <Component className={classes} {...props} />;
}
