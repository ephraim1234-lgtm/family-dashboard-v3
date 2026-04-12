namespace HouseholdOps.Infrastructure.Integrations;

public interface IGoogleOAuthClient
{
    string BuildAuthorizationUrl(string state);

    Task<GoogleOAuthTokenResult> ExchangeCodeAsync(
        string code,
        CancellationToken cancellationToken);

    Task<GoogleOAuthUserProfile> GetUserProfileAsync(
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
