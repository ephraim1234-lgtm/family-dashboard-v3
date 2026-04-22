namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdInviteListResponse(
    IReadOnlyList<HouseholdInviteSummary> Items);
