using HouseholdOps.Infrastructure.Persistence;
using HouseholdOps.Modules.Integrations;
using HouseholdOps.Modules.Integrations.Contracts;
using HouseholdOps.Modules.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace HouseholdOps.Infrastructure.Integrations;

public sealed class GoogleCalendarIntegrationService(
    HouseholdOpsDbContext dbContext,
    IConfiguration configuration,
    IGoogleOAuthClient googleOAuthClient,
    IGoogleCalendarFeedFetcher feedFetcher,
    IImportedScheduledEventSyncService importedEventSyncService) : IGoogleCalendarIntegrationService
{
    private const int DefaultSyncIntervalMinutes = 30;
    private readonly GoogleCalendarIcsParser parser = new();

    public async Task<GoogleCalendarLinkListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.GoogleCalendarConnections
            .Where(link => link.HouseholdId == householdId)
            .OrderByDescending(link => link.CreatedAtUtc)
            .Select(link => MapSummary(link))
            .ToListAsync(cancellationToken);

        return new GoogleCalendarLinkListResponse(items);
    }

    public GoogleOAuthReadinessResponse GetOAuthReadiness()
    {
        var clientId = configuration["GOOGLE_CLIENT_ID"];
        var clientSecret = configuration["GOOGLE_CLIENT_SECRET"];
        var redirectUri = configuration["GOOGLE_OAUTH_REDIRECT_URI"];

        var hasClientId = !string.IsNullOrWhiteSpace(clientId);
        var hasClientSecret = !string.IsNullOrWhiteSpace(clientSecret);
        var hasRedirectUri = !string.IsNullOrWhiteSpace(redirectUri);

        return new GoogleOAuthReadinessResponse(
            hasClientId,
            hasClientSecret,
            hasRedirectUri,
            hasClientId && hasClientSecret && hasRedirectUri,
            hasRedirectUri ? redirectUri : null);
    }

    public async Task<GoogleOAuthAccountLinkListResponse> ListOAuthAccountsAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var items = await dbContext.GoogleOAuthAccountLinks
            .Where(link => link.HouseholdId == householdId)
            .OrderByDescending(link => link.UpdatedAtUtc)
            .Select(link => new GoogleOAuthAccountLinkSummaryResponse(
                link.Id,
                link.Email,
                link.DisplayName,
                link.Scope,
                link.CreatedAtUtc,
                link.UpdatedAtUtc))
            .ToListAsync(cancellationToken);

        return new GoogleOAuthAccountLinkListResponse(items);
    }

    public async Task<GoogleOAuthCalendarListResponse> ListOAuthCalendarsAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var accountLinks = await dbContext.GoogleOAuthAccountLinks
            .Where(link => link.HouseholdId == householdId)
            .OrderBy(link => link.Email)
            .ToListAsync(cancellationToken);

        var calendars = new List<GoogleOAuthCalendarSummaryResponse>();

        foreach (var accountLink in accountLinks)
        {
            var accessToken = await EnsureActiveAccessTokenAsync(
                accountLink,
                cancellationToken);

            var discoveredCalendars = await googleOAuthClient.GetCalendarsAsync(
                accessToken,
                cancellationToken);

            calendars.AddRange(discoveredCalendars.Select(calendar => new GoogleOAuthCalendarSummaryResponse(
                accountLink.Id,
                accountLink.Email,
                calendar.Id,
                calendar.Summary,
                calendar.IsPrimary,
                calendar.AccessRole,
                calendar.TimeZone)));
        }

        return new GoogleOAuthCalendarListResponse(calendars);
    }

    public GoogleOAuthStartResponse BeginOAuthLink(string state) =>
        new(googleOAuthClient.BuildAuthorizationUrl(state));

    public async Task CompleteOAuthLinkAsync(
        Guid householdId,
        Guid linkedByUserId,
        string code,
        DateTimeOffset completedAtUtc,
        CancellationToken cancellationToken)
    {
        var token = await googleOAuthClient.ExchangeCodeAsync(code, cancellationToken);
        var profile = await googleOAuthClient.GetUserProfileAsync(
            token.AccessToken,
            cancellationToken);

        var existingLink = await dbContext.GoogleOAuthAccountLinks
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId
                    && item.GoogleUserId == profile.Subject,
                cancellationToken);

        if (existingLink is null)
        {
            dbContext.GoogleOAuthAccountLinks.Add(new GoogleOAuthAccountLink
            {
                HouseholdId = householdId,
                LinkedByUserId = linkedByUserId,
                GoogleUserId = profile.Subject,
                Email = profile.Email,
                DisplayName = profile.Name,
                AccessToken = token.AccessToken,
                RefreshToken = token.RefreshToken,
                TokenType = token.TokenType,
                Scope = token.Scope,
                AccessTokenExpiresAtUtc = completedAtUtc.AddSeconds(token.ExpiresInSeconds),
                CreatedAtUtc = completedAtUtc,
                UpdatedAtUtc = completedAtUtc
            });
        }
        else
        {
            existingLink.LinkedByUserId = linkedByUserId;
            existingLink.Email = profile.Email;
            existingLink.DisplayName = profile.Name;
            existingLink.AccessToken = token.AccessToken;
            existingLink.RefreshToken = string.IsNullOrWhiteSpace(token.RefreshToken)
                ? existingLink.RefreshToken
                : token.RefreshToken;
            existingLink.TokenType = token.TokenType;
            existingLink.Scope = token.Scope;
            existingLink.AccessTokenExpiresAtUtc = completedAtUtc.AddSeconds(token.ExpiresInSeconds);
            existingLink.UpdatedAtUtc = completedAtUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> EnsureActiveAccessTokenAsync(
        GoogleOAuthAccountLink accountLink,
        CancellationToken cancellationToken)
    {
        if (accountLink.AccessTokenExpiresAtUtc.HasValue
            && accountLink.AccessTokenExpiresAtUtc.Value > DateTimeOffset.UtcNow.AddMinutes(1))
        {
            return accountLink.AccessToken;
        }

        if (string.IsNullOrWhiteSpace(accountLink.RefreshToken))
        {
            return accountLink.AccessToken;
        }

        var refreshedToken = await googleOAuthClient.RefreshAccessTokenAsync(
            accountLink.RefreshToken,
            cancellationToken);

        accountLink.AccessToken = refreshedToken.AccessToken;
        accountLink.RefreshToken = string.IsNullOrWhiteSpace(refreshedToken.RefreshToken)
            ? accountLink.RefreshToken
            : refreshedToken.RefreshToken;
        accountLink.TokenType = refreshedToken.TokenType;
        accountLink.Scope = refreshedToken.Scope;
        accountLink.AccessTokenExpiresAtUtc = DateTimeOffset.UtcNow.AddSeconds(refreshedToken.ExpiresInSeconds);
        accountLink.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return accountLink.AccessToken;
    }

    public async Task<GoogleCalendarLinkMutationResult> CreateAsync(
        Guid householdId,
        CreateGoogleCalendarLinkRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "Display name is required.");
        }

        if (!Uri.TryCreate(request.FeedUrl, UriKind.Absolute, out var feedUri)
            || (feedUri.Scheme != Uri.UriSchemeHttps && feedUri.Scheme != Uri.UriSchemeHttp))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "A valid Google Calendar iCal feed URL is required.");
        }

        if (!string.Equals(feedUri.Host, "calendar.google.com", StringComparison.OrdinalIgnoreCase))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "This slice currently supports Google Calendar iCal feeds from calendar.google.com only.");
        }

        var normalizedFeedUrl = feedUri.GetLeftPart(UriPartial.Path);
        var existingLink = await dbContext.GoogleCalendarConnections
            .AnyAsync(
                link => link.HouseholdId == householdId
                    && link.FeedUrl == normalizedFeedUrl,
                cancellationToken);

        if (existingLink)
        {
            return GoogleCalendarLinkMutationResult.Duplicate(
                "This Google Calendar feed is already linked for the current household.");
        }

        var link = new GoogleCalendarConnection
        {
            HouseholdId = householdId,
            DisplayName = displayName,
            FeedUrl = normalizedFeedUrl,
            CreatedAtUtc = createdAtUtc,
            AutoSyncEnabled = true,
            SyncIntervalMinutes = DefaultSyncIntervalMinutes,
            NextSyncDueAtUtc = createdAtUtc
        };

        dbContext.GoogleCalendarConnections.Add(link);
        await dbContext.SaveChangesAsync(cancellationToken);

        return GoogleCalendarLinkMutationResult.Success(MapSummary(link));
    }

    public async Task<bool> DeleteAsync(
        Guid householdId,
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var link = await dbContext.GoogleCalendarConnections
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == linkId,
                cancellationToken);

        if (link is null)
        {
            return false;
        }

        await importedEventSyncService.DeleteSourceAsync(
            householdId,
            EventSourceKinds.GoogleCalendarIcs,
            link.Id,
            cancellationToken);

        dbContext.GoogleCalendarConnections.Remove(link);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<GoogleCalendarLinkMutationResult> UpdateSyncSettingsAsync(
        Guid householdId,
        Guid linkId,
        UpdateGoogleCalendarLinkSyncSettingsRequest request,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var link = await dbContext.GoogleCalendarConnections
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == linkId,
                cancellationToken);

        if (link is null)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "The linked Google Calendar was not found.");
        }

        if (request.SyncIntervalMinutes is < 5 or > 1440)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "Sync interval must be between 5 and 1440 minutes.");
        }

        link.AutoSyncEnabled = request.AutoSyncEnabled;
        link.SyncIntervalMinutes = request.SyncIntervalMinutes;
        link.NextSyncDueAtUtc = request.AutoSyncEnabled
            ? requestedAtUtc
            : null;

        await dbContext.SaveChangesAsync(cancellationToken);
        return GoogleCalendarLinkMutationResult.Success(MapSummary(link));
    }

    public async Task<GoogleCalendarSyncResult> SyncAsync(
        Guid householdId,
        Guid linkId,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var link = await dbContext.GoogleCalendarConnections
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == linkId,
                cancellationToken);

        if (link is null)
        {
            return GoogleCalendarSyncResult.NotFound();
        }

        return await SyncLinkAsync(link, requestedAtUtc, cancellationToken);
    }

    public async Task<GoogleCalendarAutoSyncRunResult> SyncDueLinksAsync(
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var dueLinks = await dbContext.GoogleCalendarConnections
            .Where(link =>
                link.AutoSyncEnabled
                && link.NextSyncDueAtUtc.HasValue
                && link.NextSyncDueAtUtc <= requestedAtUtc)
            .OrderBy(link => link.NextSyncDueAtUtc)
            .ToListAsync(cancellationToken);

        var succeededCount = 0;
        var failedCount = 0;

        foreach (var link in dueLinks)
        {
            var result = await SyncLinkAsync(link, requestedAtUtc, cancellationToken);
            if (result.Status == GoogleCalendarSyncResultStatus.Succeeded)
            {
                succeededCount++;
            }
            else
            {
                failedCount++;
            }
        }

        return new GoogleCalendarAutoSyncRunResult(
            dueLinks.Count,
            succeededCount,
            failedCount);
    }

    private async Task<GoogleCalendarSyncResult> SyncLinkAsync(
        GoogleCalendarConnection link,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        link.LastSyncStartedAtUtc = requestedAtUtc;
        link.LastSyncError = null;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var feed = await feedFetcher.FetchAsync(link.FeedUrl, cancellationToken);
            var parsed = parser.Parse(feed);
            if (!parsed.IsValidFeed)
            {
                throw new InvalidOperationException(parsed.Error);
            }

            var syncResult = await importedEventSyncService.SyncAsync(
                link.HouseholdId,
                EventSourceKinds.GoogleCalendarIcs,
                link.Id,
                parsed.Events,
                requestedAtUtc,
                cancellationToken);

            link.LastSyncStatus = GoogleCalendarSyncStatuses.Succeeded;
            link.LastSyncCompletedAtUtc = requestedAtUtc;
            link.ImportedEventCount = syncResult.ActiveCount;
            link.SkippedRecurringEventCount = parsed.SkippedRecurringEventCount;
            link.NextSyncDueAtUtc = link.AutoSyncEnabled
                ? requestedAtUtc.AddMinutes(link.SyncIntervalMinutes)
                : null;
            await dbContext.SaveChangesAsync(cancellationToken);

            return GoogleCalendarSyncResult.Success(MapSummary(link));
        }
        catch (Exception exception)
        {
            link.LastSyncStatus = GoogleCalendarSyncStatuses.Failed;
            link.LastSyncCompletedAtUtc = requestedAtUtc;
            link.LastSyncError = exception.Message;
            link.NextSyncDueAtUtc = link.AutoSyncEnabled
                ? requestedAtUtc.AddMinutes(link.SyncIntervalMinutes)
                : null;
            await dbContext.SaveChangesAsync(cancellationToken);

            return GoogleCalendarSyncResult.Failed(
                exception.Message,
                MapSummary(link));
        }
    }

    private static GoogleCalendarLinkSummaryResponse MapSummary(
        GoogleCalendarConnection link)
    {
        var uri = new Uri(link.FeedUrl, UriKind.Absolute);
        var pathHint = uri.AbsolutePath.Length <= 24
            ? uri.AbsolutePath
            : $"...{uri.AbsolutePath[^24..]}";
        var failureDetails = ResolveFailureDetails(link.LastSyncStatus, link.LastSyncError);

        return new GoogleCalendarLinkSummaryResponse(
            link.Id,
            link.DisplayName,
            uri.Host,
            pathHint,
            link.AutoSyncEnabled,
            link.SyncIntervalMinutes,
            link.NextSyncDueAtUtc,
            link.LastSyncStatus,
            link.LastSyncError,
            link.LastSyncStartedAtUtc,
            link.LastSyncCompletedAtUtc,
            failureDetails.Category,
            failureDetails.RecoveryHint,
            link.ImportedEventCount,
            link.SkippedRecurringEventCount,
            link.CreatedAtUtc);
    }

    private static SyncFailureDetails ResolveFailureDetails(
        string lastSyncStatus,
        string? lastSyncError)
    {
        if (!string.Equals(lastSyncStatus, GoogleCalendarSyncStatuses.Failed, StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(lastSyncError))
        {
            return SyncFailureDetails.None;
        }

        if (lastSyncError.Contains("none could be imported", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("did not contain a VCALENDAR payload", StringComparison.OrdinalIgnoreCase))
        {
            return new SyncFailureDetails(
                "invalid_feed",
                "Google returned feed content that could not be imported. Confirm the iCal URL is still valid and shared correctly, then retry.");
        }

        if (lastSyncError.Contains("timed out", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("temporarily", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("network", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("connection", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("name or service not known", StringComparison.OrdinalIgnoreCase))
        {
            return new SyncFailureDetails(
                "network",
                "The sync could not reach Google successfully. Retry now, and if it keeps failing, check outbound network access from the host.");
        }

        if (lastSyncError.Contains("401", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("403", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("forbidden", StringComparison.OrdinalIgnoreCase)
            || lastSyncError.Contains("unauthorized", StringComparison.OrdinalIgnoreCase))
        {
            return new SyncFailureDetails(
                "access",
                "Google rejected access to this feed. Re-copy the private iCal URL or confirm the calendar is still shared appropriately.");
        }

        return new SyncFailureDetails(
            "unknown",
            "Retry the sync once. If the failure repeats, inspect the saved error text and verify the linked feed still exists and is reachable.");
    }
}

internal sealed record SyncFailureDetails(
    string? Category,
    string? RecoveryHint)
{
    public static SyncFailureDetails None { get; } = new(null, null);
}
