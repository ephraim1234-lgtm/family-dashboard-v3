import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button, type ButtonProps, getButtonClassName } from "./button";
import { Card } from "./card";

type PageContainerProps = HTMLAttributes<HTMLElement> & {
  as?: "main" | "section" | "div";
};

export function PageContainer({
  as: Component = "section",
  className,
  ...props
}: PageContainerProps) {
  return <Component className={cn("ui-page-container", className)} {...props} />;
}

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  copyClassName?: string;
  descriptionClassName?: string;
  surface?: "card" | "plain";
  titleAs?: "h1" | "h2";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  copyClassName,
  descriptionClassName,
  surface = "card",
  titleAs: TitleTag = "h2",
  ...props
}: PageHeaderProps) {
  const content = (
    <>
      <div className="ui-page-header-body">
        <div className={cn("ui-page-header-copy", copyClassName)}>
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <TitleTag className="ui-page-header-title">{title}</TitleTag>
          {description ? (
            <div className={cn("ui-page-header-description", descriptionClassName)}>
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="ui-page-header-actions">{actions}</div> : null}
      </div>
      {children ? <div className="ui-page-header-content">{children}</div> : null}
    </>
  );

  if (surface === "plain") {
    return <header className={cn("ui-page-header", className)} {...props}>{content}</header>;
  }

  return (
    <Card as="section" className={cn("ui-page-header", className)} {...props}>
      {content}
    </Card>
  );
}

type SectionHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
  titleAs?: "h2" | "h3";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
  titleAs: TitleTag = "h2",
  ...props
}: SectionHeaderProps) {
  return (
    <header className={cn("ui-section-header", className)} {...props}>
      <div className="ui-section-header-copy">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <TitleTag className={cn("ui-section-title", titleClassName)}>{title}</TitleTag>
        {description ? (
          <div className={cn("ui-section-description", descriptionClassName)}>
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div className="ui-section-header-actions">{actions}</div> : null}
    </header>
  );
}

type StatusMessageProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "success" | "warning" | "danger";
  title?: ReactNode;
  message: ReactNode;
};

export function StatusMessage({
  className,
  variant = "default",
  title,
  message,
  children,
  ...props
}: StatusMessageProps) {
  const role = variant === "danger" || variant === "warning" ? "alert" : props.role;

  return (
    <div
      className={cn(
        "ui-alert",
        variant === "success"
          ? "ui-alert-success"
          : variant === "warning"
            ? "ui-alert-warning"
            : variant === "danger"
              ? "ui-alert-danger"
              : null,
        className
      )}
      role={role}
      {...props}
    >
      <div className="ui-status-message-copy">
        {title ? <strong className="ui-status-message-title">{title}</strong> : null}
        <div>{message}</div>
      </div>
      {children ? <div className="ui-status-message-actions">{children}</div> : null}
    </div>
  );
}

type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "warning" | "accent";
};

export function StatCard({
  className,
  label,
  value,
  tone = "default",
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "ui-stat-card",
        tone === "warning"
          ? "ui-inline-card-warning"
          : tone === "accent"
            ? "ui-inline-card-accent"
            : "ui-inline-card",
        className
      )}
      {...props}
    >
      <div className="ui-stat-card-value">{value}</div>
      <div className="ui-stat-card-label">{label}</div>
    </div>
  );
}

type ListCardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "article" | "section" | "div";
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "warning" | "accent" | "admin";
};

export function ListCard({
  as: Component = "article",
  className,
  eyebrow,
  title,
  description,
  meta,
  action,
  children,
  tone = "default",
  ...props
}: ListCardProps) {
  return (
    <Component
      className={cn(
        "ui-list-card",
        tone === "warning"
          ? "ui-list-card-warning"
          : tone === "accent"
            ? "ui-list-card-accent"
            : tone === "admin"
              ? "ui-list-card-admin"
              : null,
        className
      )}
      {...props}
    >
      <div className="ui-list-card-header">
        <div className="ui-list-card-copy">
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <div className="ui-list-card-title">{title}</div>
          {description ? <div className="ui-list-card-description">{description}</div> : null}
          {meta ? <div className="ui-list-card-meta">{meta}</div> : null}
        </div>
        {action ? <div className="ui-list-card-action">{action}</div> : null}
      </div>
      {children ? <div className="ui-list-card-body">{children}</div> : null}
    </Component>
  );
}

type QuickActionsProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
};

export function QuickActions({
  label,
  className,
  children,
  ...props
}: QuickActionsProps) {
  return (
    <div className={cn("ui-quick-actions", className)} {...props}>
      {label ? <div className="ui-quick-actions-label">{label}</div> : null}
      <div className="ui-quick-actions-row">{children}</div>
    </div>
  );
}

type ActionButtonProps = Omit<ButtonProps, "className"> & {
  className?: string;
  href?: string;
};

export function ActionButton({
  href,
  className,
  variant,
  size,
  children,
  ...props
}: ActionButtonProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={getButtonClassName({
          className,
          variant,
          size
        })}
      >
        {children}
      </Link>
    );
  }

  return (
    <Button className={className} variant={variant} size={size} {...props}>
      {children}
    </Button>
  );
}
