using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdContextService
{
    Task<HouseholdContextMutationResult> CreateAsync(
        CreateHouseholdRequest request,
        CancellationToken cancellationToken);

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

public sealed class HouseholdContextMutationResult
{
    public HouseholdContextMutationStatus Status { get; private init; }

    public HouseholdContextResponse? Household { get; private init; }

    public string? Error { get; private init; }

    public static HouseholdContextMutationResult Success(HouseholdContextResponse household) =>
        new() { Status = HouseholdContextMutationStatus.Succeeded, Household = household };

    public static HouseholdContextMutationResult ValidationFailure(string error) =>
        new() { Status = HouseholdContextMutationStatus.ValidationFailed, Error = error };

    public static HouseholdContextMutationResult Conflict(string error) =>
        new() { Status = HouseholdContextMutationStatus.Conflict, Error = error };

    public static HouseholdContextMutationResult Unauthorized() =>
        new() { Status = HouseholdContextMutationStatus.Unauthorized };
}

public enum HouseholdContextMutationStatus
{
    Succeeded,
    ValidationFailed,
    Conflict,
    Unauthorized
}
