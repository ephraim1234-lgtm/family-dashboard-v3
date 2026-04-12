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
            0,
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

        return GoogleCalendarRecurrenceParser.TryParseRRule(rrule, startsAtUtc);
    }
}

internal sealed record ImportedRecurrence(
    EventRecurrencePattern Pattern,
    int WeeklyDaysMask,
    DateTimeOffset? RecursUntilUtc);

internal sealed record GoogleCalendarParseResult(
    IReadOnlyList<ImportedScheduledEvent> Events,
    int SkippedRecurringEventCount,
    int SkippedRecurringOverrideCount,
    int InvalidEventCount,
    int EncounteredEventCount,
    bool IsValidFeed,
    string? Error)
{
    public static GoogleCalendarParseResult Success(
        IReadOnlyList<ImportedScheduledEvent> events,
        int skippedRecurringEventCount,
        int skippedRecurringOverrideCount,
        int invalidEventCount,
        int encounteredEventCount) =>
        new(
            events,
            skippedRecurringEventCount,
            skippedRecurringOverrideCount,
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
            0,
            false,
            error);
}
