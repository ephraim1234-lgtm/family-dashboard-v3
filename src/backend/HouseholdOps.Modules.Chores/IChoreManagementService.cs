using HouseholdOps.Modules.Chores.Contracts;

namespace HouseholdOps.Modules.Chores;

public interface IChoreManagementService
{
    Task<ChoreListResponse> ListChoresAsync(Guid householdId, CancellationToken cancellationToken);

    Task<ChoreMutationResult> CreateChoreAsync(
        Guid householdId,
        CreateChoreRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<ChoreMutationResult> UpdateChoreAsync(
        Guid householdId,
        Guid choreId,
        UpdateChoreRequest request,
        CancellationToken cancellationToken);

    Task<bool> DeleteChoreAsync(Guid householdId, Guid choreId, CancellationToken cancellationToken);

    Task<ChoreInstanceListResponse> ListInstancesAsync(
        Guid householdId,
        DateOnly windowStart,
        DateOnly windowEnd,
        CancellationToken cancellationToken);

    Task<bool> CompleteInstanceAsync(
        Guid householdId,
        Guid instanceId,
        DateTimeOffset completedAtUtc,
        Guid? completedByMemberId,
        string? completedByDisplayName,
        CancellationToken cancellationToken);

    // horizonDays: how far ahead to generate. householdId null = all households.
    Task<int> GenerateDueInstancesAsync(
        DateOnly asOfDate,
        int horizonDays,
        Guid? householdId,
        CancellationToken cancellationToken);
}
