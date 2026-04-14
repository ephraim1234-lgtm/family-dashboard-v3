namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdHomeResponse(
    IReadOnlyList<HomeEvent> TodayEvents,
    IReadOnlyList<HomeChore> TodayChores,
    IReadOnlyList<HomeNote> PinnedNotes,
    IReadOnlyList<HomeActivityItem> RecentActivity,
    IReadOnlyList<HomeUpcomingDay> UpcomingDays,
    int UpcomingEventCount,
    int PendingReminderCount);

public sealed record HomeEvent(
    string Title,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsAllDay,
    bool IsImported);

public sealed record HomeUpcomingDay(
    DateOnly Date,
    IReadOnlyList<HomeUpcomingEvent> Events);

public sealed record HomeUpcomingEvent(
    string Title,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsAllDay,
    bool IsImported);

public sealed record HomeChore(
    Guid Id,
    string Title,
    string? AssignedMemberName,
    bool CompletedToday);

public sealed record HomeNote(
    Guid Id,
    string Title,
    string? Body,
    string AuthorDisplayName);

public sealed record HomeActivityItem(
    string Kind,
    string Title,
    string? Detail,
    string ActorDisplayName,
    DateTimeOffset OccurredAtUtc);
