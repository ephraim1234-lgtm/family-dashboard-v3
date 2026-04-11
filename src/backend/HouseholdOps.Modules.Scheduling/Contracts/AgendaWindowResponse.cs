namespace HouseholdOps.Modules.Scheduling.Contracts;

public sealed record AgendaWindowResponse(
    DateTimeOffset RangeStartUtc,
    DateTimeOffset RangeEndUtc,
    IReadOnlyList<string> Notes);

