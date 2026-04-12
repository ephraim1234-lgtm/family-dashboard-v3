using System.Globalization;
using HouseholdOps.Modules.Scheduling;

namespace HouseholdOps.Infrastructure.Integrations;

internal static class GoogleCalendarRecurrenceParser
{
    public static ImportedRecurrence? TryParse(
        IReadOnlyList<string> recurrenceLines,
        DateTimeOffset startsAtUtc)
    {
        if (recurrenceLines.Count == 0)
        {
            return null;
        }

        var rrule = recurrenceLines
            .FirstOrDefault(line => line.StartsWith("RRULE:", StringComparison.OrdinalIgnoreCase));

        if (string.IsNullOrWhiteSpace(rrule)
            || recurrenceLines.Any(line => !line.StartsWith("RRULE:", StringComparison.OrdinalIgnoreCase)))
        {
            return null;
        }

        return TryParseRRule(rrule["RRULE:".Length..], startsAtUtc);
    }

    public static ImportedRecurrence? TryParseRRule(
        string rrule,
        DateTimeOffset startsAtUtc)
    {
        var segments = rrule.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment => segment.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(parts => parts[0], parts => parts[1], StringComparer.OrdinalIgnoreCase);

        if (!segments.TryGetValue("FREQ", out var frequency))
        {
            return null;
        }

        if (segments.TryGetValue("INTERVAL", out var intervalRaw)
            && intervalRaw != "1")
        {
            return null;
        }

        if (string.Equals(frequency, "DAILY", StringComparison.OrdinalIgnoreCase))
        {
            return new ImportedRecurrence(
                EventRecurrencePattern.Daily,
                0,
                ResolveRecurrenceEnd(
                    segments,
                    startsAtUtc,
                    EventRecurrencePattern.Daily,
                    0));
        }

        if (string.Equals(frequency, "WEEKLY", StringComparison.OrdinalIgnoreCase))
        {
            var weeklyDaysMask = segments.TryGetValue("BYDAY", out var byDay)
                ? ParseWeeklyDays(byDay)
                : startsAtUtc.DayOfWeek switch
                {
                    DayOfWeek.Sunday => (int)WeeklyDayMask.Sunday,
                    DayOfWeek.Monday => (int)WeeklyDayMask.Monday,
                    DayOfWeek.Tuesday => (int)WeeklyDayMask.Tuesday,
                    DayOfWeek.Wednesday => (int)WeeklyDayMask.Wednesday,
                    DayOfWeek.Thursday => (int)WeeklyDayMask.Thursday,
                    DayOfWeek.Friday => (int)WeeklyDayMask.Friday,
                    DayOfWeek.Saturday => (int)WeeklyDayMask.Saturday,
                    _ => 0
                };

            return weeklyDaysMask == 0
                ? null
                : new ImportedRecurrence(
                    EventRecurrencePattern.Weekly,
                    weeklyDaysMask,
                    ResolveRecurrenceEnd(
                        segments,
                        startsAtUtc,
                        EventRecurrencePattern.Weekly,
                        weeklyDaysMask));
        }

        return null;
    }

    private static int ParseWeeklyDays(string byDay)
    {
        var mask = 0;
        foreach (var token in byDay.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            mask |= token.ToUpperInvariant() switch
            {
                "SU" => (int)WeeklyDayMask.Sunday,
                "MO" => (int)WeeklyDayMask.Monday,
                "TU" => (int)WeeklyDayMask.Tuesday,
                "WE" => (int)WeeklyDayMask.Wednesday,
                "TH" => (int)WeeklyDayMask.Thursday,
                "FR" => (int)WeeklyDayMask.Friday,
                "SA" => (int)WeeklyDayMask.Saturday,
                _ => 0
            };
        }

        return mask;
    }

