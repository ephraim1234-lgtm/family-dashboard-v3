namespace HouseholdOps.Infrastructure.Integrations;

internal static class CalendarTextDecoder
{
    public static string Decode(string value) =>
        value
            .Replace("\\\\", "\\", StringComparison.Ordinal)
            .Replace("\\n", "\n", StringComparison.OrdinalIgnoreCase)
            .Replace("\\N", "\n", StringComparison.Ordinal)
            .Replace("\\,", ",", StringComparison.Ordinal)
            .Replace("\\;", ";", StringComparison.Ordinal);
}
