using HouseholdOps.Modules.Chores.Contracts;

namespace HouseholdOps.Modules.Chores;

public interface IChoreService
{
    Task<ChoreListResponse> ListChoresAsync(Guid householdId, CancellationToken cancellationToken);
    Task<(ChoreMutationResult Result, ChoreItem? Item)> CreateChoreAsync(Guid householdId, CreateChoreRequest request, CancellationToken cancellationToken);
    Task<(ChoreMutationResult Result, ChoreItem? Item)> UpdateChoreAsync(Guid householdId, Guid choreId, UpdateChoreRequest request, CancellationToken cancellationToken);
    Task<ChoreMutationResult> DeleteChoreAsync(Guid householdId, Guid choreId, CancellationToken cancellationToken);
    Task<ChoreListResponse> ListMyChoresAsync(Guid householdId, Guid userId, CancellationToken cancellationToken);
    Task<ChoreCompletionListResponse> ListRecentCompletionsAsync(Guid householdId, CancellationToken cancellationToken);
    Task<(ChoreMutationResult Result, ChoreCompletionItem? Item)> CompleteChoreAsync(Guid householdId, Guid choreId, Guid userId, CompleteChoreRequest request, CancellationToken cancellationToken);
}

public sealed class ChoreMutationResult
{
    public ChoreMutationStatus Status { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static ChoreMutationResult Success() => new() { Status = ChoreMutationStatus.Succeeded };
    public static ChoreMutationResult Completed() => new() { Status = ChoreMutationStatus.Completed };
    public static ChoreMutationResult Deleted() => new() { Status = ChoreMutationStatus.Deleted };
    public static ChoreMutationResult ValidationFailure(string message) => new() { Status = ChoreMutationStatus.ValidationFailed, ErrorMessage = message };
    public static ChoreMutationResult NotFound() => new() { Status = ChoreMutationStatus.NotFound };
}

public enum ChoreMutationStatus
{
    Succeeded,
    Completed,
    Deleted,
    ValidationFailed,
    NotFound
}