    private static DateTimeOffset? TryParseUntil(
        IReadOnlyDictionary<string, string> segments,
        DateTimeOffset startsAtUtc)
    {
        if (!segments.TryGetValue("UNTIL", out var rawUntil))
        {
            return null;
        }

        if (DateTimeOffset.TryParseExact(
            rawUntil,
            new[] { "yyyyMMdd'T'HHmmss'Z'", "yyyyMMdd'T'HHmmss" },
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsedTimestamp))
        {
            return parsedTimestamp.ToUniversalTime();
        }

        if (DateTime.TryParseExact(
            rawUntil,
            "yyyyMMdd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsedDate))
        {
            var date = parsedDate.Date;
            return new DateTimeOffset(
                date.Year,
                date.Month,
                date.Day,
                startsAtUtc.Hour,
                startsAtUtc.Minute,
                startsAtUtc.Second,
                TimeSpan.Zero);
        }

        return null;
    }

    private static DateTimeOffset? ResolveRecurrenceEnd(
        IReadOnlyDictionary<string, string> segments,
        DateTimeOffset startsAtUtc,
        EventRecurrencePattern pattern,
        int weeklyDaysMask)
    {
        var until = TryParseUntil(segments, startsAtUtc);
        var countEnd = TryParseCountEnd(segments, startsAtUtc, pattern, weeklyDaysMask);

        if (until.HasValue && countEnd.HasValue)
        {
            return until.Value <= countEnd.Value ? until : countEnd;
        }

        return until ?? countEnd;
    }

    private static DateTimeOffset? TryParseCountEnd(
        IReadOnlyDictionary<string, string> segments,
        DateTimeOffset startsAtUtc,
        EventRecurrencePattern pattern,
        int weeklyDaysMask)
    {
        if (!segments.TryGetValue("COUNT", out var rawCount)
            || !int.TryParse(rawCount, NumberStyles.None, CultureInfo.InvariantCulture, out var count)
            || count <= 0)
        {
            return null;
        }

        return pattern switch
        {
            EventRecurrencePattern.Daily => startsAtUtc.AddDays(count - 1),
            EventRecurrencePattern.Weekly => ResolveWeeklyCountEnd(startsAtUtc, weeklyDaysMask, count),
            _ => null
        };
    }

    private static DateTimeOffset? ResolveWeeklyCountEnd(
        DateTimeOffset startsAtUtc,
        int weeklyDaysMask,
        int count)
    {
        var weeklyDays = ParseWeeklyDaysMask(weeklyDaysMask);
        if (weeklyDays.Count == 0)
        {
            return null;
        }

        var remainingOccurrences = count;
        var cursor = startsAtUtc.Date;

        while (remainingOccurrences > 0)
        {
            var occurrenceStart = new DateTimeOffset(
                cursor.Year,
                cursor.Month,
                cursor.Day,
                0,
                0,
                0,
                startsAtUtc.Offset).Add(startsAtUtc.TimeOfDay);

            if (occurrenceStart >= startsAtUtc
                && weeklyDays.Contains(cursor.DayOfWeek))
            {
                remainingOccurrences--;
                if (remainingOccurrences == 0)
                {
                    return occurrenceStart;
                }
            }

            cursor = cursor.AddDays(1);
        }

        return null;
    }

    private static HashSet<DayOfWeek> ParseWeeklyDaysMask(int weeklyDaysMask)
    {
        var mask = (WeeklyDayMask)weeklyDaysMask;
        var days = new HashSet<DayOfWeek>();

        if (mask.HasFlag(WeeklyDayMask.Sunday)) days.Add(DayOfWeek.Sunday);
        if (mask.HasFlag(WeeklyDayMask.Monday)) days.Add(DayOfWeek.Monday);
        if (mask.HasFlag(WeeklyDayMask.Tuesday)) days.Add(DayOfWeek.Tuesday);
        if (mask.HasFlag(WeeklyDayMask.Wednesday)) days.Add(DayOfWeek.Wednesday);
        if (mask.HasFlag(WeeklyDayMask.Thursday)) days.Add(DayOfWeek.Thursday);
        if (mask.HasFlag(WeeklyDayMask.Friday)) days.Add(DayOfWeek.Friday);
        if (mask.HasFlag(WeeklyDayMask.Saturday)) days.Add(DayOfWeek.Saturday);

        return days;
    }
}
