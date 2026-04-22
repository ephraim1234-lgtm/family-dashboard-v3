namespace HouseholdOps.Modules.Identity.Contracts;

public sealed record SessionResponse(
    bool IsAuthenticated,
    SessionUserResponse? User,
    string? ActiveHouseholdId,
    string? ActiveHouseholdRole,
    bool HasActiveHousehold,
    bool NeedsOnboarding)
{
    public string? UserId => User?.UserId;

    public string? Email => User?.Email;

    public string? DisplayName => User?.DisplayName;
}
