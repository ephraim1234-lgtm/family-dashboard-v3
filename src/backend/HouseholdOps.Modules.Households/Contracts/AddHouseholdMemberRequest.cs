namespace HouseholdOps.Modules.Households.Contracts;

public sealed record AddHouseholdMemberRequest(
    string Email,
    string DisplayName,
    string? Role);
