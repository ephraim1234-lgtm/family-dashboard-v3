namespace HouseholdOps.Modules.Identity.Contracts;

public sealed record SessionResponse(
    bool IsAuthenticated,
    string? UserId,
    string? DisplayName,
    string? ActiveHouseholdId,
    string? ActiveHouseholdRole);
