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
    "rounded-[1.75rem] border border-base-300/70 bg-base-100/90 p-5 shadow-xl shadow-base-content/5 backdrop-blur sm:p-6",
    variant === "admin" ? "ring-1 ring-secondary/15" : null,
    className
  ].filter(Boolean).join(" ");

  return <Component className={classes} {...props} />;
}
