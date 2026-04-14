namespace HouseholdOps.Modules.Households;

/// <summary>
/// Pure helpers for converting between UTC and household-local time boundaries.
/// The household time zone drives "today" windows and day-grouping so that
/// agenda and streak calculations feel correct to members in their local time.
/// </summary>
public static class HouseholdTimeBoundary
{
    /// <summary>
    /// Resolve the household time zone, falling back to UTC for unknown ids so
    /// a corrupted row can never brick the home read model.
    /// </summary>
    public static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return TimeZoneInfo.Utc;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    /// <summary>
    /// Returns the UTC instants that bound "today" in the household's local
    /// time. The start is local-midnight-today, the end is local-midnight-tomorrow,
    /// both expressed as UTC for direct comparison against stored timestamps.
    /// </summary>
    public static (DateTimeOffset TodayStartUtc, DateTimeOffset TodayEndUtc)
        GetTodayWindowUtc(DateTimeOffset nowUtc, TimeZoneInfo timeZone)
    {
        var localNow = TimeZoneInfo.ConvertTime(nowUtc, timeZone);
        var localMidnight = new DateTime(
            localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var todayStartUtc = new DateTimeOffset(
            localMidnight, timeZone.GetUtcOffset(localMidnight))
            .ToUniversalTime();
        var localTomorrow = localMidnight.AddDays(1);
        var todayEndUtc = new DateTimeOffset(
            localTomorrow, timeZone.GetUtcOffset(localTomorrow))
            .ToUniversalTime();
        return (todayStartUtc, todayEndUtc);
    }

    /// <summary>
    /// Returns the household-local <see cref="DateOnly"/> for a UTC instant,
    /// so per-day grouping (agendas, streaks) honors the member's wall clock.
    /// </summary>
    public static DateOnly ToLocalDate(DateTimeOffset utc, TimeZoneInfo timeZone)
    {
        var local = TimeZoneInfo.ConvertTime(utc, timeZone);
        return DateOnly.FromDateTime(local.DateTime);
    }
}
