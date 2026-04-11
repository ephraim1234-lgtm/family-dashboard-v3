using System.Globalization;
using HouseholdOps.Modules.Scheduling;

namespace HouseholdOps.Infrastructure.Integrations;

internal sealed class GoogleCalendarIcsParser
{
    public GoogleCalendarParseResult Parse(string icsContent)
    {
        if (!icsContent.Contains("BEGIN:VCALENDAR", StringComparison.OrdinalIgnoreCase))
        {
            return GoogleCalendarParseResult.InvalidFeed("The feed did not contain a VCALENDAR payload.");
        }

        var unfoldedLines = UnfoldLines(icsContent);
        var events = new List<ImportedScheduledEvent>();
        var skippedRecurringEventCount = 0;
        var invalidEventCount = 0;
        var encounteredEventCount = 0;
        Dictionary<string, string>? current = null;
        string? calendarTimeZoneId = null;

        foreach (var line in unfoldedLines)
        {
            if (string.Equals(line, "BEGIN:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                encounteredEventCount++;
                current = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                continue;
            }

            if (string.Equals(line, "END:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                if (current is not null)
                {
                    var imported = TryMapEvent(
                        current,
                        calendarTimeZoneId,
                        out var skippedUnsupportedRecurrence);
                    if (imported is not null)
                    {
                        events.Add(imported);
                    }
                    else
                    {
                        if (skippedUnsupportedRecurrence)
                        {
                            skippedRecurringEventCount++;
                        }
                        else
                        {
                            invalidEventCount++;
                        }
                    }
                }

                current = null;
                continue;
            }

            if (current is null)
            {
                if (line.StartsWith("X-WR-TIMEZONE:", StringComparison.OrdinalIgnoreCase))
                {
                    calendarTimeZoneId = line["X-WR-TIMEZONE:".Length..].Trim();
                }

                continue;
            }

            var separatorIndex = line.IndexOf(':');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = line[..separatorIndex];
            var value = line[(separatorIndex + 1)..];
            current[key] = value;
        }

        if (encounteredEventCount > 0
            && events.Count == 0
            && skippedRecurringEventCount == 0
            && invalidEventCount > 0)
        {
            return GoogleCalendarParseResult.InvalidFeed(
                "The feed contained calendar events, but none could be imported.");
        }

        return GoogleCalendarParseResult.Success(
            events,
            skippedRecurringEventCount,
            invalidEventCount,
            encounteredEventCount);
    }

    private static IReadOnlyList<string> UnfoldLines(string icsContent)
    {
        var normalized = icsContent
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n');

        var rawLines = normalized.Split('\n');
        var lines = new List<string>();

        foreach (var rawLine in rawLines)
        {
            if ((rawLine.StartsWith(' ') || rawLine.StartsWith('\t')) && lines.Count > 0)
            {
                lines[^1] += rawLine[1..];
                continue;
            }

            lines.Add(rawLine.TrimEnd());
        }

        return lines;
    }

    private static ImportedScheduledEvent? TryMapEvent(
        IReadOnlyDictionary<string, string> values,
        string? calendarTimeZoneId,
        out bool skippedUnsupportedRecurrence)
    {
        skippedUnsupportedRecurrence = false;

        if (!TryGetValue(values, "UID", out var uid)
            || !TryGetValue(values, "SUMMARY", out var summary)
            || !TryParseDate(values, "DTSTART", calendarTimeZoneId, out var startsAtUtc, out var isAllDay))
        {
            return null;
        }

        var description = TryGetValue(values, "DESCRIPTION", out var rawDescription)
            ? CalendarTextDecoder.Decode(rawDescription)
            : null;

        var recurrence = TryParseRecurrence(values, startsAtUtc);
        if (TryGetValue(values, "RRULE", out _)
            && recurrence is null)
        {
            skippedUnsupportedRecurrence = true;
            return null;
        }

        DateTimeOffset? endsAtUtc = null;
        if (TryParseDate(values, "DTEND", calendarTimeZoneId, out var parsedEndsAtUtc, out var endsAtIsAllDay))
        {
            endsAtUtc = isAllDay && endsAtIsAllDay
                ? parsedEndsAtUtc.AddDays(-1)
                : parsedEndsAtUtc;
        }

        return new ImportedScheduledEvent(
            uid,
            CalendarTextDecoder.Decode(summary).Trim(),
            description?.Trim(),
            isAllDay,
            startsAtUtc,
            endsAtUtc,
            recurrence?.Pattern ?? EventRecurrencePattern.None,
            recurrence?.WeeklyDaysMask ?? 0,
            recurrence?.RecursUntilUtc);
    }

    private static bool TryParseDate(
        IReadOnlyDictionary<string, string> values,
        string propertyName,
        string? calendarTimeZoneId,
        out DateTimeOffset value,
        out bool isAllDay)
    {
        foreach (var entry in values)
        {
            if (!entry.Key.StartsWith(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            isAllDay = entry.Key.Contains("VALUE=DATE", StringComparison.OrdinalIgnoreCase);
            var timeZoneId = TryGetTimeZoneId(entry.Key) ?? calendarTimeZoneId;

            if (isAllDay
                && DateTime.TryParseExact(
                    entry.Value,
                    "yyyyMMdd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                    out var date))
            {
                value = new DateTimeOffset(
                    DateTime.SpecifyKind(date.Date, DateTimeKind.Utc));
                return true;
            }

            if (DateTimeOffset.TryParseExact(
                entry.Value,
                new[] { "yyyyMMdd'T'HHmmss'Z'", "yyyyMMdd'T'HHmmss" },
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var timestamp))
            {
                if (!entry.Value.EndsWith('Z')
                    && !string.IsNullOrWhiteSpace(timeZoneId))
                {
                    var resolvedTimeZone = TimeZoneResolver.Resolve(timeZoneId);
                    if (resolvedTimeZone is not null)
                    {
                        var unspecified = DateTime.SpecifyKind(
                            timestamp.DateTime,
                            DateTimeKind.Unspecified);
                        value = TimeZoneInfo.ConvertTimeToUtc(
                            unspecified,
                            resolvedTimeZone);
                        value = new DateTimeOffset(value.UtcDateTime, TimeSpan.Zero);
                        return true;
                    }
                }

                value = timestamp.ToUniversalTime();
                return true;
            }
        }

        value = default;
        isAllDay = false;
        return false;
    }

    private static bool TryGetValue(
        IReadOnlyDictionary<string, string> values,
        string propertyName,
        out string value)
    {
        foreach (var entry in values)
        {
            if (entry.Key.StartsWith(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = entry.Value;
                return true;
            }
        }

        value = string.Empty;
        return false;
    }

    private static string? TryGetTimeZoneId(string propertyKey)
    {
        const string marker = "TZID=";
        var markerIndex = propertyKey.IndexOf(marker, StringComparison.OrdinalIgnoreCase);

        if (markerIndex < 0)
        {
            return null;
        }

        var start = markerIndex + marker.Length;
        var end = propertyKey.IndexOf(';', start);
        return end >= 0
            ? propertyKey[start..end]
            : propertyKey[start..];
    }

    private static ImportedRecurrence? TryParseRecurrence(
        IReadOnlyDictionary<string, string> values,
        DateTimeOffset startsAtUtc)
    {
        if (!TryGetValue(values, "RRULE", out var rrule))
        {
            return null;
        }

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

        if (segments.ContainsKey("COUNT"))
        {
            return null;
        }

        if (string.Equals(frequency, "DAILY", StringComparison.OrdinalIgnoreCase))
        {
            return new ImportedRecurrence(
                EventRecurrencePattern.Daily,
                0,
                TryParseUntil(segments, startsAtUtc));
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
                    TryParseUntil(segments, startsAtUtc));
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
}

internal sealed record ImportedRecurrence(
    EventRecurrencePattern Pattern,
    int WeeklyDaysMask,
    DateTimeOffset? RecursUntilUtc);

internal sealed record GoogleCalendarParseResult(
    IReadOnlyList<ImportedScheduledEvent> Events,
    int SkippedRecurringEventCount,
    int InvalidEventCount,
    int EncounteredEventCount,
    bool IsValidFeed,
    string? Error)
{
    public static GoogleCalendarParseResult Success(
        IReadOnlyList<ImportedScheduledEvent> events,
        int skippedRecurringEventCount,
        int invalidEventCount,
        int encounteredEventCount) =>
        new(
            events,
            skippedRecurringEventCount,
            invalidEventCount,
            encounteredEventCount,
            true,
            null);

    public static GoogleCalendarParseResult InvalidFeed(string error) =>
        new(
            [],
            0,
            0,
            0,
            false,
            error);
}
