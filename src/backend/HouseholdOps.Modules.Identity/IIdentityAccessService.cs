using HouseholdOps.Modules.Identity.Contracts;

namespace HouseholdOps.Modules.Identity;

public interface IIdentityAccessService
{
    CurrentIdentityAccess GetCurrentAccess();

    SessionResponse GetCurrentSession();

    Task<IdentityCommandResult> SignUpAsync(
        SignUpRequest request,
        CancellationToken cancellationToken);

    Task<IdentityCommandResult> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken);

    Task SignOutAsync(CancellationToken cancellationToken);

    Task<SessionResponse?> SetActiveHouseholdAsync(
        Guid householdId,
        string householdRole,
        CancellationToken cancellationToken);
}

public sealed record CurrentIdentityAccess(
    Guid? SessionId,
    Guid? UserId,
    string? Email,
    string? DisplayName,
    Guid? ActiveHouseholdId,
    string? ActiveHouseholdRole)
{
    public bool IsAuthenticated => UserId.HasValue;

    public bool HasActiveHousehold => ActiveHouseholdId.HasValue;

    public bool NeedsOnboarding => IsAuthenticated && !HasActiveHousehold;

    public bool IsOwner => string.Equals(ActiveHouseholdRole, "Owner", StringComparison.Ordinal);
}

public sealed class IdentityCommandResult
{
    public IdentityCommandStatus Status { get; private init; }

    public SessionResponse? Session { get; private init; }

    public string? Error { get; private init; }

    public static IdentityCommandResult Success(SessionResponse session) =>
        new() { Status = IdentityCommandStatus.Succeeded, Session = session };

    public static IdentityCommandResult ValidationFailure(string error) =>
        new() { Status = IdentityCommandStatus.ValidationFailed, Error = error };

    public static IdentityCommandResult Conflict(string error) =>
        new() { Status = IdentityCommandStatus.Conflict, Error = error };

    public static IdentityCommandResult InvalidCredentials() =>
        new() { Status = IdentityCommandStatus.InvalidCredentials, Error = "Invalid email or password." };
}

public enum IdentityCommandStatus
{
    Succeeded,
    ValidationFailed,
    Conflict,
    InvalidCredentials
}

