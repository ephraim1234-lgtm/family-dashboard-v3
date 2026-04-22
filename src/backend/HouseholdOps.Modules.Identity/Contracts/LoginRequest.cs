namespace HouseholdOps.Modules.Identity.Contracts;

public sealed record LoginRequest(
    string Email,
    string Password);
