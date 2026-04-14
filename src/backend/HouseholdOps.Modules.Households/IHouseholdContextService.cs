using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdContextService
{
    Task<HouseholdContextResponse?> GetCurrentAsync(CancellationToken cancellationToken);

    Task<HouseholdContextResponse?> RenameAsync(
        string name,
        CancellationToken cancellationToken);

    Task<HouseholdTimeZoneUpdateResult> UpdateTimeZoneAsync(
        string timeZoneId,
        CancellationToken cancellationToken);
}

public sealed record HouseholdTimeZoneUpdateResult(
    HouseholdTimeZoneUpdateStatus Status,
    HouseholdContextResponse? Household,
    string? Error);

public enum HouseholdTimeZoneUpdateStatus
{
    Succeeded,
    ValidationFailed,
    Unauthorized
}
