import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

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
  return (
    <Component
      className={cn("ui-card", variant === "admin" ? "ui-card-admin" : null, className)}
      {...props}
    />
  );
}
