using HouseholdOps.Modules.Chores.Contracts;

namespace HouseholdOps.Modules.Chores;

public enum ChoreMutationStatus
{
    Succeeded,
    ValidationFailed,
    NotFound
}

public sealed class ChoreMutationResult
{
    public ChoreMutationStatus Status { get; private init; }
    public ChoreSummaryResponse? Chore { get; private init; }
    public string? Error { get; private init; }

    public static ChoreMutationResult Success(ChoreSummaryResponse chore) =>
        new() { Status = ChoreMutationStatus.Succeeded, Chore = chore };

    public static ChoreMutationResult ValidationFailure(string error) =>
        new() { Status = ChoreMutationStatus.ValidationFailed, Error = error };

    public static ChoreMutationResult NotFound() =>
        new() { Status = ChoreMutationStatus.NotFound };
}
