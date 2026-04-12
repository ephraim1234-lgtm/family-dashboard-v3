using System.Globalization;
using HouseholdOps.Modules.Scheduling;

namespace HouseholdOps.Infrastructure.Integrations;

internal static class GoogleCalendarApiEventMapper
{
    public static GoogleCalendarParseResult Parse(
        IReadOnlyList<GoogleOAuthCalendarEvent> events,
        string? calendarTimeZone)
    {
        var importedEvents = new List<ImportedScheduledEvent>();
        var skippedRecurringEventCount = 0;
        var skippedRecurringOverrideCount = 0;
        var invalidEventCount = 0;
        var encounteredEventCount = 0;

        foreach (var calendarEvent in events)
        {
            if (string.Equals(calendarEvent.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            encounteredEventCount++;

            var imported = TryMapEvent(
                calendarEvent,
                calendarTimeZone,
                out var skippedUnsupportedRecurrence);

            if (imported is not null)
            {
                importedEvents.Add(imported);
            }
            else if (calendarEvent.RecurringEventId is not null)
            {
                skippedRecurringOverrideCount++;
            }
            else if (skippedUnsupportedRecurrence)
            {
                skippedRecurringEventCount++;
            }
            else
            {
                invalidEventCount++;
            }
        }

        return GoogleCalendarParseResult.Success(
            importedEvents,
            skippedRecurringEventCount,
            skippedRecurringOverrideCount,
            invalidEventCount,
            encounteredEventCount);
    }

    private static ImportedScheduledEvent? TryMapEvent(
        GoogleOAuthCalendarEvent calendarEvent,
        string? calendarTimeZone,
        out bool skippedUnsupportedRecurrence)
    {
        skippedUnsupportedRecurrence = false;

        if (string.IsNullOrWhiteSpace(calendarEvent.Id)
            || string.IsNullOrWhiteSpace(calendarEvent.Summary)
            || !TryParseEventDate(
                calendarEvent.Date,
                calendarEvent.DateTime,
                calendarEvent.TimeZone ?? calendarTimeZone,
                out var startsAtUtc,
                out var isAllDay))
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(calendarEvent.RecurringEventId))
        {
            skippedUnsupportedRecurrence = true;
            return null;
        }

        var recurrence = GoogleCalendarRecurrenceParser.TryParse(
            calendarEvent.Recurrence,
            startsAtUtc);

        if (calendarEvent.Recurrence.Count > 0
            && recurrence is null)
        {
            skippedUnsupportedRecurrence = true;
            return null;
        }

        DateTimeOffset? endsAtUtc = null;
        if (TryParseEventDate(
            calendarEvent.EndDate,
            calendarEvent.EndDateTime,
            calendarEvent.EndTimeZone ?? calendarEvent.TimeZone ?? calendarTimeZone,
            out var parsedEndsAtUtc,
            out var endsAtIsAllDay))
        {
            endsAtUtc = isAllDay && endsAtIsAllDay
                ? parsedEndsAtUtc.AddDays(-1)
                : parsedEndsAtUtc;
        }

        return new ImportedScheduledEvent(
            calendarEvent.Id,
            calendarEvent.Summary.Trim(),
            calendarEvent.Description?.Trim(),
            isAllDay,
            startsAtUtc,
            endsAtUtc,
            recurrence?.Pattern ?? EventRecurrencePattern.None,
            recurrence?.WeeklyDaysMask ?? 0,
            recurrence?.RecursUntilUtc);
    }

    private static bool TryParseEventDate(
        string? allDayDate,
        string? dateTime,
        string? timeZoneId,
        out DateTimeOffset value,
        out bool isAllDay)
    {
        if (!string.IsNullOrWhiteSpace(allDayDate)
            && DateTime.TryParseExact(
                allDayDate,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsedDate))
        {
            isAllDay = true;
            value = new DateTimeOffset(DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc));
            return true;
        }

        if (!string.IsNullOrWhiteSpace(dateTime))
        {
            if (DateTimeOffset.TryParse(
                dateTime,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind | DateTimeStyles.AssumeUniversal,
                out var parsedTimestamp))
            {
                isAllDay = false;
                value = parsedTimestamp.ToUniversalTime();
                return true;
            }

            if (!string.IsNullOrWhiteSpace(timeZoneId)
                && DateTime.TryParse(
                    dateTime,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var floatingTimestamp))
            {
                var resolvedTimeZone = TimeZoneResolver.Resolve(timeZoneId);
                if (resolvedTimeZone is not null)
                {
                    isAllDay = false;
                    var unspecified = DateTime.SpecifyKind(floatingTimestamp, DateTimeKind.Unspecified);
                    value = new DateTimeOffset(
                        TimeZoneInfo.ConvertTimeToUtc(unspecified, resolvedTimeZone),
                        TimeSpan.Zero);
                    return true;
                }
            }
        }

        value = default;
        isAllDay = false;
        return false;
    }
}
