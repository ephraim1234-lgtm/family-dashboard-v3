import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "admin";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "ui-button",
    variant === "danger"
      ? "ui-button-danger"
      : variant === "admin"
        ? "ui-button-admin"
        : variant === "secondary"
          ? "ui-button-secondary"
          : variant === "ghost"
            ? "ui-button-ghost"
            : "ui-button-primary",
    size === "sm" ? "ui-button-sm" : "ui-button-md",
    className
  ].filter(Boolean).join(" ");

  return <button type={type} className={classes} {...props} />;
}
