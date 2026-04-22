namespace HouseholdOps.Modules.Identity.Contracts;

public sealed record SessionUserResponse(
    string UserId,
    string Email,
    string DisplayName);
