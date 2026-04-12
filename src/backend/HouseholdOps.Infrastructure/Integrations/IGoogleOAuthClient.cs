namespace HouseholdOps.Infrastructure.Integrations;

public interface IGoogleOAuthClient
{
    string BuildAuthorizationUrl(string state);

    Task<GoogleOAuthTokenResult> ExchangeCodeAsync(
        string code,
        CancellationToken cancellationToken);

    Task<GoogleOAuthTokenResult> RefreshAccessTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken);

    Task<GoogleOAuthUserProfile> GetUserProfileAsync(
        string accessToken,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<GoogleOAuthCalendarSummary>> GetCalendarsAsync(
        string accessToken,
        CancellationToken cancellationToken);
}

public sealed record GoogleOAuthTokenResult(
    string AccessToken,
    string TokenType,
    int ExpiresInSeconds,
    string Scope,
    string? RefreshToken);

public sealed record GoogleOAuthUserProfile(
    string Subject,
    string Email,
    string? Name);

public sealed record GoogleOAuthCalendarSummary(
    string Id,
    string Summary,
    bool IsPrimary,
    string? AccessRole,
    string? TimeZone);
