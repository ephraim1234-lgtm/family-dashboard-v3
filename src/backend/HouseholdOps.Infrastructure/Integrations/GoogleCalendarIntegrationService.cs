using System.Globalization;
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
    private const string LocalEventIdExtendedPropertyName = "householdopsScheduledEventId";
    private const string WritableCalendarScope = "https://www.googleapis.com/auth/calendar";
    private const string WritableCalendarEventsScope = "https://www.googleapis.com/auth/calendar.events";
    private readonly GoogleCalendarIcsParser parser = new();

    public async Task<GoogleCalendarLinkListResponse> ListAsync(
        Guid householdId,
        CancellationToken cancellationToken)
    {
        var links = await dbContext.GoogleCalendarConnections
            .Where(link => link.HouseholdId == householdId)
            .OrderByDescending(link => link.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var accountEmails = await LoadGoogleAccountEmailsAsync(links, cancellationToken);
        var outboundCounts = await LoadOutboundCountsAsync(
            links.Select(link => link.Id).ToArray(),
            cancellationToken);

        var items = links
            .Select(link =>
            {
                outboundCounts.TryGetValue(link.Id, out var counts);

                return MapSummary(
                    link,
                    accountEmails.TryGetValue(link.GoogleOAuthAccountLinkId ?? Guid.Empty, out var accountEmail)
                        ? accountEmail
                        : null,
                    counts ?? OutboundSyncCounts.None);
            })
            .ToList();

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
                    && link.LinkMode == GoogleCalendarConnection.LinkModeIcsFeed
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
            LinkMode = GoogleCalendarConnection.LinkModeIcsFeed,
            FeedUrl = normalizedFeedUrl,
            OutboundSyncEnabled = false,
            CreatedAtUtc = createdAtUtc,
            AutoSyncEnabled = true,
            SyncIntervalMinutes = DefaultSyncIntervalMinutes,
            NextSyncDueAtUtc = createdAtUtc
        };

        dbContext.GoogleCalendarConnections.Add(link);
        await dbContext.SaveChangesAsync(cancellationToken);

        return GoogleCalendarLinkMutationResult.Success(
            MapSummary(link, null, OutboundSyncCounts.None));
    }

    public async Task<GoogleCalendarLinkMutationResult> CreateManagedLinkAsync(
        Guid householdId,
        CreateManagedGoogleCalendarLinkRequest request,
        DateTimeOffset createdAtUtc,
        CancellationToken cancellationToken)
    {
        var displayName = request.DisplayName?.Trim();
        var calendarId = request.CalendarId?.Trim();

        if (request.AccountLinkId == Guid.Empty)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "A linked Google account is required.");
        }

        if (string.IsNullOrWhiteSpace(displayName) || string.IsNullOrWhiteSpace(calendarId))
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "A discovered Google calendar is required.");
        }

        var accountLink = await dbContext.GoogleOAuthAccountLinks
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.Id == request.AccountLinkId,
                cancellationToken);

        if (accountLink is null)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "The linked Google account was not found.");
        }

        var duplicate = await dbContext.GoogleCalendarConnections
            .AnyAsync(
                link => link.HouseholdId == householdId
                    && link.GoogleOAuthAccountLinkId == request.AccountLinkId
                    && link.GoogleCalendarId == calendarId,
                cancellationToken);

        if (duplicate)
        {
            return GoogleCalendarLinkMutationResult.Duplicate(
                "This discovered Google calendar is already linked for the current household.");
        }

        var link = new GoogleCalendarConnection
        {
            HouseholdId = householdId,
            DisplayName = displayName,
            LinkMode = GoogleCalendarConnection.LinkModeOAuthCalendar,
            FeedUrl = null,
            GoogleOAuthAccountLinkId = request.AccountLinkId,
            GoogleCalendarId = calendarId,
            GoogleCalendarTimeZone = request.CalendarTimeZone?.Trim(),
            OutboundSyncEnabled = false,
            CreatedAtUtc = createdAtUtc,
            AutoSyncEnabled = true,
            SyncIntervalMinutes = DefaultSyncIntervalMinutes,
            NextSyncDueAtUtc = createdAtUtc
        };

        dbContext.GoogleCalendarConnections.Add(link);
        await dbContext.SaveChangesAsync(cancellationToken);

        return GoogleCalendarLinkMutationResult.Success(
            MapSummary(link, accountLink.Email, OutboundSyncCounts.None));
    }

    public async Task<GoogleCalendarLinkMutationResult> DeleteAsync(
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
            return GoogleCalendarLinkMutationResult.NotFound();
        }

        var mirroredEventCount = await dbContext.GoogleCalendarLocalEventSyncs
            .CountAsync(item => item.GoogleCalendarConnectionId == linkId, cancellationToken);

        if (mirroredEventCount > 0)
        {
            return GoogleCalendarLinkMutationResult.Conflict(
                "This Google calendar still owns mirrored local-event sync records. Disable or move outbound mirroring in a later cleanup slice before removing the link.");
        }

        await importedEventSyncService.DeleteSourceAsync(
            householdId,
            EventSourceKinds.GoogleCalendarIcs,
            link.Id,
            cancellationToken);

        dbContext.GoogleCalendarConnections.Remove(link);
        await dbContext.SaveChangesAsync(cancellationToken);
        return GoogleCalendarLinkMutationResult.Success(
            MapSummary(
                link,
                await ResolveGoogleAccountEmailAsync(link, cancellationToken),
                OutboundSyncCounts.None));
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
            return GoogleCalendarLinkMutationResult.NotFound();
        }

        if (request.SyncIntervalMinutes is < 5 or > 1440)
        {
            return GoogleCalendarLinkMutationResult.ValidationFailure(
                "Sync interval must be between 5 and 1440 minutes.");
        }

        if (request.OutboundSyncEnabled)
        {
            if (!string.Equals(link.LinkMode, GoogleCalendarConnection.LinkModeOAuthCalendar, StringComparison.Ordinal))
            {
                return GoogleCalendarLinkMutationResult.ValidationFailure(
                    "Only managed Google calendar links can receive mirrored local events.");
            }

            if (!link.GoogleOAuthAccountLinkId.HasValue || string.IsNullOrWhiteSpace(link.GoogleCalendarId))
            {
                return GoogleCalendarLinkMutationResult.ValidationFailure(
                    "This managed Google calendar link is missing required provider details.");
            }

            var accountLink = await dbContext.GoogleOAuthAccountLinks
                .SingleOrDefaultAsync(
                    item => item.Id == link.GoogleOAuthAccountLinkId.Value,
                    cancellationToken);

            if (accountLink is null)
            {
                return GoogleCalendarLinkMutationResult.ValidationFailure(
                    "The linked Google account for this managed calendar could not be found.");
            }

            if (!HasWritableGoogleScope(accountLink.Scope))
            {
                return GoogleCalendarLinkMutationResult.ValidationFailure(
                    "Reconnect the linked Google account with calendar write access before enabling outbound sync.");
            }

            var otherOutboundTargets = await dbContext.GoogleCalendarConnections
                .Where(item =>
                    item.HouseholdId == householdId
                    && item.Id != linkId
                    && item.OutboundSyncEnabled)
                .ToListAsync(cancellationToken);

            foreach (var otherTarget in otherOutboundTargets)
            {
                otherTarget.OutboundSyncEnabled = false;
            }
        }

        link.OutboundSyncEnabled = request.OutboundSyncEnabled;
        link.AutoSyncEnabled = request.AutoSyncEnabled;
        link.SyncIntervalMinutes = request.SyncIntervalMinutes;
        link.NextSyncDueAtUtc = request.AutoSyncEnabled
            ? requestedAtUtc
            : null;

        await dbContext.SaveChangesAsync(cancellationToken);
        return GoogleCalendarLinkMutationResult.Success(
            MapSummary(
                link,
                await ResolveGoogleAccountEmailAsync(link, cancellationToken),
                await LoadOutboundCountsForLinkAsync(link.Id, cancellationToken)));
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

    public async Task QueueLocalEventUpsertAsync(
        Guid householdId,
        Guid scheduledEventId,
        DateTimeOffset queuedAtUtc,
        CancellationToken cancellationToken)
    {
        var existingSync = await dbContext.GoogleCalendarLocalEventSyncs
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.ScheduledEventId == scheduledEventId,
                cancellationToken);

        if (existingSync is null)
        {
            var outboundTarget = await dbContext.GoogleCalendarConnections
                .Where(link =>
                    link.HouseholdId == householdId
                    && link.OutboundSyncEnabled
                    && link.LinkMode == GoogleCalendarConnection.LinkModeOAuthCalendar)
                .OrderBy(link => link.CreatedAtUtc)
                .SingleOrDefaultAsync(cancellationToken);

            if (outboundTarget is null)
            {
                return;
            }

            dbContext.GoogleCalendarLocalEventSyncs.Add(new GoogleCalendarLocalEventSync
            {
                HouseholdId = householdId,
                ScheduledEventId = scheduledEventId,
                GoogleCalendarConnectionId = outboundTarget.Id,
                RemoteEventId = BuildRemoteEventId(scheduledEventId),
                SyncStatus = GoogleCalendarSyncStatuses.Pending,
                PendingOperation = GoogleCalendarSyncOperations.Upsert,
                LastQueuedAtUtc = queuedAtUtc,
                NextAttemptAtUtc = queuedAtUtc,
                LastError = null
            });

            return;
        }

        existingSync.PendingOperation = GoogleCalendarSyncOperations.Upsert;
        existingSync.SyncStatus = GoogleCalendarSyncStatuses.Pending;
        existingSync.LastQueuedAtUtc = queuedAtUtc;
        existingSync.NextAttemptAtUtc = queuedAtUtc;
        existingSync.LastError = null;
        existingSync.MarkedDeletedAtUtc = null;
        if (string.IsNullOrWhiteSpace(existingSync.RemoteEventId))
        {
            existingSync.RemoteEventId = BuildRemoteEventId(scheduledEventId);
        }
    }

    public async Task QueueLocalEventDeletionAsync(
        Guid householdId,
        Guid scheduledEventId,
        DateTimeOffset queuedAtUtc,
        CancellationToken cancellationToken)
    {
        var existingSync = await dbContext.GoogleCalendarLocalEventSyncs
            .SingleOrDefaultAsync(
                item => item.HouseholdId == householdId && item.ScheduledEventId == scheduledEventId,
                cancellationToken);

        if (existingSync is null)
        {
            return;
        }

        existingSync.PendingOperation = GoogleCalendarSyncOperations.Delete;
        existingSync.SyncStatus = GoogleCalendarSyncStatuses.Pending;
        existingSync.LastQueuedAtUtc = queuedAtUtc;
        existingSync.NextAttemptAtUtc = queuedAtUtc;
        existingSync.LastError = null;
        existingSync.MarkedDeletedAtUtc = queuedAtUtc;
    }

    public async Task<GoogleCalendarLocalEventSyncRunResult> SyncDueLocalEventsAsync(
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        var dueSyncs = await dbContext.GoogleCalendarLocalEventSyncs
            .Where(sync =>
                sync.PendingOperation != GoogleCalendarSyncOperations.None
                && sync.NextAttemptAtUtc.HasValue
                && sync.NextAttemptAtUtc <= requestedAtUtc)
            .OrderBy(sync => sync.NextAttemptAtUtc)
            .ToListAsync(cancellationToken);

        var succeededCount = 0;
        var failedCount = 0;

        foreach (var sync in dueSyncs)
        {
            if (await SyncLocalEventAsync(sync, requestedAtUtc, cancellationToken))
            {
                succeededCount++;
            }
            else
            {
                failedCount++;
            }
        }

        return new GoogleCalendarLocalEventSyncRunResult(
            dueSyncs.Count,
            succeededCount,
            failedCount);
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
            var parsed = await ParseLinkEventsAsync(link, cancellationToken);
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
            link.SkippedRecurringOverrideCount = parsed.SkippedRecurringOverrideCount;
            link.NextSyncDueAtUtc = link.AutoSyncEnabled
                ? requestedAtUtc.AddMinutes(link.SyncIntervalMinutes)
                : null;
            await dbContext.SaveChangesAsync(cancellationToken);

            return GoogleCalendarSyncResult.Success(
                MapSummary(
                    link,
                    await ResolveGoogleAccountEmailAsync(link, cancellationToken),
                    await LoadOutboundCountsForLinkAsync(link.Id, cancellationToken)));
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
                MapSummary(
                    link,
                    await ResolveGoogleAccountEmailAsync(link, cancellationToken),
                    await LoadOutboundCountsForLinkAsync(link.Id, cancellationToken)));
        }
    }

    private async Task<bool> SyncLocalEventAsync(
        GoogleCalendarLocalEventSync sync,
        DateTimeOffset requestedAtUtc,
        CancellationToken cancellationToken)
    {
        sync.LastAttemptedAtUtc = requestedAtUtc;
        sync.AttemptCount += 1;
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            var link = await dbContext.GoogleCalendarConnections
                .SingleOrDefaultAsync(item => item.Id == sync.GoogleCalendarConnectionId, cancellationToken);

            if (link is null)
            {
                throw new InvalidOperationException(
                    "The managed Google calendar link for this local event sync could not be found.");
            }

            if (!string.Equals(link.LinkMode, GoogleCalendarConnection.LinkModeOAuthCalendar, StringComparison.Ordinal)
                || !link.GoogleOAuthAccountLinkId.HasValue
                || string.IsNullOrWhiteSpace(link.GoogleCalendarId))
            {
                throw new InvalidOperationException(
                    "This managed Google calendar link is missing required provider details.");
            }

            var accountLink = await dbContext.GoogleOAuthAccountLinks
                .SingleOrDefaultAsync(item => item.Id == link.GoogleOAuthAccountLinkId.Value, cancellationToken);

            if (accountLink is null)
            {
                throw new InvalidOperationException(
                    "The linked Google account for this managed calendar could not be found.");
            }

            if (!HasWritableGoogleScope(accountLink.Scope))
            {
                throw new InvalidOperationException(
                    "Reconnect the linked Google account with calendar write access before outbound sync can continue.");
            }

            var accessToken = await EnsureActiveAccessTokenAsync(accountLink, cancellationToken);

            if (string.Equals(sync.PendingOperation, GoogleCalendarSyncOperations.Delete, StringComparison.Ordinal))
            {
                await DeleteRemoteEventAsync(
                    accessToken,
                    link.GoogleCalendarId,
                    sync.RemoteEventId,
                    cancellationToken);

                dbContext.GoogleCalendarLocalEventSyncs.Remove(sync);
                await dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }

            var scheduledEvent = await dbContext.ScheduledEvents
                .SingleOrDefaultAsync(
                    item => item.HouseholdId == sync.HouseholdId && item.Id == sync.ScheduledEventId,
                    cancellationToken);

            if (scheduledEvent is null)
            {
                if (sync.LastSucceededAtUtc.HasValue)
                {
                    sync.PendingOperation = GoogleCalendarSyncOperations.Delete;
                    sync.SyncStatus = GoogleCalendarSyncStatuses.Pending;
                    sync.MarkedDeletedAtUtc ??= requestedAtUtc;
                    sync.NextAttemptAtUtc = requestedAtUtc;
                    sync.LastError = null;
                    await dbContext.SaveChangesAsync(cancellationToken);
                    return true;
                }

                dbContext.GoogleCalendarLocalEventSyncs.Remove(sync);
                await dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }

            if (!string.IsNullOrWhiteSpace(scheduledEvent.SourceKind))
            {
                dbContext.GoogleCalendarLocalEventSyncs.Remove(sync);
                await dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }

            var householdTimeZoneId = await dbContext.Households
                .Where(item => item.Id == sync.HouseholdId)
                .Select(item => item.TimeZoneId)
                .SingleAsync(cancellationToken);

            var request = BuildOutboundEventRequest(
                scheduledEvent,
                householdTimeZoneId,
                sync.RemoteEventId);

            await UpsertRemoteEventAsync(
                accessToken,
                link.GoogleCalendarId,
                sync,
                request,
                cancellationToken);

            sync.SyncStatus = GoogleCalendarSyncStatuses.Succeeded;
            sync.PendingOperation = GoogleCalendarSyncOperations.None;
            sync.NextAttemptAtUtc = null;
            sync.LastSucceededAtUtc = requestedAtUtc;
            sync.LastError = null;
            sync.MarkedDeletedAtUtc = null;
            await dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception exception)
        {
            sync.SyncStatus = GoogleCalendarSyncStatuses.Failed;
            sync.LastError = exception.Message;
            sync.NextAttemptAtUtc = requestedAtUtc.AddMinutes(CalculateRetryDelayMinutes(sync.AttemptCount));
            await dbContext.SaveChangesAsync(cancellationToken);
            return false;
        }
    }

    private async Task UpsertRemoteEventAsync(
        string accessToken,
        string calendarId,
        GoogleCalendarLocalEventSync sync,
        GoogleOAuthCalendarEventUpsertRequest request,
        CancellationToken cancellationToken)
    {
        if (sync.LastSucceededAtUtc.HasValue)
        {
            try
            {
                var updated = await googleOAuthClient.UpdateCalendarEventAsync(
                    accessToken,
                    calendarId,
                    sync.RemoteEventId,
                    request,
                    cancellationToken);

                sync.RemoteEventId = updated.Id;
                return;
            }
            catch (GoogleOAuthClientException exception) when (exception.StatusCode == 404)
            {
                // The remote copy was removed outside the app. Recreate it with the canonical id.
            }
        }

        try
        {
            var created = await googleOAuthClient.CreateCalendarEventAsync(
                accessToken,
                calendarId,
                request,
                cancellationToken);

            sync.RemoteEventId = created.Id;
        }
        catch (GoogleOAuthClientException exception) when (exception.StatusCode == 409)
        {
            var updated = await googleOAuthClient.UpdateCalendarEventAsync(
                accessToken,
                calendarId,
                sync.RemoteEventId,
                request,
                cancellationToken);

            sync.RemoteEventId = updated.Id;
        }
    }

    private async Task DeleteRemoteEventAsync(
        string accessToken,
        string calendarId,
        string remoteEventId,
        CancellationToken cancellationToken)
    {
        try
        {
            await googleOAuthClient.DeleteCalendarEventAsync(
                accessToken,
                calendarId,
                remoteEventId,
                cancellationToken);
        }
        catch (GoogleOAuthClientException exception) when (exception.StatusCode == 404)
        {
            // Already gone remotely; treat it as a successful cleanup.
        }
    }

    private async Task<GoogleCalendarParseResult> ParseLinkEventsAsync(
        GoogleCalendarConnection link,
        CancellationToken cancellationToken)
    {
        if (string.Equals(link.LinkMode, GoogleCalendarConnection.LinkModeOAuthCalendar, StringComparison.Ordinal))
        {
            if (!link.GoogleOAuthAccountLinkId.HasValue || string.IsNullOrWhiteSpace(link.GoogleCalendarId))
            {
                return GoogleCalendarParseResult.InvalidFeed(
                    "This linked Google calendar is missing its OAuth calendar configuration.");
            }

            var accountLink = await dbContext.GoogleOAuthAccountLinks
                .SingleOrDefaultAsync(
                    item => item.HouseholdId == link.HouseholdId && item.Id == link.GoogleOAuthAccountLinkId.Value,
                    cancellationToken);

            if (accountLink is null)
            {
                return GoogleCalendarParseResult.InvalidFeed(
                    "The linked Google account for this managed calendar could not be found.");
            }

            var accessToken = await EnsureActiveAccessTokenAsync(accountLink, cancellationToken);
            var events = await googleOAuthClient.GetCalendarEventsAsync(
                accessToken,
                link.GoogleCalendarId,
                cancellationToken);

            return GoogleCalendarApiEventMapper.Parse(events, link.GoogleCalendarTimeZone);
        }

        if (string.IsNullOrWhiteSpace(link.FeedUrl))
        {
            return GoogleCalendarParseResult.InvalidFeed(
                "This linked Google calendar is missing its iCal feed URL.");
        }

        var feed = await feedFetcher.FetchAsync(link.FeedUrl, cancellationToken);
        return parser.Parse(feed);
    }

    private static GoogleOAuthCalendarEventUpsertRequest BuildOutboundEventRequest(
        ScheduledEvent scheduledEvent,
        string householdTimeZoneId,
        string remoteEventId)
    {
        if (!scheduledEvent.StartsAtUtc.HasValue)
        {
            throw new InvalidOperationException("Google outbound sync requires a scheduled event start time.");
        }

        if (!scheduledEvent.IsAllDay && !scheduledEvent.EndsAtUtc.HasValue)
        {
            throw new InvalidOperationException(
                "Google outbound sync currently requires an end time for timed local events.");
        }

        var recurrence = BuildRecurrenceRules(scheduledEvent);
        var privateProperties = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [LocalEventIdExtendedPropertyName] = scheduledEvent.Id.ToString("D")
        };

        return new GoogleOAuthCalendarEventUpsertRequest(
            remoteEventId,
            scheduledEvent.Title,
            scheduledEvent.Description,
            scheduledEvent.IsAllDay,
            scheduledEvent.StartsAtUtc.Value,
            scheduledEvent.EndsAtUtc,
            householdTimeZoneId,
            recurrence,
            privateProperties);
    }

    private static IReadOnlyList<string> BuildRecurrenceRules(ScheduledEvent scheduledEvent)
    {
        if (scheduledEvent.RecurrencePattern == EventRecurrencePattern.None)
        {
            return [];
        }

        var rule = scheduledEvent.RecurrencePattern switch
        {
            EventRecurrencePattern.Daily => "RRULE:FREQ=DAILY",
            EventRecurrencePattern.Weekly => BuildWeeklyRecurrenceRule(scheduledEvent),
            _ => throw new InvalidOperationException("Unsupported local recurrence pattern for Google outbound sync.")
        };

        if (scheduledEvent.RecursUntilUtc.HasValue)
        {
            rule += $";UNTIL={scheduledEvent.RecursUntilUtc.Value.UtcDateTime.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture)}";
        }

        return [rule];
    }

    private static string BuildWeeklyRecurrenceRule(ScheduledEvent scheduledEvent)
    {
        var days = RecurrenceRequestMapper.ToWeekdayNames(scheduledEvent.WeeklyDaysMask)
            .Select(day => day switch
            {
                "Monday" => "MO",
                "Tuesday" => "TU",
                "Wednesday" => "WE",
                "Thursday" => "TH",
                "Friday" => "FR",
                "Saturday" => "SA",
                "Sunday" => "SU",
                _ => throw new InvalidOperationException("Unsupported weekly day in Google recurrence export.")
            })
            .ToArray();

        if (days.Length == 0)
        {
            throw new InvalidOperationException(
                "Google outbound sync requires at least one weekday for weekly recurring local events.");
        }

        return $"RRULE:FREQ=WEEKLY;BYDAY={string.Join(",", days)}";
    }

    private static int CalculateRetryDelayMinutes(int attemptCount)
    {
        var boundedAttempt = Math.Min(Math.Max(attemptCount, 1), 6);
        return boundedAttempt switch
        {
            1 => 1,
            2 => 2,
            3 => 4,
            4 => 8,
            5 => 16,
            _ => 30
        };
    }

    private static string BuildRemoteEventId(Guid scheduledEventId) =>
        $"hhops{scheduledEventId:N}".ToLowerInvariant();

    private static bool HasWritableGoogleScope(string scope)
    {
        if (string.IsNullOrWhiteSpace(scope))
        {
            return false;
        }

        var scopes = scope.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return scopes.Contains(WritableCalendarScope, StringComparer.Ordinal)
            || scopes.Contains(WritableCalendarEventsScope, StringComparer.Ordinal);
    }

    private async Task<Dictionary<Guid, string>> LoadGoogleAccountEmailsAsync(
        IReadOnlyCollection<GoogleCalendarConnection> links,
        CancellationToken cancellationToken)
    {
        var accountIds = links
            .Where(link => link.GoogleOAuthAccountLinkId.HasValue)
            .Select(link => link.GoogleOAuthAccountLinkId!.Value)
            .Distinct()
            .ToList();

        if (accountIds.Count == 0)
        {
            return [];
        }

        return await dbContext.GoogleOAuthAccountLinks
            .Where(link => accountIds.Contains(link.Id))
            .ToDictionaryAsync(link => link.Id, link => link.Email, cancellationToken);
    }

    private async Task<Dictionary<Guid, OutboundSyncCounts>> LoadOutboundCountsAsync(
        IReadOnlyCollection<Guid> linkIds,
        CancellationToken cancellationToken)
    {
        if (linkIds.Count == 0)
        {
            return [];
        }

        var counts = await dbContext.GoogleCalendarLocalEventSyncs
            .Where(item => linkIds.Contains(item.GoogleCalendarConnectionId))
            .GroupBy(item => item.GoogleCalendarConnectionId)
            .Select(group => new
            {
                LinkId = group.Key,
                MirroredCount = group.Count(),
                PendingCount = group.Count(item => item.PendingOperation != GoogleCalendarSyncOperations.None),
                FailedCount = group.Count(item => item.SyncStatus == GoogleCalendarSyncStatuses.Failed)
            })
            .ToListAsync(cancellationToken);

        return counts.ToDictionary(
            item => item.LinkId,
            item => new OutboundSyncCounts(
                item.MirroredCount,
                item.PendingCount,
                item.FailedCount));
    }

    private async Task<OutboundSyncCounts> LoadOutboundCountsForLinkAsync(
        Guid linkId,
        CancellationToken cancellationToken)
    {
        var counts = await dbContext.GoogleCalendarLocalEventSyncs
            .Where(item => item.GoogleCalendarConnectionId == linkId)
            .GroupBy(item => item.GoogleCalendarConnectionId)
            .Select(group => new OutboundSyncCounts(
                group.Count(),
                group.Count(item => item.PendingOperation != GoogleCalendarSyncOperations.None),
                group.Count(item => item.SyncStatus == GoogleCalendarSyncStatuses.Failed)))
            .SingleOrDefaultAsync(cancellationToken);

        return counts ?? OutboundSyncCounts.None;
    }

    private async Task<string?> ResolveGoogleAccountEmailAsync(
        GoogleCalendarConnection link,
        CancellationToken cancellationToken)
    {
        if (!link.GoogleOAuthAccountLinkId.HasValue)
        {
            return null;
        }

        return await dbContext.GoogleOAuthAccountLinks
            .Where(item => item.Id == link.GoogleOAuthAccountLinkId.Value)
            .Select(item => item.Email)
            .SingleOrDefaultAsync(cancellationToken);
    }

    private static GoogleCalendarLinkSummaryResponse MapSummary(
        GoogleCalendarConnection link,
        string? googleOAuthAccountEmail,
        OutboundSyncCounts outboundCounts)
    {
        var feedUrlHost = "Managed Google calendar";
        var feedUrlPathHint = link.GoogleCalendarId ?? "Unavailable";

        if (string.Equals(link.LinkMode, GoogleCalendarConnection.LinkModeIcsFeed, StringComparison.Ordinal)
            && !string.IsNullOrWhiteSpace(link.FeedUrl))
        {
            var uri = new Uri(link.FeedUrl, UriKind.Absolute);
            feedUrlHost = uri.Host;
            feedUrlPathHint = uri.AbsolutePath.Length <= 24
                ? uri.AbsolutePath
                : $"...{uri.AbsolutePath[^24..]}";
        }

        var failureDetails = ResolveFailureDetails(link);

        return new GoogleCalendarLinkSummaryResponse(
            link.Id,
            link.DisplayName,
            link.LinkMode,
            feedUrlHost,
            feedUrlPathHint,
            link.GoogleOAuthAccountLinkId,
            googleOAuthAccountEmail,
            link.GoogleCalendarId,
            link.GoogleCalendarTimeZone,
            link.OutboundSyncEnabled,
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
            link.SkippedRecurringOverrideCount,
            outboundCounts.MirroredLocalEventCount,
            outboundCounts.PendingLocalEventSyncCount,
            outboundCounts.FailedLocalEventSyncCount,
            link.CreatedAtUtc);
    }

    private static SyncFailureDetails ResolveFailureDetails(
        GoogleCalendarConnection link)
    {
        var lastSyncStatus = link.LastSyncStatus;
        var lastSyncError = link.LastSyncError;

        if (!string.Equals(lastSyncStatus, GoogleCalendarSyncStatuses.Failed, StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(lastSyncError))
        {
            return SyncFailureDetails.None;
        }

        var isManagedOAuthLink = string.Equals(
            link.LinkMode,
            GoogleCalendarConnection.LinkModeOAuthCalendar,
            StringComparison.Ordinal);

        if (isManagedOAuthLink)
        {
            if (lastSyncError.Contains("missing its OAuth calendar configuration", StringComparison.OrdinalIgnoreCase))
            {
                return new SyncFailureDetails(
                    "managed_link_invalid",
                    "This managed Google calendar link is missing required provider details. Remove it and relink the calendar from Google discovery.");
            }

            if (lastSyncError.Contains("linked Google account for this managed calendar could not be found", StringComparison.OrdinalIgnoreCase))
            {
                return new SyncFailureDetails(
                    "linked_account_missing",
                    "The Google account behind this managed link is no longer available for the household. Relink the Google account, then recreate or reconnect this managed calendar link.");
            }

            if (lastSyncError.Contains("event lookup failed with 404", StringComparison.OrdinalIgnoreCase)
                || lastSyncError.Contains("calendar list lookup failed with 404", StringComparison.OrdinalIgnoreCase))
            {
                return new SyncFailureDetails(
                    "calendar_missing",
                    "Google could not find this calendar anymore. Confirm the calendar still exists for the linked Google account, then rediscover and relink it if needed.");
            }

            if (lastSyncError.Contains("invalid_grant", StringComparison.OrdinalIgnoreCase)
                || lastSyncError.Contains("token refresh failed", StringComparison.OrdinalIgnoreCase)
                || lastSyncError.Contains("OAuth token", StringComparison.OrdinalIgnoreCase))
            {
                return new SyncFailureDetails(
                    "oauth_reauth_required",
                    "Google rejected the saved OAuth token state. Reconnect the linked Google account from Admin, then retry this managed calendar sync.");
            }
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
                isManagedOAuthLink ? "oauth_access" : "access",
                isManagedOAuthLink
                    ? "Google rejected access to this managed calendar. Confirm the linked Google account still has calendar access, then reconnect the account if the problem persists."
                    : "Google rejected access to this feed. Re-copy the private iCal URL or confirm the calendar is still shared appropriately.");
        }

        return new SyncFailureDetails(
            "unknown",
            isManagedOAuthLink
                ? "Retry the sync once. If the failure repeats, inspect the saved error text and verify the linked Google account and managed calendar still exist."
                : "Retry the sync once. If the failure repeats, inspect the saved error text and verify the linked feed still exists and is reachable.");
    }
}

internal sealed record SyncFailureDetails(
    string? Category,
    string? RecoveryHint)
{
    public static SyncFailureDetails None { get; } = new(null, null);
}

internal sealed record OutboundSyncCounts(
    int MirroredLocalEventCount,
    int PendingLocalEventSyncCount,
    int FailedLocalEventSyncCount)
{
    public static OutboundSyncCounts None { get; } = new(0, 0, 0);
}
