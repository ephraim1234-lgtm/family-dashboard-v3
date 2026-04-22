namespace HouseholdOps.Modules.Identity.Contracts;

public sealed record SignUpRequest(
    string Email,
    string Password,
    string DisplayName);
