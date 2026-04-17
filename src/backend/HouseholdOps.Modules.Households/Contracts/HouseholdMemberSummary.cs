namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdMemberSummary(
    string UserId,
    string DisplayName,
    string Email,
    string Role);
