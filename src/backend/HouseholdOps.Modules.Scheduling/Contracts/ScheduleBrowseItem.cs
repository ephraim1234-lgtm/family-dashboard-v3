namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record ScheduleBrowseItem(
    Guid EventId,
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsRecurring,
    string RecurrencePattern,
    string RecurrenceSummary,
    bool IsImported,
    string? SourceKind,
    bool IsReadOnly,
    bool CanEdit,
    bool CanDelete,
    bool CanCreateReminder,
    bool CanManageReminders,
    string? ReminderEligibilityReason);
