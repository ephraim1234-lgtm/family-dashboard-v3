namespace HouseholdOps.Infrastructure.Integrations;

internal static class TimeZoneResolver
{
    private static readonly IReadOnlyDictionary<string, string> IanaToWindowsMap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Etc/UTC"] = "UTC",
            ["UTC"] = "UTC",
            ["America/Chicago"] = "Central Standard Time",
            ["America/New_York"] = "Eastern Standard Time",
            ["America/Denver"] = "Mountain Standard Time",
            ["America/Los_Angeles"] = "Pacific Standard Time",
            ["America/Phoenix"] = "US Mountain Standard Time"
        };

    public static TimeZoneInfo? Resolve(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            if (IanaToWindowsMap.TryGetValue(timeZoneId, out var windowsId))
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(windowsId);
                }
                catch (TimeZoneNotFoundException)
                {
                    return null;
                }
            }

            return null;
        }
        catch (InvalidTimeZoneException)
        {
            return null;
        }
    }
}
