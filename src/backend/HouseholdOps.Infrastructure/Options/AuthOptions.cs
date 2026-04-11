namespace HouseholdOps.Infrastructure.Options;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string CookieName { get; set; } = "householdops.session";

    public int SessionLifetimeDays { get; set; } = 30;

    public bool RequireSecureCookies { get; set; }
}
