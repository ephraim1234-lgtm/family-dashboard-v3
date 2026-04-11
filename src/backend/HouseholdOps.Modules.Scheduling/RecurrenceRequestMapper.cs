using System.Globalization;
using HouseholdOps.Modules.Scheduling.Contracts;

namespace HouseholdOps.Modules.Scheduling;

public static class RecurrenceRequestMapper
{
    private static readonly (WeeklyDayMask Mask, string Name)[] WeeklyDayMappings =
    {
        (WeeklyDayMask.Monday, DayOfWeek.Monday.ToString()),
        (WeeklyDayMask.Tuesday, DayOfWeek.Tuesday.ToString()),
        (WeeklyDayMask.Wednesday, DayOfWeek.Wednesday.ToString()),
        (WeeklyDayMask.Thursday, DayOfWeek.Thursday.ToString()),
        (WeeklyDayMask.Friday, DayOfWeek.Friday.ToString()),
        (WeeklyDayMask.Saturday, DayOfWeek.Saturday.ToString()),
        (WeeklyDayMask.Sunday, DayOfWeek.Sunday.ToString())
    };

    public static bool TryMap(
        ScheduledEventRecurrenceRequest? request,
        out EventRecurrencePattern pattern,
        out int weeklyDaysMask,
        out DateTimeOffset? recursUntilUtc,
        out string? error)
    {
        pattern = EventRecurrencePattern.None;
        weeklyDaysMask = 0;
        recursUntilUtc = null;
        error = null;

        if (request is null || string.IsNullOrWhiteSpace(request.Pattern))
        {
            return true;
        }

        if (!Enum.TryParse<EventRecurrencePattern>(
            request.Pattern,
            ignoreCase: true,
            out pattern))
        {
            error = "Recurrence pattern must be None, Daily, or Weekly.";
            return false;
        }

        recursUntilUtc = request.RecursUntilUtc;

        if (pattern == EventRecurrencePattern.None)
        {
            return true;
        }

        if (pattern == EventRecurrencePattern.Daily)
        {
            return true;
        }

        if (request.WeeklyDays is null || request.WeeklyDays.Count == 0)
        {
            error = "Weekly recurrence requires at least one weekday.";
            return false;
        }

        foreach (var day in request.WeeklyDays)
        {
            if (!Enum.TryParse<DayOfWeek>(day, ignoreCase: true, out var parsedDay))
            {
                error = "Weekly recurrence contains an invalid weekday.";
                return false;
            }

            weeklyDaysMask |= parsedDay switch
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
        }

        return true;
    }

    public static IReadOnlyList<string> ToWeekdayNames(int weeklyDaysMask) =>
        WeeklyDayMappings
            .Where(mapping => ((WeeklyDayMask)weeklyDaysMask).HasFlag(mapping.Mask))
            .Select(mapping => mapping.Name)
            .ToArray();

    public static string ToSummary(
        EventRecurrencePattern pattern,
        int weeklyDaysMask,
        DateTimeOffset? recursUntilUtc)
    {
        var recurrenceLabel = pattern switch
        {
            EventRecurrencePattern.Daily => "Daily",
            EventRecurrencePattern.Weekly => $"Weekly on {string.Join(", ", ToWeekdayNames(weeklyDaysMask))}",
            _ => "One-time"
        };

        return recursUntilUtc.HasValue && pattern != EventRecurrencePattern.None
            ? $"{recurrenceLabel} until {recursUntilUtc.Value.ToString("MMM d, yyyy h:mm tt", CultureInfo.InvariantCulture)} UTC"
            : recurrenceLabel;
    }
}
