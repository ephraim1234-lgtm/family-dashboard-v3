import type { HTMLAttributes, ReactNode } from "react";
import { Card, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

type HouseholdSectionProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  contentClassName?: string;
};

export function HouseholdSection({
  eyebrow,
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
  ...props
}: HouseholdSectionProps) {
  return (
    <Card as="section" className={cn("family-section", className)} {...props}>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      <div className={cn("family-section-body", contentClassName)}>{children}</div>
    </Card>
  );
}
