namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record CreateMemberEventRequest(
    string Title,
    string? Description,
    bool IsAllDay,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc);
