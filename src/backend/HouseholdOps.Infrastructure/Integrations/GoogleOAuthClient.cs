using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace HouseholdOps.Infrastructure.Integrations;

internal sealed class GoogleOAuthClient(
    HttpClient httpClient,
    IConfiguration configuration) : IGoogleOAuthClient
{
    private static readonly string[] Scopes =
    [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.readonly"
    ];

    public string BuildAuthorizationUrl(string state)
    {
        var clientId = GetRequiredConfig("GOOGLE_CLIENT_ID");
        var redirectUri = GetRequiredConfig("GOOGLE_OAUTH_REDIRECT_URI");
        var scope = Uri.EscapeDataString(string.Join(' ', Scopes));

        return "https://accounts.google.com/o/oauth2/v2/auth"
            + $"?client_id={Uri.EscapeDataString(clientId)}"
            + $"&redirect_uri={Uri.EscapeDataString(redirectUri)}"
            + "&response_type=code"
            + $"&scope={scope}"
            + "&access_type=offline"
            + "&prompt=consent"
            + $"&state={Uri.EscapeDataString(state)}";
    }

    public async Task<GoogleOAuthTokenResult> ExchangeCodeAsync(
        string code,
        CancellationToken cancellationToken)
    {
        var response = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = GetRequiredConfig("GOOGLE_CLIENT_ID"),
                ["client_secret"] = GetRequiredConfig("GOOGLE_CLIENT_SECRET"),
                ["code"] = code,
                ["grant_type"] = "authorization_code",
                ["redirect_uri"] = GetRequiredConfig("GOOGLE_OAUTH_REDIRECT_URI")
            }),
            cancellationToken);

        var payload = await response.Content.ReadFromJsonAsync<TokenPayload>(cancellationToken)
            ?? throw new InvalidOperationException("Google OAuth token exchange returned no payload.");

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            throw new InvalidOperationException(
                payload.ErrorDescription
                ?? payload.Error
                ?? $"Google OAuth token exchange failed with {(int)response.StatusCode}.");
        }

        return new GoogleOAuthTokenResult(
            payload.AccessToken,
            payload.TokenType ?? "Bearer",
            payload.ExpiresIn,
            payload.Scope ?? string.Join(' ', Scopes),
            payload.RefreshToken);
    }

    public async Task<GoogleOAuthUserProfile> GetUserProfileAsync(
        string accessToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://openidconnect.googleapis.com/v1/userinfo");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<UserInfoPayload>(cancellationToken)
            ?? throw new InvalidOperationException("Google OAuth user profile lookup returned no payload.");

        if (!response.IsSuccessStatusCode
            || string.IsNullOrWhiteSpace(payload.Subject)
            || string.IsNullOrWhiteSpace(payload.Email))
        {
            throw new InvalidOperationException(
                $"Google OAuth user profile lookup failed with {(int)response.StatusCode}.");
        }

        return new GoogleOAuthUserProfile(
            payload.Subject,
            payload.Email,
            payload.Name);
    }

    private string GetRequiredConfig(string key) =>
        string.IsNullOrWhiteSpace(configuration[key]?.Trim().Trim('"'))
            ? throw new InvalidOperationException($"{key} is required for Google OAuth.")
            : configuration[key]!.Trim().Trim('"');

    private sealed class TokenPayload
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; init; }

        [JsonPropertyName("token_type")]
        public string? TokenType { get; init; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; init; }

        [JsonPropertyName("scope")]
        public string? Scope { get; init; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; init; }

        [JsonPropertyName("error")]
        public string? Error { get; init; }

        [JsonPropertyName("error_description")]
        public string? ErrorDescription { get; init; }
    }

    private sealed class UserInfoPayload
    {
        [JsonPropertyName("sub")]
        public string? Subject { get; init; }

        [JsonPropertyName("email")]
        public string? Email { get; init; }

        [JsonPropertyName("name")]
        public string? Name { get; init; }
    }
}
