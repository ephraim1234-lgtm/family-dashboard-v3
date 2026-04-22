using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdMemberService
{
    Task<HouseholdMemberListResponse> ListMembersAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    Task<HouseholdMemberMutationResult> RemoveMemberAsync(
        Guid householdId,
        Guid membershipId,
        CancellationToken cancellationToken);
}

public sealed class HouseholdMemberMutationResult
{
    public HouseholdMemberMutationStatus Status { get; private init; }
    public HouseholdMemberSummary? Member { get; private init; }
    public string? Error { get; private init; }

    public static HouseholdMemberMutationResult Success(HouseholdMemberSummary member) =>
        new() { Status = HouseholdMemberMutationStatus.Succeeded, Member = member };

    public static HouseholdMemberMutationResult ValidationFailure(string error) =>
        new() { Status = HouseholdMemberMutationStatus.ValidationFailed, Error = error };

    public static HouseholdMemberMutationResult Conflict(string error) =>
        new() { Status = HouseholdMemberMutationStatus.Conflict, Error = error };

    public static HouseholdMemberMutationResult Deleted() =>
        new() { Status = HouseholdMemberMutationStatus.Deleted };

    public static HouseholdMemberMutationResult NotFound() =>
        new() { Status = HouseholdMemberMutationStatus.NotFound };
}

public enum HouseholdMemberMutationStatus
{
    Succeeded,
    Deleted,
    ValidationFailed,
    Conflict,
    NotFound
}
