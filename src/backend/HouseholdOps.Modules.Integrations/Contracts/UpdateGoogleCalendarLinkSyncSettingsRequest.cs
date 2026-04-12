namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record UpdateGoogleCalendarLinkSyncSettingsRequest(
    bool AutoSyncEnabled,
    int SyncIntervalMinutes);
