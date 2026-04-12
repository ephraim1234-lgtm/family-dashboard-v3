namespace HouseholdOps.Modules.Notifications.Contracts;

public sealed record EventReminderListResponse(
    IReadOnlyList<EventReminderSummaryResponse> Items);
