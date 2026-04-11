namespace HouseholdOps.Modules.Identity.Contracts;

public sealed record SessionResponse(
    bool IsAuthenticated,
    string? UserId,
    string? ActiveHouseholdId,
    string? ActiveHouseholdRole);
