namespace HouseholdOps.Modules.Scheduling;

/// <summary>
/// Pure time-window filter logic for upcoming event queries.
/// Kept as a static helper so it can be tested independently of EF Core.
/// The AgendaQueryService uses equivalent inline conditions in its LINQ query.
/// </summary>
public static class AgendaWindowFilter
{
    /// <summary>
    /// Returns true if the event starts within [windowStart, windowEnd).
    /// Events with no StartsAtUtc are excluded.
    /// </summary>
    public static bool StartsInWindow(
        DateTimeOffset? startsAtUtc,
        DateTimeOffset windowStart,
        DateTimeOffset windowEnd)
        => startsAtUtc.HasValue
            && startsAtUtc.Value >= windowStart
            && startsAtUtc.Value < windowEnd;
}
