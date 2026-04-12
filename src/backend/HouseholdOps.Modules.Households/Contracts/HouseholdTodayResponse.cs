namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdTodayResponse(
    IReadOnlyList<HouseholdTodayEvent> TodayEvents,
    IReadOnlyList<HouseholdTodayChore> TodayChores,
    IReadOnlyList<HouseholdTodayNote> PinnedNotes,
    int PendingReminderCount);

public sealed record HouseholdTodayEvent(
    string Title,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsAllDay);

public sealed record HouseholdTodayChore(
    Guid Id,
    string Title,
    string? AssignedMemberName);

public sealed record HouseholdTodayNote(
    Guid Id,
    string Title,
    string? Body,
    string AuthorDisplayName);
