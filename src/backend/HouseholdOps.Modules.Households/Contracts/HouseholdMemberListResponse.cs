namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdMemberListResponse(
    IReadOnlyList<HouseholdMemberSummary> Items);
