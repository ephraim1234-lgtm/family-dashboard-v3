import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type {
  FamilyItemKind,
  FamilyOwnerDisplay,
  FamilySourceLabel,
  FamilyUrgencyState
} from "@/lib/family-command-center";

function sourceText(sourceLabel: FamilySourceLabel) {
  if (sourceLabel === "imported") return "Imported";
  if (sourceLabel === "local") return "Local";
  return "Household";
}

function kindText(kind: FamilyItemKind) {
  if (kind === "event") return "Event";
  if (kind === "reminder") return "Prompt";
  if (kind === "chore") return "Chore";
  return "Note";
}

function urgencyText(urgencyState: FamilyUrgencyState) {
  if (urgencyState === "overdue") return "Overdue";
  if (urgencyState === "now") return "Now";
  if (urgencyState === "next") return "Next";
  if (urgencyState === "soon") return "Soon";
  if (urgencyState === "upcoming") return "Upcoming";
  return "Background";
}

type HouseholdMetaBadgesProps = {
  owner?: FamilyOwnerDisplay;
  sourceLabel?: FamilySourceLabel;
  kind?: FamilyItemKind;
  urgencyState?: FamilyUrgencyState;
  className?: string;
};

export function HouseholdMetaBadges({
  owner,
  sourceLabel,
  kind,
  urgencyState,
  className
}: HouseholdMetaBadgesProps) {
  return (
    <div className={cn("family-meta-row", className)}>
      {owner ? (
        <Badge variant={owner.kind === "unassigned" ? "warning" : "default"}>
          {owner.label}
        </Badge>
      ) : null}
      {kind ? <Badge>{kindText(kind)}</Badge> : null}
      {sourceLabel ? (
        <Badge variant={sourceLabel === "imported" ? "admin" : "default"}>
          {sourceText(sourceLabel)}
        </Badge>
      ) : null}
      {urgencyState ? (
        <Badge
          variant={
            urgencyState === "overdue"
              ? "danger"
              : urgencyState === "soon" || urgencyState === "next"
                ? "warning"
                : "default"
          }
        >
          {urgencyText(urgencyState)}
        </Badge>
      ) : null}
    </div>
  );
}
