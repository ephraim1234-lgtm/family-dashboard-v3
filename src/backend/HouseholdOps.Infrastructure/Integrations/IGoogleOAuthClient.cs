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

    Task<IReadOnlyList<GoogleOAuthCalendarEvent>> GetCalendarEventsAsync(
        string accessToken,
        string calendarId,
        CancellationToken cancellationToken);

    Task<GoogleOAuthCalendarEvent> CreateCalendarEventAsync(
        string accessToken,
        string calendarId,
        GoogleOAuthCalendarEventUpsertRequest request,
        CancellationToken cancellationToken);

    Task<GoogleOAuthCalendarEvent> UpdateCalendarEventAsync(
        string accessToken,
        string calendarId,
        string eventId,
        GoogleOAuthCalendarEventUpsertRequest request,
        CancellationToken cancellationToken);

    Task DeleteCalendarEventAsync(
        string accessToken,
        string calendarId,
        string eventId,
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

public sealed record GoogleOAuthCalendarEvent(
    string Id,
    string? Summary,
    string? Description,
    string Status,
    string? Date,
    string? DateTime,
    string? TimeZone,
    string? EndDate,
    string? EndDateTime,
    string? EndTimeZone,
    IReadOnlyList<string> Recurrence,
    string? RecurringEventId);

public sealed record GoogleOAuthCalendarEventUpsertRequest(
    string EventId,
    string Summary,
    string? Description,
    bool IsAllDay,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    string? TimeZoneId,
    IReadOnlyList<string> Recurrence,
    IReadOnlyDictionary<string, string> PrivateExtendedProperties);

public sealed class GoogleOAuthClientException(
    string message,
    int statusCode,
    string? responseBody = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    public string? ResponseBody { get; } = responseBody;
}
