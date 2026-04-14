namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdHomeResponse(
    IReadOnlyList<HomeEvent> TodayEvents,
    IReadOnlyList<HomeChore> TodayChores,
    IReadOnlyList<HomeNote> PinnedNotes,
    IReadOnlyList<HomeActivityItem> RecentActivity,
    IReadOnlyList<HomeUpcomingDay> UpcomingDays,
    IReadOnlyList<HomeReminder> PendingReminders,
    IReadOnlyList<HomeMemberChoreProgress> MemberChoreProgress,
    int UpcomingEventCount,
    int PendingReminderCount);

public sealed record HomeMemberChoreProgress(
    string MemberDisplayName,
    int CompletionsThisWeek,
    int CurrentStreakDays);

public sealed record HomeReminder(
    Guid Id,
    string EventTitle,
    int MinutesBefore,
    DateTimeOffset DueAtUtc);

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
    Guid ScheduledEventId,
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
