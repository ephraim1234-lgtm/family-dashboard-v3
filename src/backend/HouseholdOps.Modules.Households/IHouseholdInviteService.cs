using HouseholdOps.Modules.Households.Contracts;

namespace HouseholdOps.Modules.Households;

public interface IHouseholdInviteService
{
    Task<HouseholdInviteListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    Task<HouseholdInviteMutationResult> CreateAsync(
        Guid householdId,
        Guid invitedByUserId,
        CreateHouseholdInviteRequest request,
        string acceptUrlBase,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<HouseholdInvitePreviewResponse?> PreviewAsync(
        string token,
        CancellationToken cancellationToken);

    Task<HouseholdInviteMutationResult> AcceptAsync(
        Guid userId,
        string token,
        DateTimeOffset acceptedAtUtc,
        CancellationToken cancellationToken);

    Task<HouseholdInviteMutationResult> RevokeAsync(
        Guid householdId,
        Guid inviteId,
        CancellationToken cancellationToken);
}

public sealed class HouseholdInviteMutationResult
{
    public HouseholdInviteMutationStatus Status { get; private init; }

    public HouseholdInviteSummary? Invite { get; private init; }

    public CreateHouseholdInviteResponse? CreatedInvite { get; private init; }

    public HouseholdContextResponse? Household { get; private init; }

    public string? Error { get; private init; }

    public static HouseholdInviteMutationResult Created(CreateHouseholdInviteResponse invite) =>
        new() { Status = HouseholdInviteMutationStatus.Created, CreatedInvite = invite };

    public static HouseholdInviteMutationResult Accepted(HouseholdContextResponse household) =>
        new() { Status = HouseholdInviteMutationStatus.Accepted, Household = household };

    public static HouseholdInviteMutationResult Deleted() =>
        new() { Status = HouseholdInviteMutationStatus.Deleted };

    public static HouseholdInviteMutationResult ValidationFailure(string error) =>
        new() { Status = HouseholdInviteMutationStatus.ValidationFailed, Error = error };

    public static HouseholdInviteMutationResult Conflict(string error) =>
        new() { Status = HouseholdInviteMutationStatus.Conflict, Error = error };

    public static HouseholdInviteMutationResult NotFound() =>
        new() { Status = HouseholdInviteMutationStatus.NotFound };

    public static HouseholdInviteMutationResult Unauthorized() =>
        new() { Status = HouseholdInviteMutationStatus.Unauthorized };
}

public enum HouseholdInviteMutationStatus
{
    Created,
    Accepted,
    Deleted,
    ValidationFailed,
    Conflict,
    NotFound,
    Unauthorized
}
