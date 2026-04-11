namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayAgendaItemResponse(
    string Title,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    bool IsAllDay,
    string? Description);
