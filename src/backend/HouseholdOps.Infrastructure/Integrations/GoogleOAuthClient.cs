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
        "https://www.googleapis.com/auth/calendar"
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
        return await SendTokenRequestAsync(
            new Dictionary<string, string>
            {
                ["client_id"] = GetRequiredConfig("GOOGLE_CLIENT_ID"),
                ["client_secret"] = GetRequiredConfig("GOOGLE_CLIENT_SECRET"),
                ["code"] = code,
                ["grant_type"] = "authorization_code",
                ["redirect_uri"] = GetRequiredConfig("GOOGLE_OAUTH_REDIRECT_URI")
            },
            "exchange",
            cancellationToken);
    }

    public async Task<GoogleOAuthTokenResult> RefreshAccessTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken)
    {
        return await SendTokenRequestAsync(
            new Dictionary<string, string>
            {
                ["client_id"] = GetRequiredConfig("GOOGLE_CLIENT_ID"),
                ["client_secret"] = GetRequiredConfig("GOOGLE_CLIENT_SECRET"),
                ["refresh_token"] = refreshToken,
                ["grant_type"] = "refresh_token"
            },
            "refresh",
            cancellationToken);
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

    public async Task<IReadOnlyList<GoogleOAuthCalendarSummary>> GetCalendarsAsync(
        string accessToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "https://www.googleapis.com/calendar/v3/users/me/calendarList");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<CalendarListPayload>(cancellationToken)
            ?? throw new InvalidOperationException("Google Calendar list lookup returned no payload.");

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Google Calendar list lookup failed with {(int)response.StatusCode}.");
        }

        return (payload.Items ?? [])
            .Where(item => !string.IsNullOrWhiteSpace(item.Id) && !string.IsNullOrWhiteSpace(item.Summary))
            .Select(item => new GoogleOAuthCalendarSummary(
                item.Id!,
                item.Summary!,
                item.Primary,
                item.AccessRole,
                item.TimeZone))
            .ToList();
    }

    public async Task<IReadOnlyList<GoogleOAuthCalendarEvent>> GetCalendarEventsAsync(
        string accessToken,
        string calendarId,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"https://www.googleapis.com/calendar/v3/calendars/{Uri.EscapeDataString(calendarId)}/events?singleEvents=false&showDeleted=false");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<CalendarEventsPayload>(cancellationToken)
            ?? throw new InvalidOperationException("Google Calendar event lookup returned no payload.");

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Google Calendar event lookup failed with {(int)response.StatusCode}.");
        }

        return (payload.Items ?? [])
            .Where(item => !string.IsNullOrWhiteSpace(item.Id))
            .Select(item => new GoogleOAuthCalendarEvent(
                item.Id!,
                item.Summary,
                item.Description,
                item.Status ?? "confirmed",
                item.Start?.Date,
                item.Start?.DateTime,
                item.Start?.TimeZone,
                item.End?.Date,
                item.End?.DateTime,
                item.End?.TimeZone,
                item.Recurrence ?? [],
                item.RecurringEventId))
            .ToList();
    }

    public async Task<GoogleOAuthCalendarEvent> CreateCalendarEventAsync(
        string accessToken,
        string calendarId,
        GoogleOAuthCalendarEventUpsertRequest request,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://www.googleapis.com/calendar/v3/calendars/{Uri.EscapeDataString(calendarId)}/events");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpRequest.Content = JsonContent.Create(CreateEventPayload(request));

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<CalendarEventPayload>(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            await ThrowCalendarEventExceptionAsync(response, "create");
        }

        if (payload is null || string.IsNullOrWhiteSpace(payload.Id))
        {
            throw new InvalidOperationException("Google Calendar event create returned no event payload.");
        }

        return MapEvent(payload);
    }

    public async Task<GoogleOAuthCalendarEvent> UpdateCalendarEventAsync(
        string accessToken,
        string calendarId,
        string eventId,
        GoogleOAuthCalendarEventUpsertRequest request,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Put,
            $"https://www.googleapis.com/calendar/v3/calendars/{Uri.EscapeDataString(calendarId)}/events/{Uri.EscapeDataString(eventId)}");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        httpRequest.Content = JsonContent.Create(CreateEventPayload(request));

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<CalendarEventPayload>(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            await ThrowCalendarEventExceptionAsync(response, "update");
        }

        if (payload is null || string.IsNullOrWhiteSpace(payload.Id))
        {
            throw new InvalidOperationException("Google Calendar event update returned no event payload.");
        }

        return MapEvent(payload);
    }

    public async Task DeleteCalendarEventAsync(
        string accessToken,
        string calendarId,
        string eventId,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Delete,
            $"https://www.googleapis.com/calendar/v3/calendars/{Uri.EscapeDataString(calendarId)}/events/{Uri.EscapeDataString(eventId)}");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            await ThrowCalendarEventExceptionAsync(response, "delete");
        }
    }

    private string GetRequiredConfig(string key) =>
        string.IsNullOrWhiteSpace(configuration[key]?.Trim().Trim('"'))
            ? throw new InvalidOperationException($"{key} is required for Google OAuth.")
            : configuration[key]!.Trim().Trim('"');

    private async Task<GoogleOAuthTokenResult> SendTokenRequestAsync(
        Dictionary<string, string> parameters,
        string operationName,
        CancellationToken cancellationToken)
    {
        var response = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(parameters),
            cancellationToken);

        var payload = await response.Content.ReadFromJsonAsync<TokenPayload>(cancellationToken)
            ?? throw new InvalidOperationException($"Google OAuth token {operationName} returned no payload.");

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            throw new InvalidOperationException(
                payload.ErrorDescription
                ?? payload.Error
                ?? $"Google OAuth token {operationName} failed with {(int)response.StatusCode}.");
        }

        return new GoogleOAuthTokenResult(
            payload.AccessToken,
            payload.TokenType ?? "Bearer",
            payload.ExpiresIn,
            payload.Scope ?? string.Join(' ', Scopes),
            payload.RefreshToken);
    }

    private static CalendarEventMutationPayload CreateEventPayload(
        GoogleOAuthCalendarEventUpsertRequest request)
    {
        var endAtUtc = request.EndsAtUtc ?? request.StartsAtUtc;
        var recurrence = request.Recurrence.Count == 0 ? null : request.Recurrence;

        if (request.IsAllDay)
        {
            return new CalendarEventMutationPayload
            {
                Id = request.EventId,
                Summary = request.Summary,
                Description = request.Description,
                Start = new CalendarEventMutationDatePayload
                {
                    Date = request.StartsAtUtc.UtcDateTime.ToString("yyyy-MM-dd")
                },
                End = new CalendarEventMutationDatePayload
                {
                    Date = endAtUtc.UtcDateTime.Date.AddDays(1).ToString("yyyy-MM-dd")
                },
                Recurrence = recurrence,
                ExtendedProperties = CreateExtendedProperties(request.PrivateExtendedProperties)
            };
        }

        var startDateTime = request.StartsAtUtc;
        var endDateTime = endAtUtc;

        if (!string.IsNullOrWhiteSpace(request.TimeZoneId))
        {
            var resolvedTimeZone = TimeZoneResolver.Resolve(request.TimeZoneId);
            if (resolvedTimeZone is not null)
            {
                startDateTime = TimeZoneInfo.ConvertTime(request.StartsAtUtc, resolvedTimeZone);
                endDateTime = TimeZoneInfo.ConvertTime(endAtUtc, resolvedTimeZone);
            }
        }

        return new CalendarEventMutationPayload
        {
            Id = request.EventId,
            Summary = request.Summary,
            Description = request.Description,
            Start = new CalendarEventMutationDatePayload
            {
                DateTime = startDateTime.ToString("O"),
                TimeZone = request.TimeZoneId
            },
            End = new CalendarEventMutationDatePayload
            {
                DateTime = endDateTime.ToString("O"),
                TimeZone = request.TimeZoneId
            },
            Recurrence = recurrence,
            ExtendedProperties = CreateExtendedProperties(request.PrivateExtendedProperties)
        };
    }

    private static CalendarEventExtendedPropertiesPayload? CreateExtendedProperties(
        IReadOnlyDictionary<string, string> values)
    {
        if (values.Count == 0)
        {
            return null;
        }

        return new CalendarEventExtendedPropertiesPayload
        {
            Private = new Dictionary<string, string>(values, StringComparer.Ordinal)
        };
    }

    private static GoogleOAuthCalendarEvent MapEvent(CalendarEventPayload item) =>
        new(
            item.Id!,
            item.Summary,
            item.Description,
            item.Status ?? "confirmed",
            item.Start?.Date,
            item.Start?.DateTime,
            item.Start?.TimeZone,
            item.End?.Date,
            item.End?.DateTime,
            item.End?.TimeZone,
            item.Recurrence ?? [],
            item.RecurringEventId);

    private async Task ThrowCalendarEventExceptionAsync(
        HttpResponseMessage response,
        string operationName)
    {
        var body = await response.Content.ReadAsStringAsync();
        throw new GoogleOAuthClientException(
            $"Google Calendar event {operationName} failed with {(int)response.StatusCode}.",
            (int)response.StatusCode,
            string.IsNullOrWhiteSpace(body) ? null : body);
    }

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

    private sealed class CalendarListPayload
    {
        [JsonPropertyName("items")]
        public CalendarPayload[]? Items { get; init; }
    }

    private sealed class CalendarPayload
    {
        [JsonPropertyName("id")]
        public string? Id { get; init; }

        [JsonPropertyName("summary")]
        public string? Summary { get; init; }

        [JsonPropertyName("primary")]
        public bool Primary { get; init; }

        [JsonPropertyName("accessRole")]
        public string? AccessRole { get; init; }

        [JsonPropertyName("timeZone")]
        public string? TimeZone { get; init; }
    }

    private sealed class CalendarEventsPayload
    {
        [JsonPropertyName("items")]
        public CalendarEventPayload[]? Items { get; init; }
    }

    private sealed class CalendarEventPayload
    {
        [JsonPropertyName("id")]
        public string? Id { get; init; }

        [JsonPropertyName("summary")]
        public string? Summary { get; init; }

        [JsonPropertyName("description")]
        public string? Description { get; init; }

        [JsonPropertyName("status")]
        public string? Status { get; init; }

        [JsonPropertyName("start")]
        public CalendarEventDatePayload? Start { get; init; }

        [JsonPropertyName("end")]
        public CalendarEventDatePayload? End { get; init; }

        [JsonPropertyName("recurrence")]
        public string[]? Recurrence { get; init; }

        [JsonPropertyName("recurringEventId")]
        public string? RecurringEventId { get; init; }
    }

    private sealed class CalendarEventMutationPayload
    {
        [JsonPropertyName("id")]
        public string? Id { get; init; }

        [JsonPropertyName("summary")]
        public string? Summary { get; init; }

        [JsonPropertyName("description")]
        public string? Description { get; init; }

        [JsonPropertyName("start")]
        public CalendarEventMutationDatePayload? Start { get; init; }

        [JsonPropertyName("end")]
        public CalendarEventMutationDatePayload? End { get; init; }

        [JsonPropertyName("recurrence")]
        public IReadOnlyList<string>? Recurrence { get; init; }

        [JsonPropertyName("extendedProperties")]
        public CalendarEventExtendedPropertiesPayload? ExtendedProperties { get; init; }
    }

    private sealed class CalendarEventMutationDatePayload
    {
        [JsonPropertyName("date")]
        public string? Date { get; init; }

        [JsonPropertyName("dateTime")]
        public string? DateTime { get; init; }

        [JsonPropertyName("timeZone")]
        public string? TimeZone { get; init; }
    }

    private sealed class CalendarEventExtendedPropertiesPayload
    {
        [JsonPropertyName("private")]
        public Dictionary<string, string>? Private { get; init; }
    }

    private sealed class CalendarEventDatePayload
    {
        [JsonPropertyName("date")]
        public string? Date { get; init; }

        [JsonPropertyName("dateTime")]
        public string? DateTime { get; init; }

        [JsonPropertyName("timeZone")]
        public string? TimeZone { get; init; }
    }
}
