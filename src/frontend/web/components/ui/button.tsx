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
    "btn rounded-full border-base-300/70 font-medium normal-case shadow-none",
    variant === "danger"
      ? "btn-error"
      : variant === "admin"
        ? "btn-secondary"
        : `btn-${variant}`,
    size === "sm"
      ? "btn-sm min-h-[44px] px-4"
      : "btn-md min-h-[48px] px-5",
    className
  ].filter(Boolean).join(" ");

  return <button type={type} className={classes} {...props} />;
}
