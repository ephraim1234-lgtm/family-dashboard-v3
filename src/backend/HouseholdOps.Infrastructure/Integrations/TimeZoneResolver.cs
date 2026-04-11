namespace HouseholdOps.Infrastructure.Integrations;

internal static class TimeZoneResolver
{
    private static readonly IReadOnlyDictionary<string, string> IanaToWindowsMap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Etc/UTC"] = "UTC",
            ["UTC"] = "UTC",
            ["GMT"] = "UTC",
            ["Etc/GMT"] = "UTC",
            ["Etc/GMT0"] = "UTC",
            ["America/Chicago"] = "Central Standard Time",
            ["America/New_York"] = "Eastern Standard Time",
            ["America/Denver"] = "Mountain Standard Time",
            ["America/Los_Angeles"] = "Pacific Standard Time",
            ["America/Phoenix"] = "US Mountain Standard Time",
            ["US/Central"] = "Central Standard Time",
            ["US/Eastern"] = "Eastern Standard Time",
            ["US/Mountain"] = "Mountain Standard Time",
            ["US/Pacific"] = "Pacific Standard Time",
            ["US/Arizona"] = "US Mountain Standard Time",
            ["CST6CDT"] = "Central Standard Time",
            ["EST5EDT"] = "Eastern Standard Time",
            ["MST7MDT"] = "Mountain Standard Time",
            ["PST8PDT"] = "Pacific Standard Time",
            ["Europe/London"] = "GMT Standard Time",
            ["Europe/Dublin"] = "GMT Standard Time",
            ["Europe/Paris"] = "Romance Standard Time",
            ["Europe/Berlin"] = "W. Europe Standard Time"
        };

    public static TimeZoneInfo? Resolve(string? timeZoneId)
    {
        var normalizedTimeZoneId = NormalizeTimeZoneId(timeZoneId);

        if (string.IsNullOrWhiteSpace(normalizedTimeZoneId))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(normalizedTimeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            if (IanaToWindowsMap.TryGetValue(normalizedTimeZoneId, out var windowsId))
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

    private static string? NormalizeTimeZoneId(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return null;
        }

        var normalized = timeZoneId.Trim().Trim('"');

        const string freeAssociationPrefix = "/freeassociation.sourceforge.net/";
        if (normalized.StartsWith(freeAssociationPrefix, StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[freeAssociationPrefix.Length..];
        }

        const string tzFilePrefix = "Tzfile/";
        if (normalized.StartsWith(tzFilePrefix, StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[tzFilePrefix.Length..];
        }

        if (normalized.StartsWith('/') && normalized.Count(character => character == '/') >= 2)
        {
            normalized = normalized[1..];
        }

        return normalized;
    }
}
