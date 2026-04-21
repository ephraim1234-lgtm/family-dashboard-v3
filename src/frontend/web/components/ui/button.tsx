import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "admin"
  | "success"
  | "outline"
  | "active";
export type ButtonSize = "xs" | "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function getButtonClassName({
  className,
  variant = "primary",
  size = "md"
}: Pick<ButtonProps, "className" | "variant" | "size">) {
  return cn(
    "ui-button",
    variant === "danger"
      ? "ui-button-danger"
      : variant === "admin"
        ? "ui-button-admin"
        : variant === "secondary"
          ? "ui-button-secondary"
          : variant === "ghost"
            ? "ui-button-ghost"
            : variant === "success"
              ? "ui-button-success"
              : variant === "outline"
                ? "ui-button-outline"
                : variant === "active"
                  ? "ui-button-active"
                  : "ui-button-primary",
    size === "xs"
      ? "ui-button-xs"
      : size === "sm"
        ? "ui-button-sm"
        : "ui-button-md",
    className
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={getButtonClassName({ className, variant, size })}
      {...props}
    />
  );
}
