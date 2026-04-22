namespace HouseholdOps.Modules.Scheduling;

public static class ScheduleWindowQueryParser
{
    public static int ParseWindowDays(
        string? rawDays,
        int fallbackDays = 14)
    {
        if (!int.TryParse(rawDays, out var parsedDays))
        {
            return fallbackDays;
        }

        return parsedDays switch
        {
            7 => 7,
            14 => 14,
            30 => 30,
            42 => 42,
            _ => fallbackDays
        };
    }

    public static DateTimeOffset ParseWindowStartUtc(
        string? rawStartUtc,
        DateTimeOffset fallbackUtcNow)
    {
        if (DateTimeOffset.TryParse(rawStartUtc, out var parsedStartUtc))
        {
            return new DateTimeOffset(
                parsedStartUtc.UtcDateTime.Date,
                TimeSpan.Zero);
        }

        return new DateTimeOffset(
            fallbackUtcNow.UtcDateTime.Date,
            TimeSpan.Zero);
    }
}
