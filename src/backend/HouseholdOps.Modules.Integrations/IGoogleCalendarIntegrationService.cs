using HouseholdOps.Modules.Integrations.Contracts;

namespace HouseholdOps.Modules.Integrations;

public interface IGoogleCalendarIntegrationService
{
    Task<GoogleCalendarLinkListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken);

    GoogleOAuthReadinessResponse GetOAuthReadiness();

    Task<GoogleCalendarLinkMutationResult> CreateAsync(
        Guid householdId,
        CreateGoogleCalendarLinkRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken);

    Task<bool> DeleteAsync(
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
}
