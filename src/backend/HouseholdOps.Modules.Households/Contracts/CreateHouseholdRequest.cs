namespace HouseholdOps.Modules.Households.Contracts;

public sealed record CreateHouseholdRequest(
    string Name,
    string? TimeZoneId);
