using HouseholdOps.Modules.Integrations.Contracts;

namespace HouseholdOps.Modules.Integrations;

public interface IGoogleCalendarIntegrationService
{
    Task<GoogleCalendarLinkListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    GoogleOAuthReadinessResponse GetOAuthReadiness();

    Task<GoogleOAuthAccountLinkListResponse> ListOAuthAccountsAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    Task<GoogleOAuthCalendarListResponse> ListOAuthCalendarsAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    GoogleOAuthStartResponse BeginOAuthLink(
        string state);

    Task CompleteOAuthLinkAsync(
        Guid householdId,
        Guid linkedByUserId,
        string code,
        DateTimeOffset completedAtUtc,
        CancellationToken cancellationToken);

    Task<GoogleCalendarLinkMutationResult> CreateAsync(
        Guid householdId,
        CreateGoogleCalendarLinkRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<GoogleCalendarLinkMutationResult> CreateManagedLinkAsync(
        Guid householdId,
        CreateManagedGoogleCalendarLinkRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<GoogleCalendarLinkMutationResult> DeleteAsync(
        Guid householdId,
        Guid linkId,
        CancellationToken cancellationToken);

    Task<GoogleCalendarLinkMutationResult> UpdateSyncSettingsAsync(
        Guid householdId,
        Guid linkId,
        Contracts.UpdateGoogleCalendarLinkSyncSettingsRequest request,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken);

    Task<GoogleCalendarSyncResult> SyncAsync(
        Guid householdId,
        Guid linkId,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken);

    Task<GoogleCalendarAutoSyncRunResult> SyncDueLinksAsync(
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken);

    Task QueueLocalEventUpsertAsync(
        Guid householdId,
        Guid scheduledEventId,
        DateTimeOffset queuedAtUtc,
        CancellationToken cancellationToken);

    Task QueueLocalEventDeletionAsync(
        Guid householdId,
        Guid scheduledEventId,
        DateTimeOffset queuedAtUtc,
        CancellationToken cancellationToken);

    Task<GoogleCalendarLocalEventSyncRunResult> SyncDueLocalEventsAsync(
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken);
}
